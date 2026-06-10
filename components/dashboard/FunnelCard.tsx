"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Copy, Check } from "lucide-react";
import { DeleteFunnelButton } from "@/components/tenant-editor/DeleteFunnelButton";

export interface FunnelItem {
  slug: string;
  funnelName: string;
  isActive: boolean;
  primaryColor: string;
  totalViews: number;
  leadCount: number;
}

// =============================================================================
// Aufgabe 59 — Funnel-Karte modernisiert (Stavros-Review: „outdated"):
//   • ganze Karte klickbar → Editor, Hover-Lift (Muster Logic-Map-Karten)
//   • Kennzahlen als reine Typografie statt grauer Kästen („Kästen in Kästen")
//   • Farb-Chip in der Brand-Farbe des Funnels neben dem Titel — eine Agentur
//     mit vielen Endkunden-Funnels erkennt die Karten auf einen Blick
//   • Sekundär-Aktionen (Öffnen · Link kopieren · Löschen) als Icon-Reihe oben
//     rechts, erscheinen beim Hover (auf Touch immer sichtbar); Footer-Links weg
//   • Löschen weiterhin nur bei inaktiven Funnels (bewusster Schutz)
// =============================================================================

export function FunnelCard({ funnel }: { funnel: FunnelItem }) {
  const [copied, setCopied] = useState(false);
  const editHref = `/dashboard/funnels/${funnel.slug}/edit`;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(`https://app.leadplug.de/${funnel.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    // Hover = App-Standard (Dashboard-Karten): Karte tönt sich + primary-Rahmen + leichter
    // Schatten — kein Lift (Stavros-Review: Dark-Mode-Hover war daneben).
    <div className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:bg-gray-50 hover:shadow dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800">
      {/* Karten-Klickfläche → Editor. Der Titel-Link unten bleibt der „echte" Link
          (Fokus/Mittelklick); dieses Overlay macht nur die restliche Fläche klickbar.
          Interaktive Elemente liegen mit z-10 darüber. */}
      <Link href={editHref} aria-hidden tabIndex={-1} className="absolute inset-0 rounded-2xl" />

      {/* Status + Hover-Aktionen */}
      <div className="flex h-8 items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            funnel.isActive
              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${funnel.isActive ? "bg-green-500" : "bg-gray-400"}`} />
          {funnel.isActive ? "Aktiv" : "Inaktiv"}
        </span>

        {/* Sekundär-Aktionen: Hover-reveal auf Desktop, auf Touch immer sichtbar. */}
        <div className="relative z-10 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {funnel.isActive && (
            <Link
              href={`/${funnel.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Funnel öffnen (neuer Tab)"
              aria-label="Funnel öffnen"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <ExternalLink size={14} />
            </Link>
          )}
          <button
            type="button"
            onClick={copyUrl}
            title="Funnel-Link kopieren"
            aria-label="Funnel-Link kopieren"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
          {!funnel.isActive && (
            <DeleteFunnelButton slug={funnel.slug} funnelName={funnel.funnelName} variant="icon" />
          )}
        </div>
      </div>

      {/* Brand-Farb-Chip + Titel + öffentliche URL */}
      <div className="mt-2 flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-1 h-4 w-4 shrink-0 rounded-md border border-black/10 dark:border-white/10"
          style={{ backgroundColor: funnel.primaryColor || "#e5e7eb" }}
        />
        <div className="min-w-0">
          <Link
            href={editHref}
            className="relative z-10 block truncate text-base font-bold text-gray-900 transition-colors hover:text-primary dark:text-white"
          >
            {funnel.funnelName}
          </Link>
          <p className="truncate font-mono text-xs text-gray-400 dark:text-gray-500">
            app.leadplug.de/{funnel.slug}
          </p>
        </div>
      </div>

      {/* Kennzahlen — Typografie statt Kästen */}
      <p className="mt-4 flex items-baseline gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
          {funnel.leadCount.toLocaleString("de-DE")}
        </span>
        Leads
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
          {funnel.totalViews.toLocaleString("de-DE")}
        </span>
        Aufrufe
      </p>
    </div>
  );
}
