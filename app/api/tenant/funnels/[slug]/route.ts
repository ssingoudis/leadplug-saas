import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  editorStateToFunnelRow,
  editorQuestionsToDbRows,
  dbToEditorState,
} from "@/lib/editorUtils";
import type { EditorState } from "@/types";

async function getAuthenticatedTenant(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: tenant } = await admin
    .from("tenants")
    .select("slug, company_name, public_email, public_phone")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return tenant;
}

async function verifyOwnership(
  admin: ReturnType<typeof createAdminClient>,
  funnelSlug: string,
  tenantSlug: string,
): Promise<boolean> {
  const { data } = await admin
    .from("funnels")
    .select("tenant_slug")
    .eq("slug", funnelSlug)
    .maybeSingle();
  return data?.tenant_slug === tenantSlug;
}

// GET /api/tenant/funnels/[slug] — Funnel laden (für Editor)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const tenant = await getAuthenticatedTenant(admin, user.id);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const owned = await verifyOwnership(admin, slug, tenant.slug);
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: funnelRow, error: funnelErr } = await admin
    .from("funnels")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (funnelErr || !funnelRow) {
    return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });
  }

  const { data: questionRows } = await admin
    .from("funnel_questions")
    .select("*")
    .eq("funnel_slug", slug)
    .order("sort_order", { ascending: true });

  const state = dbToEditorState(funnelRow, questionRows ?? []);

  return NextResponse.json({
    state,
    companyName: tenant.company_name,
    publicEmail: tenant.public_email,
    publicPhone: tenant.public_phone ?? "",
  });
}

// PUT /api/tenant/funnels/[slug] — Funnel speichern
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: oldSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const tenant = await getAuthenticatedTenant(admin, user.id);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const owned = await verifyOwnership(admin, oldSlug, tenant.slug);
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { state }: { state: EditorState } = await req.json();

  // Slug bleibt immer der originale — Änderungen würden bestehende Embed-Codes brechen
  const funnelRow = editorStateToFunnelRow(state, tenant.slug, oldSlug);
  const { error: updateErr } = await admin
    .from("funnels")
    .update(funnelRow)
    .eq("slug", oldSlug);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Fragen: alte löschen, neue einfügen (atomarer als Upsert bei Reihenfolge-Änderungen)
  await admin.from("funnel_questions").delete().eq("funnel_slug", oldSlug);

  if (state.questions.length > 0) {
    const questionRows = editorQuestionsToDbRows(state.questions, oldSlug);
    const { error: qErr } = await admin
      .from("funnel_questions")
      .insert(questionRows);
    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ slug: oldSlug });
}

// DELETE /api/tenant/funnels/[slug] — Funnel unwiderruflich löschen (nur wenn inaktiv)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const tenant = await getAuthenticatedTenant(admin, user.id);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const owned = await verifyOwnership(admin, slug, tenant.slug);
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: funnel } = await admin
    .from("funnels")
    .select("is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!funnel) return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });
  if (funnel.is_active) {
    return NextResponse.json(
      { error: "Funnel muss zuerst deaktiviert sein" },
      { status: 400 },
    );
  }

  // Alles löschen: View-Logs → Submissions → Fragen → Funnel
  await admin.from("funnel_view_logs").delete().eq("funnel_slug", slug);
  await admin.from("submissions").delete().eq("funnel_slug", slug);
  await admin.from("funnel_questions").delete().eq("funnel_slug", slug);
  const { error } = await admin.from("funnels").delete().eq("slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
