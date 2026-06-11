import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Aufgabe 62 Runde 2 — Funnel aktivieren/deaktivieren direkt von der Funnel-Karte.
// PATCH /api/tenant/funnels/[slug]/active — Body: { active: boolean }.
// User-Client + RLS: nur eigene Funnels sind beschreibbar (Muster contact-warning).

export const runtime = "nodejs";

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const active = (body as Record<string, unknown>).active;
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "active muss boolean sein" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("funnels")
    .update({ is_active: active })
    .eq("slug", slug)
    .select("slug")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });

  return NextResponse.json({ success: true, active });
}
