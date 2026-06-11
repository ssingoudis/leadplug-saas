import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Aufgabe 62 — Funnel duplizieren (innerhalb des eigenen Kontos).
// POST /api/tenant/funnels/[slug]/duplicate.
// Atomar via RPC `duplicate_funnel` (SECURITY INVOKER): die RLS-SELECT-Policy
// blendet fremde Funnels aus — cross-tenant Kopien sind per Konstruktion
// unmöglich. Webhooks + Tracking-IDs werden bewusst nicht mitkopiert.

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: newSlug, error } = await supabase.rpc("duplicate_funnel", {
    p_source_slug: slug,
  });

  if (error || !newSlug) {
    return NextResponse.json(
      { error: error?.message ?? "Funnel konnte nicht dupliziert werden" },
      { status: 500 },
    );
  }

  return NextResponse.json({ slug: newSlug });
}
