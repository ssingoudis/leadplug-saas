import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Aufgabe 43 — Turnkey-Conversion-Tracking.
// PATCH /api/tenant/funnels/[slug]/tracking — speichert die Werbe-Conversion-IDs eines Funnels.
// User-Client + RLS sorgen dafür, dass nur eigene Funnels beschrieben werden.

export const runtime = "nodejs";

// Format-Whitelists (identisch zu public/embed.js, damit nur valide IDs gespeichert werden).
const META_PIXEL_RE = /^[0-9]{5,20}$/;
const GOOGLE_SENDTO_RE = /^AW-[0-9]+(\/[\w-]+)?$/;

// Leerer/whitespace String → null (Tracking deaktiviert).
function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// GET /api/tenant/funnels/[slug]/tracking — aktuelle Conversion-IDs (für Editor-Prefill).
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

  // RLS filtert auf eigene Funnels.
  const { data, error } = await supabase
    .from("funnels")
    .select("meta_pixel_id, google_ads_conversion")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });

  return NextResponse.json({
    metaPixelId: data.meta_pixel_id ?? "",
    googleAdsConversion: data.google_ads_conversion ?? "",
  });
}

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
  const raw = body as Record<string, unknown>;

  const metaPixelId = normalize(raw.metaPixelId);
  const googleAdsConversion = normalize(raw.googleAdsConversion);

  if (metaPixelId !== null && !META_PIXEL_RE.test(metaPixelId)) {
    return NextResponse.json(
      { error: "Meta-Pixel-ID ungültig (nur Ziffern, 5–20 Stellen)." },
      { status: 400 },
    );
  }
  if (googleAdsConversion !== null && !GOOGLE_SENDTO_RE.test(googleAdsConversion)) {
    return NextResponse.json(
      { error: "Google-Ads-Conversion ungültig (Format AW-XXXXXXXXX oder AW-XXXXXXXXX/Label)." },
      { status: 400 },
    );
  }

  // RLS filtert auf eigene Funnels; .select prüft, dass wirklich eine Zeile getroffen wurde.
  const { data: updated, error } = await supabase
    .from("funnels")
    .update({ meta_pixel_id: metaPixelId, google_ads_conversion: googleAdsConversion })
    .eq("slug", slug)
    .select("slug")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Funnel nicht gefunden" }, { status: 404 });

  return NextResponse.json({ success: true, metaPixelId, googleAdsConversion });
}
