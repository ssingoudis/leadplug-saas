import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Aufgabe 57D — Kontaktierbarkeits-Warnung quittieren.
// PATCH /api/tenant/funnels/[slug]/contact-warning — Body: { hidden: boolean }.
// Persistiert funnels.hide_contact_warning (gerät- und teamübergreifend, bewusst
// außerhalb des EditorState/Undo-Modells — wirkt sofort, kein Save nötig).
// User-Client + RLS sorgen dafür, dass nur eigene Funnels beschrieben werden.

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
  const hidden = (body as Record<string, unknown>).hidden;
  if (typeof hidden !== "boolean") {
    return NextResponse.json({ error: "hidden muss boolean sein" }, { status: 400 });
  }

  // RLS filtert auf eigene Funnels; .select prüft, dass wirklich eine Zeile getroffen wurde.
  const { data: updated, error } = await supabase
    .from("funnels")
    .update({ hide_contact_warning: hidden })
    .eq("slug", slug)
    .select("slug")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });

  return NextResponse.json({ success: true, hidden });
}
