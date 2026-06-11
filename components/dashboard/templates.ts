// =============================================================================
// Aufgabe 62 — geteiltes Vokabular für die Vorlagen-Oberflächen
// (Vorlagen-Seite, „Neuer Funnel"-Modal). Client-sicher: nur Typen, ein
// Row-Mapper und der Fetch-Helper für die Instanziierung.
// =============================================================================

export interface TemplateItem {
  slug: string;
  name: string;
  description: string;
  category: string;
  previewSlug: string | null;
  color: string | null;
}

// Mappt die Supabase-Rows (select mit color-Alias auf definition->funnel->>primary_color)
// defensiv auf TemplateItem — eine Stelle für alle Server-Seiten.
export function mapTemplateRows(rows: Array<Record<string, unknown>> | null): TemplateItem[] {
  return (rows ?? []).map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : "",
    category: typeof row.category === "string" ? row.category : "",
    previewSlug: typeof row.preview_funnel_slug === "string" ? row.preview_funnel_slug : null,
    color: typeof row.color === "string" ? row.color : null,
  }));
}

// Spalten-Liste für die Galerie-Queries — bewusst ohne die volle definition.
export const TEMPLATE_GALLERY_SELECT =
  "slug, name, description, category, preview_funnel_slug, color:definition->funnel->>primary_color";

// Erstellt einen Funnel aus einer Vorlage (atomare RPC server-seitig).
// `name` = Wunschname aus der Namens-Abfrage (leer → Vorlagen-Name).
// Liefert den Slug des neuen Funnels oder wirft mit deutscher Fehlermeldung.
export async function createFunnelFromTemplate(templateSlug: string, name?: string): Promise<string> {
  const res = await fetch("/api/tenant/funnels/from-template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template: templateSlug, name: name ?? null }),
  });
  const data = (await res.json().catch(() => ({}))) as { slug?: string; error?: string };
  if (!res.ok || !data.slug) {
    throw new Error(data.error || "Vorlage konnte nicht verwendet werden.");
  }
  return data.slug;
}
