import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  editorStateToFunnelRow,
  editorQuestionsToDbRows,
  dbToEditorState,
} from "@/lib/editorUtils";
import type { EditorState } from "@/types";

async function getCurrentTenant(supabase: SupabaseClient) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, company_name, public_email, public_phone")
    .maybeSingle();
  return tenant;
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

  const tenant = await getCurrentTenant(supabase);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // RLS sorgt dafür, dass nur eigene Funnels sichtbar sind.
  const { data: funnelRow, error: funnelErr } = await supabase
    .from("funnels")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (funnelErr || !funnelRow) {
    return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });
  }

  const { data: questionRows } = await supabase
    .from("funnel_questions")
    .select("*")
    .eq("funnel_id", funnelRow.id)
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

  const tenant = await getCurrentTenant(supabase);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { state }: { state: EditorState } = await req.json();

  // Slug bleibt immer der originale — Änderungen würden bestehende Embed-Codes brechen
  const funnelRow = editorStateToFunnelRow(state, tenant.id, oldSlug);
  const { data: updatedFunnel, error: updateErr } = await supabase
    .from("funnels")
    .update(funnelRow)
    .eq("slug", oldSlug)
    .select("id")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  if (!updatedFunnel) {
    return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });
  }

  // Fragen: alte löschen, neue einfügen (RLS filtert beides auf eigene Funnels)
  await supabase.from("funnel_questions").delete().eq("funnel_id", updatedFunnel.id);

  if (state.questions.length > 0) {
    const questionRows = editorQuestionsToDbRows(state.questions, updatedFunnel.id);
    const { error: qErr } = await supabase
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

  // RLS sorgt dafür, dass nur eigene Funnels sichtbar/löschbar sind.
  const { data: funnel } = await supabase
    .from("funnels")
    .select("id, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (!funnel) return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });
  if (funnel.is_active) {
    return NextResponse.json(
      { error: "Funnel muss zuerst deaktiviert sein" },
      { status: 400 },
    );
  }

  // Submissions vorab löschen (kein FK, Snapshot-Pattern — wird nicht via Cascade entfernt).
  // funnel_view_logs + funnel_questions werden via FK-CASCADE beim Funnel-Delete entfernt.
  await supabase.from("submissions").delete().eq("funnel_slug", slug);
  const { error } = await supabase.from("funnels").delete().eq("id", funnel.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
