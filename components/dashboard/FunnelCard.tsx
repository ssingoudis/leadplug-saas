"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Edit3 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { DeleteFunnelButton } from "@/components/tenant-editor/DeleteFunnelButton";

export interface FunnelItem {
  slug: string;
  funnelName: string;
  isActive: boolean;
  primaryColor: string;
  totalViews: number;
  leadCount: number;
}

export function FunnelCard({ funnel }: { funnel: FunnelItem }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/dashboard/funnels/${funnel.slug}/edit`)}
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-all ${
        funnel.isActive ? "" : "opacity-75 hover:opacity-100"
      }`}
    >
      <div
        className="h-1.5 w-full transition-opacity"
        style={{
          backgroundColor: funnel.primaryColor,
          opacity: funnel.isActive ? 1 : 0.35,
        }}
      />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {funnel.funnelName}
          </h3>
          <Badge variant={funnel.isActive ? "green" : "gray"}>
            {funnel.isActive ? "Aktiv" : "Inaktiv"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{funnel.leadCount}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Leads</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{funnel.totalViews}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Aufrufe</p>
          </div>
        </div>

        <div className="flex gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/dashboard/funnels/${funnel.slug}/edit`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-primary hover:text-primary dark:hover:text-primary transition-colors"
          >
            <Edit3 size={13} />
            Bearbeiten
          </Link>
          {funnel.isActive && (
            <Link
              href={`/${funnel.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-primary hover:text-primary dark:hover:text-primary transition-colors"
            >
              <Eye size={13} />
              Öffnen
            </Link>
          )}
          {!funnel.isActive && (
            <DeleteFunnelButton
              slug={funnel.slug}
              funnelName={funnel.funnelName}
              variant="icon"
            />
          )}
        </div>
      </div>
    </div>
  );
}
