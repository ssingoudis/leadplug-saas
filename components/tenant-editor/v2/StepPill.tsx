"use client";

import { GripVertical, EyeOff } from "lucide-react";
import type { FieldMeta } from "./fieldMeta";

interface Props {
  number: number;
  title: string;
  meta: FieldMeta;
  selected: boolean;
  hidden?: boolean;
  draggable?: boolean;
  onClick: () => void;
  /** dnd-kit refs (drag handle + draggable wrapper). */
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement> & { ref?: (node: HTMLElement | null) => void };
}

export function StepPill({
  number,
  title,
  meta,
  selected,
  hidden = false,
  draggable = false,
  onClick,
  dragHandleProps,
}: Props) {
  return (
    <div
      className={`group flex items-stretch overflow-hidden rounded-xl border transition-all ${
        selected
          ? "border-primary bg-primary/5 dark:border-primary dark:bg-primary/10"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      }`}
    >
      {draggable && (
        <span
          {...dragHandleProps}
          className="flex w-5 cursor-grab items-center justify-center text-gray-300 transition-colors hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
          aria-label="Reihenfolge ändern"
          role="button"
          tabIndex={-1}
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
            {number} · {meta.label}
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
    </div>
  );
}
