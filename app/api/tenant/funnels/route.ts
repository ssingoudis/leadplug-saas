import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  editorStateToFunnelRow,
  editorQuestionsToDbRows,
  generateUniqueSlug,
} from "@/lib/editorUtils";
import type { EditorState } from "@/types";

// GET /api/tenant/funnels — Liste aller Funnels des eingeloggten Tenants
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("slug")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { data: funnels, error } = await admin
    .from("funnels")
    .select(
      "slug, funnel_name, funnel_title, is_active, primary_color, total_views, created_at",
    )
    .eq("tenant_slug", tenant.slug)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Submission-Count pro Funnel
  const slugs = (funnels ?? []).map((f) => f.slug);
  let countMap: Record<string, number> = {};
  if (slugs.length > 0) {
    const { data: counts } = await admin
      .from("submissions")
      .select("funnel_slug")
      .in("funnel_slug", slugs);
    for (const row of counts ?? []) {
      countMap[row.funnel_slug] = (countMap[row.funnel_slug] ?? 0) + 1;
    }
  }

  const result = (funnels ?? []).map((f) => ({
    slug: f.slug,
    funnelName: f.funnel_name || f.funnel_title || "Unbenannter Funnel",
    isActive: f.is_active ?? true,
    primaryColor: f.primary_color ?? "#22c55e",
    totalViews: f.total_views ?? 0,
    leadCount: countMap[f.slug] ?? 0,
  }));

  return NextResponse.json(result);
}

// POST /api/tenant/funnels — Neuen Funnel erstellen
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("slug")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { state }: { state: EditorState } = await req.json();

  if (!state?.funnelName) {
    return NextResponse.json({ error: "Funnel-Name fehlt" }, { status: 400 });
  }

  // Slug wird server-seitig aus dem Namen generiert und auf Eindeutigkeit geprüft
  const slug = await generateUniqueSlug(admin, state.funnelName, tenant.slug);

  const funnelRow = editorStateToFunnelRow(state, tenant.slug, slug);
  const { error: funnelErr } = await admin.from("funnels").insert(funnelRow);
  if (funnelErr) {
    return NextResponse.json({ error: funnelErr.message }, { status: 500 });
  }

  if (state.questions.length > 0) {
    const questionRows = editorQuestionsToDbRows(state.questions, slug);
    const { error: qErr } = await admin
      .from("funnel_questions")
      .insert(questionRows);
    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ slug });
}
