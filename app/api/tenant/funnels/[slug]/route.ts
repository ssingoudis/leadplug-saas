import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  editorStateToFunnelRow,
  editorStateToPagesAndFields,
  dbToEditorState,
  type DbPageRow,
  type DbFieldRow,
} from "@/lib/editorUtils";
import type { EditorState } from "@/types";

async function getCurrentTenant(supabase: SupabaseClient) {
  // Aufgabe 54b: limit(1) + order — maybeSingle() ERRORT bei >1 Row. Heute hat
  // jeder User genau einen Tenant; sobald Multi-Membership kommt (Phase E), würde
  // der Editor sonst hart brechen. Deterministisch: ältester Tenant zuerst.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, company_name")
    .order("created_at", { ascending: true })
    .limit(1)
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

  const { data: pageRows } = await supabase
    .from("pages")
    .select("id, funnel_id, page_type, sort_order, config")
    .eq("funnel_id", funnelRow.id)
    .order("sort_order", { ascending: true });

  const pageIds = (pageRows ?? []).map((p) => p.id);
  const { data: fieldRows } = pageIds.length > 0
    ? await supabase
        .from("fields")
        .select("id, page_id, field_key, field_type, label, subtitle, placeholder, visible, required, sort_order, options, config")
        .in("page_id", pageIds)
    : { data: [] as DbFieldRow[] };

  const state = dbToEditorState(funnelRow, (pageRows ?? []) as DbPageRow[], (fieldRows ?? []) as DbFieldRow[]);

  return NextResponse.json({
    state,
    companyName: tenant.company_name,
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

  let state: EditorState;
  try {
    ({ state } = (await req.json()) as { state: EditorState });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!state || !Array.isArray(state.questions)) {
    return NextResponse.json({ error: "Ungültiger Editor-State" }, { status: 400 });
  }

  // notification_email ist seit B.4 NOT NULL — Fallback auf User-E-Mail wenn leer.
  const fallbackEmail = user.email ?? '';
  if (!state.notificationEmail?.trim() && !fallbackEmail) {
    return NextResponse.json(
      { error: "Benachrichtigungs-E-Mail fehlt" },
      { status: 400 },
    );
  }

  // Slug bleibt immer der originale — Änderungen würden bestehende Embed-Codes brechen
  const funnelRow = editorStateToFunnelRow(state, tenant.id, oldSlug, fallbackEmail);
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

  // Pages + Fields atomar ersetzen (Aufgabe 54): die RPC replace_funnel_content
  // läuft als EINE Transaktion — schlägt irgendwas fehl, bleibt der alte Stand
  // vollständig erhalten (vorher: delete-then-insert mit Datenverlust-Fenster).
  // Bestehende Page-UUIDs werden upserted statt rotiert → after_page-Webhook-
  // Bindings (trigger_page_id) überleben das Speichern. SECURITY INVOKER: RLS
  // filtert in der Funktion weiterhin auf eigene Funnels.
  const { pages, fields, pageIdByClientId } = editorStateToPagesAndFields(state, updatedFunnel.id);

  const { error: rpcErr } = await supabase.rpc("replace_funnel_content", {
    p_funnel_id: updatedFunnel.id,
    p_pages: pages,
    p_fields: fields,
  });
  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  // Aufgabe 54: persistierte Page-UUIDs zurückgeben — der Editor mergt sie als dbId
  // in seinen State, damit auch neu angelegte Steps ab dem ersten Save eine stabile
  // UUID haben (Webhook-Binding ohne Editor-Reload, keine ID-Rotation bei Folge-Saves).
  return NextResponse.json({ slug: oldSlug, pageIds: pageIdByClientId });
}

// PATCH /api/tenant/funnels/[slug] — leichtgewichtiges Metadaten-Update (Autosave).
// Bewusst NICHT der volle Dokument-Save (PUT): rührt pages/fields nicht an, damit z.B.
// eine Umbenennung kein Speichern des ganzen Builders auslöst. Erweiterbar um weitere
// Metadaten-Felder (Toggles etc.) nach demselben Whitelist-Muster.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = {};

  if (body && typeof body.funnelName === "string") {
    const trimmed = body.funnelName.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Funnel-Name darf nicht leer sein." }, { status: 400 });
    }
    if (trimmed.length > 120) {
      return NextResponse.json({ error: "Funnel-Name ist zu lang (max. 120 Zeichen)." }, { status: 400 });
    }
    patch.funnel_name = trimmed;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Keine gültigen Felder zum Aktualisieren." }, { status: 400 });
  }

  // RLS stellt sicher, dass nur eigene Funnels aktualisiert werden.
  const { data: updated, error } = await supabase
    .from("funnels")
    .update(patch)
    .eq("slug", slug)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });

  return NextResponse.json({ success: true });
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
  // funnel_view_logs + pages + fields werden via FK-CASCADE beim Funnel-Delete entfernt.
  await supabase.from("submissions").delete().eq("funnel_slug", slug);
  const { error } = await supabase.from("funnels").delete().eq("id", funnel.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
