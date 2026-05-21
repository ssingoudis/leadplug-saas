import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Eye, Edit3, Zap } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

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

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("slug")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tenant) return [];

  const { data: funnels } = await admin
    .from("funnels")
    .select("slug, funnel_name, funnel_title, is_active, primary_color, total_views, created_at")
    .eq("tenant_slug", tenant.slug)
    .order("created_at", { ascending: true });

  const slugs = (funnels ?? []).map((f) => f.slug);
  let countMap: Record<string, number> = {};
  if (slugs.length > 0) {
    const { data: counts } = await admin
      .from("submissions")
      .select("funnel_slug")
      .in("funnel_slug", slugs);
    for (const row of counts ?? []) {
      countMap[row.funnel_slug] = (countMap[row.funnel_slug] ?? 0) + 1;
    }
  }

  return (funnels ?? []).map((f) => ({
    slug: f.slug,
    funnelName: f.funnel_name || f.funnel_title || "Unbenannter Funnel",
    isActive: f.is_active ?? true,
    primaryColor: f.primary_color ?? "#22c55e",
    totalViews: f.total_views ?? 0,
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
            <div
              key={funnel.slug}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden flex flex-col"
            >
              {/* Farbstreifen oben */}
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: funnel.primaryColor }}
              />

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {funnel.funnelName}
                    </h3>
                  </div>
                  <Badge variant={funnel.isActive ? "green" : "gray"}>
                    {funnel.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {funnel.leadCount}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Leads</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {funnel.totalViews}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Aufrufe</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <Link
                    href={`/dashboard/funnels/${funnel.slug}/edit`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    <Edit3 size={13} />
                    Bearbeiten
                  </Link>
                  <Link
                    href={`/${funnel.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    <Eye size={13} />
                    Öffnen
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
