import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ available: false, reason: "invalid_format" });
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("funnels")
    .select("slug", { count: "exact", head: true })
    .eq("slug", slug);

  return NextResponse.json({ available: count === 0 });
}
