import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TemplateShowcase } from "@/components/dashboard/funnels/TemplateShowcase";
import PageHeader from "@/components/ui/PageHeader";
import { mapTemplateRows, TEMPLATE_GALLERY_SELECT } from "@/lib/templates";

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
      <PageHeader
        title="Vorlagen"
        subtitle="Fertige Funnels für den schnellen Start — ansehen, übernehmen, anpassen."
      />

      <TemplateShowcase templates={templates} />
    </div>
  );
}
