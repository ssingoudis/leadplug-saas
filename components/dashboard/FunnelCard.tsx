"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Edit3, Copy, Check } from "lucide-react";
import { DeleteFunnelButton } from "@/components/tenant-editor/DeleteFunnelButton";

export interface FunnelItem {
  slug: string;
  funnelName: string;
  isActive: boolean;
  primaryColor: string;
  totalViews: number;
  leadCount: number;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/50">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value.toLocaleString("de-DE")}</p>
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

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
    <div className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
      {/* Status-Badge + (bei inaktiv) Löschen */}
      <div className="flex items-center justify-between">
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
        {!funnel.isActive && (
          <DeleteFunnelButton slug={funnel.slug} funnelName={funnel.funnelName} variant="icon" />
        )}
      </div>

      {/* Titel + öffentliche URL */}
      <div className="mt-3 min-w-0">
        <Link
          href={editHref}
          className="block truncate text-base font-bold text-gray-900 transition-colors hover:text-primary dark:text-white"
        >
          {funnel.funnelName}
        </Link>
        <button
          type="button"
          onClick={copyUrl}
          title="Funnel-Link kopieren"
          className="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-primary"
        >
          <span className="truncate font-mono">app.leadplug.de/{funnel.slug}</span>
          {copied ? <Check size={12} className="shrink-0 text-green-500" /> : <Copy size={12} className="shrink-0" />}
        </button>
      </div>

      {/* Kennzahlen */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat value={funnel.leadCount} label="Leads" />
        <Stat value={funnel.totalViews} label="Aufrufe" />
      </div>

      {/* Footer-Aktionen */}
      <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
        <Link href={editHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <Edit3 size={14} />
          Bearbeiten
        </Link>
        {funnel.isActive && (
          <Link
            href={`/${funnel.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
          >
            <Eye size={14} />
            Öffnen
          </Link>
        )}
      </div>
    </div>
  );
}
