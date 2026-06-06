"use client";

import { GripVertical, EyeOff, Webhook } from "lucide-react";
import type { FieldMeta } from "./fieldMeta";

interface Props {
  /** Aufgabe 51: nur Fragen/Cards werden nummeriert. Welcome + Abschluss-Steps: null = keine Nummer. */
  number?: number | null;
  title: string;
  meta: FieldMeta;
  selected: boolean;
  hidden?: boolean;
  draggable?: boolean;
  /** Aufgabe 40: Anzahl Webhooks die auf diese Page als trigger_page_id zeigen.
      Wenn > 0 → kleines Webhook-Icon rechts neben dem Titel. Click → Tenant
      springt in den Webhooks-Tab (wird via Window-Event vom Editor verkabelt). */
  webhookCount?: number;
  onClick: () => void;
  onWebhookBadgeClick?: () => void;
  /** dnd-kit refs (drag handle + draggable wrapper). Wird auf das ganze Pill gelegt,
      damit der Drag überall am Pill startet. Click vs Drag löst die activationConstraint
      des Sensors (distance: 4) automatisch — kurzer Klick = onClick, Bewegung > 4px = Drag. */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> & { ref?: (node: HTMLElement | null) => void };
}

export function StepPill({
  number,
  title,
  meta,
  selected,
  hidden = false,
  draggable = false,
  webhookCount = 0,
  onClick,
  onWebhookBadgeClick,
  dragHandleProps,
}: Props) {
  return (
    <div
      {...(draggable ? dragHandleProps : {})}
      className={`group flex items-stretch overflow-hidden rounded-xl border transition-all ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${
        selected
          ? "border-primary bg-primary/5 dark:border-primary dark:bg-primary/10"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      }`}
    >
      {draggable && (
        <span
          className="flex w-5 items-center justify-center text-gray-300 transition-colors group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400"
          aria-hidden="true"
        >
          <GripVertical size={14} />
        </span>
      )}

      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 items-center gap-2 px-2.5 py-2 text-left"
      >
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${meta.pillClass}`}
        >
          {meta.icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {number != null ? `${number} · ${meta.label}` : meta.label}
          </span>
          <span
            className={`truncate text-sm ${
              selected
                ? "font-semibold text-gray-900 dark:text-white"
                : "font-medium text-gray-700 dark:text-gray-200"
            } ${hidden ? "opacity-50" : ""}`}
          >
            {title || <span className="italic text-gray-400 dark:text-gray-500">Ohne Titel</span>}
          </span>
        </div>
        {hidden && (
          <span title="Ausgeblendet" className="text-gray-400 dark:text-gray-500">
            <EyeOff size={12} />
          </span>
        )}
      </button>

      {webhookCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onWebhookBadgeClick?.();
          }}
          aria-label={`${webhookCount} Webhook${webhookCount > 1 ? "s" : ""} nach diesem Schritt — zur Konfiguration`}
          title={`${webhookCount} Webhook${webhookCount > 1 ? "s" : ""} nach diesem Schritt — klicken zum Konfigurieren`}
          className="mr-2 my-auto inline-flex items-center gap-1 rounded-md border border-violet-200 dark:border-violet-700/40 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-1 text-[10px] font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
        >
          <Webhook size={10} strokeWidth={2.5} />
          {webhookCount}
        </button>
      )}
    </div>
  );
}
