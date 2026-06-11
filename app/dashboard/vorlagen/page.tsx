import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TemplateShowcase } from "@/components/dashboard/TemplateShowcase";
import { mapTemplateRows, TEMPLATE_GALLERY_SELECT } from "@/components/dashboard/templates";

// Aufgabe 62 Runde 2 — eigener Menüpunkt „Vorlagen": das Schaufenster der fertigen
// Funnels (Hero-Karten + durchspielbare Vorschau). Templates kommen aus
// funnel_templates (RLS: SELECT für authenticated, nur aktive).

export default async function VorlagenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("funnel_templates")
    .select(TEMPLATE_GALLERY_SELECT)
    .order("sort_order", { ascending: true });

  const templates = mapTemplateRows(data);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-bold text-gray-900 dark:text-white">Vorlagen</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Fertige Funnels für den schnellen Start — ansehen, übernehmen, anpassen.
        </p>
      </div>

      <TemplateShowcase templates={templates} />
    </div>
  );
}
