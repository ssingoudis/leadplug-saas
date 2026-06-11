import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Aufgabe 62 — Vorlagen-Galerie: Vorlage als neuen Funnel instanziieren.
// POST /api/tenant/funnels/from-template — Body: { template: string }.
// Die ganze Kopie (Funnel + Pages + Fields + Logik + Drip-Mails) läuft atomar
// in der RPC `create_funnel_from_template` (SECURITY INVOKER — RLS-Policies
// erzwingen, dass nur in den eigenen Tenant geschrieben wird).

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const template = (body as Record<string, unknown>).template;
  if (typeof template !== "string" || !template.trim()) {
    return NextResponse.json({ error: "Vorlage fehlt" }, { status: 400 });
  }
  // Aufgabe 62 Runde 3: Wunschname aus der Namens-Abfrage (optional — leer fällt
  // auf den Vorlagen-Namen zurück, RPC-seitig via coalesce).
  const rawName = (body as Record<string, unknown>).name;
  const funnelName = typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;

  // Tenant-Lookup wie in POST /api/tenant/funnels (User-Client + RLS).
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // notification_email ist NOT NULL — User-E-Mail als Startwert (wie beim leeren Anlegen).
  if (!user.email) {
    return NextResponse.json({ error: "Benachrichtigungs-E-Mail fehlt" }, { status: 400 });
  }

  const { data: slug, error } = await supabase.rpc("create_funnel_from_template", {
    p_template_slug: template.trim(),
    p_tenant_id: tenant.id,
    p_notification_email: user.email,
    p_funnel_name: funnelName,
  });

  if (error || !slug) {
    return NextResponse.json(
      { error: error?.message ?? "Vorlage konnte nicht verwendet werden" },
      { status: 500 },
    );
  }

  return NextResponse.json({ slug });
}
