"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { buildScriptEmbed, buildEmbedSnippet } from "@/lib/embedSnippet";
import { CodeBlock, CopyBar } from "@/components/dashboard/CodeSnippet";
import TrackingSettings from "@/components/dashboard/TrackingSettings";
import PlatformGuides from "@/components/dashboard/PlatformGuides";

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
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        {/* Embed-Code */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="px-5 py-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Funnel einbetten</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Kopiere diese zwei Zeilen und füge sie auf deiner Website dort ein, wo der Funnel erscheinen soll. Das Script lädt sich von uns — Updates kommen automatisch, du musst nie neu kopieren.
            </p>
          </div>
          <div className="px-4 pb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Empfohlen · mit Conversion-Tracking
            </span>
          </div>
          <CopyBar code={scriptSnippet} label="HTML + JavaScript" />
          <CodeBlock code={scriptSnippet} />

          <button
            onClick={() => setShowFallback((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
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
        </section>

        {/* Conversion-Tracking */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
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
        </section>

        {/* Erweitert: GTM / Callback */}
        <details className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer list-none text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <span>Für Entwickler & Google Tag Manager (optional)</span>
            <span className="text-gray-400 text-[10px] transition-transform group-open:rotate-90">▶</span>
          </summary>
          <div className="px-5 pb-5 pt-1 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
              Statt der Felder oben kannst du dein Tracking auch selbst am Event andocken. Bei jedem Lead wird in den <code className="font-mono text-[12px] text-primary">dataLayer</code> gepusht:
            </p>
            <pre className="overflow-x-auto rounded-lg px-4 py-3 text-[12px] leading-5 font-mono" style={{ backgroundColor: "#0f172a", color: "#cbd5e1" }}>
{`window.dataLayer.push({ event: "leadplug_lead", funnel: "${funnelSlug}" })`}
            </pre>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              In GTM einen Trigger „Benutzerdefiniertes Ereignis" auf <code className="font-mono text-[12px] text-primary">leadplug_lead</code> anlegen. Oder einen eigenen Callback registrieren:
            </p>
            <pre className="overflow-x-auto rounded-lg px-4 py-3 text-[12px] leading-5 font-mono" style={{ backgroundColor: "#0f172a", color: "#cbd5e1" }}>
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
