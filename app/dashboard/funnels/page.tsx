import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import Card from "@/components/ui/Card";
import { FunnelCard } from "@/components/dashboard/FunnelCard";

interface FunnelItem {
  slug: string;
  funnelName: string;
  isActive: boolean;
  primaryColor: string;
  totalViews: number;
  leadCount: number;
}

async function getFunnels(): Promise<FunnelItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .maybeSingle();

  if (!tenant) return [];

  const { data: funnels } = await supabase
    .from("funnels")
    .select("id, slug, funnel_name, contact_form_title, is_active, primary_color, created_at")
    .eq("tenant_id", tenant.id)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  // Aufrufe pro Funnel aus funnel_view_logs (Aufgabe 46 Phase 3 — kein total_views-Zähler mehr).
  const funnelIds = (funnels ?? []).map((f) => f.id);
  const viewMap: Record<string, number> = {};
  if (funnelIds.length > 0) {
    const { data: logs } = await supabase
      .from("funnel_view_logs")
      .select("funnel_id")
      .in("funnel_id", funnelIds);
    for (const row of logs ?? []) {
      if (row.funnel_id) viewMap[row.funnel_id] = (viewMap[row.funnel_id] ?? 0) + 1;
    }
  }

  const slugs = (funnels ?? []).map((f) => f.slug);
  const countMap: Record<string, number> = {};
  if (slugs.length > 0) {
    // Funnel-Liste zeigt nur abgeschlossene Submissions als Lead-Count (keine Abbrecher).
    const { data: counts } = await supabase
      .from("submissions")
      .select("funnel_slug")
      .in("funnel_slug", slugs)
      .not('completed_at', 'is', null);
    for (const row of counts ?? []) {
      if (row.funnel_slug) {
        countMap[row.funnel_slug] = (countMap[row.funnel_slug] ?? 0) + 1;
      }
    }
  }

  return (funnels ?? []).map((f) => ({
    slug: f.slug,
    funnelName: f.funnel_name || f.contact_form_title || "Unbenannter Funnel",
    isActive: f.is_active ?? true,
    primaryColor: f.primary_color ?? "#22c55e",
    totalViews: viewMap[f.id] ?? 0,
    leadCount: countMap[f.slug] ?? 0,
  }));
}

export default async function FunnelsPage() {
  const funnels = await getFunnels();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">
            Meine Funnels
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {funnels.length === 0
              ? "Erstelle deinen ersten Funnel."
              : `${funnels.length} Funnel${funnels.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/dashboard/funnels/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} />
          Neuer Funnel
        </Link>
      </div>

      {/* Leerer Zustand */}
      {funnels.length === 0 && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Zap size={22} className="text-primary" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
              Noch kein Funnel
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              Erstelle deinen ersten Funnel und bette ihn auf deiner Website ein.
            </p>
            <Link
              href="/dashboard/funnels/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
            >
              <Plus size={16} />
              Ersten Funnel erstellen
            </Link>
          </div>
        </Card>
      )}

      {/* Funnel-Grid */}
      {funnels.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funnels.map((funnel) => (
            <FunnelCard key={funnel.slug} funnel={funnel} />
          ))}
        </div>
      )}
    </div>
  );
}
