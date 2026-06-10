"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { buildScriptEmbed, buildEmbedSnippet } from "@/lib/embedSnippet";
import { CodeBlock, CopyBar } from "@/components/dashboard/CodeSnippet";
import TrackingSettings from "@/components/dashboard/TrackingSettings";
import PlatformGuides from "@/components/dashboard/PlatformGuides";
import { SectionCard } from "./ui/Panel";

// =============================================================================
// Aufgabe 43 — „Einbinden"-Tab im Funnel-Editor (pro Funnel).
//
// Konsolidiert, was vorher auf der globalen /dashboard/embed-Seite lag, aber pro
// Funnel: Embed-Snippet + Conversion-Tracking-Felder + Plattform-Anleitungen.
// Tracking-Werte werden per GET geladen; gespeichert wird über TrackingSettings (PATCH).
// =============================================================================

interface Props {
  funnelSlug: string;
  funnelName?: string;
}

export function SharePanel({ funnelSlug, funnelName }: Props) {
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState("");
  const [google, setGoogle] = useState("");
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tenant/funnels/${funnelSlug}/tracking`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setMeta(data.metaPixelId ?? "");
            setGoogle(data.googleAdsConversion ?? "");
          }
        }
      } catch {
        // still — Tracking-Felder starten dann leer
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [funnelSlug]);

  const scriptSnippet = buildScriptEmbed(funnelSlug, origin || "https://app.leadplug.de");
  const iframeSnippet = buildEmbedSnippet(
    funnelSlug,
    `${origin || "https://app.leadplug.de"}/${funnelSlug}`,
    funnelName || funnelSlug,
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        {/* Embed-Code */}
        <SectionCard
          title="Funnel einbetten"
          description="Kopiere diese zwei Zeilen und füge sie auf deiner Website dort ein, wo der Funnel erscheinen soll. Das Script lädt sich von uns — Updates kommen automatisch, du musst nie neu kopieren."
          padded={false}
        >
          <div className="px-5 pb-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Empfohlen · mit Conversion-Tracking
            </span>
          </div>
          <CopyBar code={scriptSnippet} label="HTML + JavaScript" />
          <CodeBlock code={scriptSnippet} />

          <button
            onClick={() => setShowFallback((s) => !s)}
            className={`flex w-full cursor-pointer items-center justify-between border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500 transition-colors dark:border-gray-800 dark:text-gray-400 ${showFallback ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
          >
            <span>Klassische iFrame-Einbettung (ohne Tracking)</span>
            {showFallback ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showFallback && (
            <>
              <CopyBar code={iframeSnippet} label="HTML + JavaScript" />
              <CodeBlock code={iframeSnippet} />
            </>
          )}
        </SectionCard>

        {/* Conversion-Tracking */}
        <SectionCard padded={false}>
          {loading ? (
            <div className="flex items-center gap-2 px-5 py-6 text-sm text-gray-400">
              <Loader2 size={15} className="animate-spin" /> Lade Tracking-Einstellungen…
            </div>
          ) : (
            <TrackingSettings
              slug={funnelSlug}
              initialMetaPixelId={meta}
              initialGoogleAdsConversion={google}
            />
          )}
        </SectionCard>

        {/* Erweitert: GTM / Callback */}
        <details className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer list-none text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 group-open:bg-gray-100 dark:group-open:bg-gray-800">
            <span>Für Entwickler & Google Tag Manager (optional)</span>
            <ChevronDown size={16} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 pt-1 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
              Statt der Felder oben kannst du dein Tracking auch selbst am Event andocken. Bei jedem Lead wird in den <code className="font-mono text-[12px] text-primary">dataLayer</code> gepusht:
            </p>
            <pre className="overflow-x-auto rounded-xl bg-code-surface px-4 py-3 font-mono text-[12px] leading-5 text-slate-300 ring-1 ring-white/10">
{`window.dataLayer.push({ event: "leadplug_lead", funnel: "${funnelSlug}" })`}
            </pre>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              In GTM einen Trigger „Benutzerdefiniertes Ereignis" auf <code className="font-mono text-[12px] text-primary">leadplug_lead</code> anlegen. Oder einen eigenen Callback registrieren:
            </p>
            <pre className="overflow-x-auto rounded-xl bg-code-surface px-4 py-3 font-mono text-[12px] leading-5 text-slate-300 ring-1 ring-white/10">
{`window.LeadPlug = { onLead: function (e) { /* e.funnel */ } }`}
            </pre>
          </div>
        </details>

        {/* Plattform-Anleitungen */}
        <section>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Anleitung für deine Plattform</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            Wo du den Code einfügst — wähle deine Plattform:
          </p>
          <PlatformGuides />
        </section>
      </div>
    </div>
  );
}
