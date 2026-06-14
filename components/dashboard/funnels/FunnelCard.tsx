"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  CopyPlus,
  ExternalLink,
  LoaderCircle,
  MoreVertical,
  Power,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { DeleteFunnelModal } from "./DeleteFunnelModal";

export interface FunnelItem {
  slug: string;
  funnelName: string;
  isActive: boolean;
  primaryColor: string;
  totalViews: number;
  leadCount: number;
}

// =============================================================================
// Aufgabe 59 — Funnel-Karte modernisiert (ganze Karte klickbar, Kennzahlen als
// Typografie, Brand-Farb-Chip, Hover-Aktionen).
// Aufgabe 62 Runde 2 — ⋯-Menü (Stavros: Deaktivieren/Löschen war nicht auffindbar):
//   • immer sichtbar (nicht hover-gated) — Duplizieren · Aktivieren/Deaktivieren
//     · Löschen als beschriftete Menüpunkte statt kryptischer Icons
//   • Löschen für ALLE Funnels (vorher nur inaktive) — der Bestätigungs-Dialog
//     warnt bei aktiven Funnels explizit vor dem sterbenden öffentlichen Link
// =============================================================================

export function FunnelCard({ funnel }: { funnel: FunnelItem }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [dupState, setDupState] = useState<"idle" | "pending" | "error">("idle");
  const [toggleState, setToggleState] = useState<"idle" | "pending" | "error">("idle");
  const menuRef = useRef<HTMLDivElement>(null);
  const editHref = `/dashboard/funnels/${funnel.slug}/edit`;

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(`https://app.leadplug.de/${funnel.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function duplicateFunnel() {
    if (dupState === "pending") return;
    setDupState("pending");
    try {
      const res = await fetch(`/api/tenant/funnels/${funnel.slug}/duplicate`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { slug?: string };
      if (!res.ok || !data.slug) throw new Error();
      setDupState("idle");
      setMenuOpen(false);
      // Kopie erscheint als neue Karte in der Liste.
      router.refresh();
    } catch {
      setDupState("error");
      setTimeout(() => setDupState("idle"), 3000);
    }
  }

  async function toggleActive() {
    if (toggleState === "pending") return;
    setToggleState("pending");
    try {
      const res = await fetch(`/api/tenant/funnels/${funnel.slug}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !funnel.isActive }),
      });
      if (!res.ok) throw new Error();
      setToggleState("idle");
      setMenuOpen(false);
      router.refresh();
    } catch {
      setToggleState("error");
      setTimeout(() => setToggleState("idle"), 3000);
    }
  }

  return (
    // Hover = App-Standard (Dashboard-Karten): Karte tönt sich + primary-Rahmen + leichter
    // Schatten — kein Lift (Stavros-Review: Dark-Mode-Hover war daneben).
    <div
      className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:bg-gray-50 hover:shadow dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
      // Brand-Farb-Akzent am linken Kartenrand (inline → schlägt auch den Hover-Rahmen).
      style={{ borderLeftWidth: "4px", borderLeftColor: funnel.primaryColor || "#e5e7eb" }}
    >
      {/* Karten-Klickfläche → Editor. Der Titel-Link unten bleibt der „echte" Link
          (Fokus/Mittelklick); dieses Overlay macht nur die restliche Fläche klickbar.
          Interaktive Elemente liegen mit z-10 darüber. */}
      <Link href={editHref} aria-hidden tabIndex={-1} className="absolute inset-0 rounded-2xl" />

      {/* Status + Aktionen */}
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

        {/* z-20: das aufgeklappte ⋯-Menü muss ÜBER dem Titel-Link liegen (der hat
            z-10 und kommt später im DOM — bei gleichem z-index gewinnt er sonst). */}
        <div className="relative z-20 flex items-center gap-1">
          {/* Schnell-Aktionen: Hover-reveal auf Desktop, auf Touch immer sichtbar. */}
          <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {funnel.isActive && (
              <Link
                // ?preview=1: Eigen-Ansehen zählt keinen Aufruf (Skip in TenantFunnelClient).
                href={`/${funnel.slug}?preview=1`}
                target="_blank"
                rel="noopener noreferrer"
                title="Funnel ansehen (neuer Tab)"
                aria-label="Funnel ansehen"
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
          </div>

          {/* ⋯-Menü: IMMER sichtbar — Deaktivieren/Löschen müssen ohne Suchen
              auffindbar sein (Stavros-Befund Aufgabe 62 Runde 2). */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Weitere Aktionen"
              aria-label="Weitere Aktionen"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 ${
                menuOpen ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" : "text-gray-400"
              }`}
            >
              <MoreVertical size={15} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={duplicateFunnel}
                  disabled={dupState === "pending"}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {dupState === "pending" ? (
                    <LoaderCircle size={15} className="animate-spin text-gray-400" />
                  ) : dupState === "error" ? (
                    <TriangleAlert size={15} className="text-red-500" />
                  ) : (
                    <CopyPlus size={15} className="text-gray-400" />
                  )}
                  {dupState === "error" ? "Duplizieren fehlgeschlagen" : "Duplizieren"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={toggleActive}
                  disabled={toggleState === "pending"}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {toggleState === "pending" ? (
                    <LoaderCircle size={15} className="animate-spin text-gray-400" />
                  ) : toggleState === "error" ? (
                    <TriangleAlert size={15} className="text-red-500" />
                  ) : (
                    <Power size={15} className="text-gray-400" />
                  )}
                  {toggleState === "error"
                    ? "Ändern fehlgeschlagen"
                    : funnel.isActive
                      ? "Deaktivieren"
                      : "Aktivieren"}
                </button>
                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowDelete(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={15} />
                  Löschen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Titel + öffentliche URL (Brand-Farbe sitzt jetzt als Akzent am linken Kartenrand) */}
      <div className="mt-4 min-w-0">
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

      {showDelete && (
        <DeleteFunnelModal
          slug={funnel.slug}
          funnelName={funnel.funnelName}
          isActive={funnel.isActive}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
