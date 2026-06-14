import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Plus, Zap } from "lucide-react";
import Card from "@/components/ui/Card";
import { FunnelCard } from "@/components/dashboard/funnels/FunnelCard";
import { NewFunnelButton } from "@/components/dashboard/funnels/NewFunnelModal";
import {
  mapTemplateRows,
  TEMPLATE_GALLERY_SELECT,
  type TemplateItem,
} from "@/lib/templates";

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

// Vorlagen-Metadaten fürs „Neuer Funnel"-Modal (Aufgabe 62 Runde 2) — kleine Query, keine definition.
async function getTemplates(): Promise<TemplateItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("funnel_templates")
    .select(TEMPLATE_GALLERY_SELECT)
    .order("sort_order", { ascending: true });
  return mapTemplateRows(data);
}

export default async function FunnelsPage() {
  const [funnels, templates] = await Promise.all([getFunnels(), getTemplates()]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">
            Funnels
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {funnels.length === 0
              ? "Noch keinen Funnel angelegt."
              : `${funnels.length} Funnel${funnels.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <NewFunnelButton
          templates={templates}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} />
          Neuer Funnel
        </NewFunnelButton>
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
              Den ersten Funnel erstellen und auf der Website einbinden.
            </p>
            <NewFunnelButton
              templates={templates}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
            >
              <Plus size={16} />
              Ersten Funnel erstellen
            </NewFunnelButton>
          </div>
        </Card>
      )}

      {/* Funnel-Grid — 2 pro Zeile (Desktop) + „Neuer Funnel"-Karte als letztes Feld */}
      {funnels.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {funnels.map((funnel) => (
            <FunnelCard key={funnel.slug} funnel={funnel} />
          ))}
          <NewFunnelButton
            templates={templates}
            className="group flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary dark:border-gray-700"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-primary/10 dark:bg-gray-800">
              <Plus size={20} />
            </span>
            <span className="text-sm font-semibold">Neuen Funnel anlegen</span>
          </NewFunnelButton>
        </div>
      )}
    </div>
  );
}
