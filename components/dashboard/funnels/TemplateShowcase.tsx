"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Car,
  GraduationCap,
  HardHat,
  HeartHandshake,
  HeartPulse,
  Home,
  Landmark,
  Scale,
  Sparkles,
  Target,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { CreateFromTemplateDialog } from "./CreateFromTemplateDialog";
import type { TemplateItem } from "@/lib/templates";

// =============================================================================
// Aufgabe 62 Runde 2 — Vorlagen-Showcase (/dashboard/vorlagen).
// Großflächige Hero-Karten (Brand-Farbverlauf + Branchen-Icon, kein Bild-Asset
// nötig — echte Bilder können später ergänzt werden) + Vorschau-Modal mit
// dark-blurred Backdrop und dem ECHTEN, durchspielbaren Funnel im iframe
// (?preview=1 → zählt keinen Aufruf).
// Runde 3: „Verwenden" fragt zuerst den Funnel-Namen ab (CreateFromTemplate-
// Dialog, gleiche UX wie beim leeren Funnel); das Vorschau-Modal passt seine
// Höhe live an den Funnel an (funnel-resize-postMessage — das Widget meldet
// nach jedem Render seine Höhe, kein leerer weißer Kasten mehr).
// =============================================================================

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Energie: Zap,
  Immobilien: Home,
  Finanzen: Landmark,
  Recht: Scale,
  Coaching: Target,
  Recruiting: HardHat,
  Auto: Car,
  Handwerk: Wrench,
  Dienstleistung: Briefcase,
  Gesundheit: HeartPulse,
  Pflege: HeartHandshake,
  Bildung: GraduationCap,
};

function heroBackground(color: string | null): React.CSSProperties {
  const base = color || "#22c55e";
  return {
    backgroundColor: base,
    backgroundImage: `linear-gradient(135deg, ${base} 0%, color-mix(in srgb, ${base} 55%, #000) 100%)`,
  };
}

export function TemplateShowcase({ templates }: { templates: TemplateItem[] }) {
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [namingTemplate, setNamingTemplate] = useState<TemplateItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Kategorien mit Anzahl, größte Auswahl zuerst: die vorderen Chip-Plätze bekommen
  // die höchste Trefferchance (Handwerk/Dienstleistung = Kern der Zielgruppe), die
  // absteigenden Zahlen lesen sich als natürliche Hierarchie, und die 1er-Nischen
  // wandern ans Ende. Bei Gleichstand alphabetisch — deterministisch statt
  // Build-Chronologie. Pflegt sich selbst, wenn Vorlagen dazukommen.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) {
      if (!t.category) continue;
      counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"),
    );
  }, [templates]);

  const visibleTemplates = activeCategory
    ? templates.filter((t) => t.category === activeCategory)
    : templates;

  function startNaming(t: TemplateItem) {
    setPreviewTemplate(null);
    setNamingTemplate(t);
  }

  return (
    <div className="space-y-4">
      {/* Kategorie-Filter — bei ~37 Vorlagen die Orientierungshilfe gegen die Scrollwand.
          Mobil als EINE horizontal scrollbare Zeile (12 Chips würden sonst 5 Zeilen
          stapeln und die Karten unter die Falte drücken), ab sm mit Umbruch. */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
          <FilterChip
            label={`Alle (${templates.length})`}
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {categories.map(([category, count]) => {
            const Icon = CATEGORY_ICONS[category] ?? Sparkles;
            return (
              <FilterChip
                key={category}
                label={`${category} (${count})`}
                icon={<Icon size={14} />}
                active={activeCategory === category}
                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
              />
            );
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {visibleTemplates.map((t) => {
          const Icon = CATEGORY_ICONS[t.category] ?? Sparkles;
          return (
            <div
              key={t.slug}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-primary/40 hover:bg-gray-50 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              {/* Hero — klickbar als Vorschau (großflächige Inszenierung der Branche) */}
              <button
                type="button"
                onClick={() => t.previewSlug && setPreviewTemplate(t)}
                className="relative block h-44 w-full cursor-pointer overflow-hidden text-left"
                style={heroBackground(t.color)}
                aria-label={`Vorschau: ${t.name}`}
              >
                <Icon
                  size={150}
                  className="absolute -bottom-7 -right-6 rotate-12 text-white/15 transition-transform duration-300 group-hover:scale-110 group-hover:text-white/20"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  {t.category && (
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                      {t.category}
                    </span>
                  )}
                  <span className="mt-1 text-2xl font-bold leading-tight text-white drop-shadow-sm">
                    {t.name}
                  </span>
                </div>
                {t.previewSlug && (
                  <span className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    Vorschau ansehen
                  </span>
                )}
              </button>

              {/* Beschreibung + Aktionen */}
              <div className="flex flex-1 flex-col p-5">
                <p className="flex-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {t.description}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startNaming(t)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                  >
                    Vorlage verwenden
                  </button>
                  {t.previewSlug && (
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(t)}
                      // dark:hover:bg-gray-700: die Karte selbst tönt sich beim Hover auf gray-800 —
                      // erhöhte Elemente brauchen die nächste Stufe (Kanon „Noch höher").
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    >
                      Vorschau
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onUse={() => startNaming(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {namingTemplate && (
        <CreateFromTemplateDialog
          template={namingTemplate}
          onClose={() => setNamingTemplate(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────── Filter-Chip ───────────────────────────

function FilterChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-white"
          : "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 px-3.5 py-1.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      }
    >
      {icon}
      {label}
    </button>
  );
}

// ─────────────────────────── Vorschau-Modal ───────────────────────────
// Der echte Funnel, durchspielbar im iframe (?preview=1 → kein Aufruf gezählt).
// Höhe folgt live dem Funnel: das Widget postet nach jedem Render
// {type:'funnel-resize', height} an den Parent (dieselbe Mechanik wie embed.js)
// — kein starres 70vh-Fenster mit leerem weißen Rand mehr.

const PREVIEW_MIN_HEIGHT = 260;
const PREVIEW_INITIAL_HEIGHT = 420;

function TemplatePreviewModal({
  template,
  onUse,
  onClose,
}: {
  template: TemplateItem;
  onUse: () => void;
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(PREVIEW_INITIAL_HEIGHT);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onMessage(e: MessageEvent) {
      // Nur Resize-Messages aus UNSEREM iframe (Source-Check) übernehmen.
      const data = e.data as { type?: string; height?: number } | null;
      if (
        data?.type === "funnel-resize" &&
        typeof data.height === "number" &&
        e.source === iframeRef.current?.contentWindow
      ) {
        // iframe bekommt die VOLLE gemeldete Funnel-Höhe — nur ein Boden, KEIN Deckel.
        // Passt der Funnel nicht in die 90vh-Modalbox, scrollt der Modal-Body (siehe unten);
        // auf großen Schirmen bleibt er ohne Scrollbalken, weil overflow-y-auto nur bei
        // echtem Überlauf greift.
        setHeight(Math.max(data.height, PREVIEW_MIN_HEIGHT));
      }
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("message", onMessage);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMessage);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Vorschau: ${template.name}`}
      >
        {/* Mobil ist neben dem Titel kein Platz: Zeile 1 = Name + X, der CTA bekommt
            eine eigene volle Zeile, der erklärende Untertitel entfällt (ab sm wieder
            das einzeilige Layout mit Untertitel + Inline-Button). */}
        <div className="shrink-0 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{template.name}</p>
              <p className="hidden text-xs text-gray-400 dark:text-gray-500 sm:block">
                Durchspielbar — genau so sieht der Funnel nach dem Übernehmen aus.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onUse}
                className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:inline-flex"
              >
                Vorlage verwenden
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Vorschau schließen"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onUse}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:hidden"
          >
            Vorlage verwenden
          </button>
        </div>
        {/* Scrollbarer Body: sizet auf die iframe-Höhe; nur wenn Header + iframe die
            90vh-Modalhöhe überschreiten, schrumpft er (min-h-0 + Flex-Shrink) und scrollt.
            Kein flex-1 — auf kurzen Funnels bleibt er exakt so hoch wie der Inhalt. */}
        <div className="min-h-0 overflow-y-auto">
          <iframe
            ref={iframeRef}
            src={`/${template.previewSlug}?preview=1`}
            title={`Vorschau: ${template.name}`}
            style={{ height }}
            className="block w-full bg-white transition-[height] duration-300 ease-out"
          />
        </div>
      </div>
    </div>
  );
}
