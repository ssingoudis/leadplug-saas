"use client";

import { ChevronDown, ChevronRight, GripVertical, Trash2, Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { selRing } from "./selection";

interface Props {
  /** Linkes Icon + Pill-Farbe (kommt aus fieldMeta). */
  icon: string;
  pillClass: string;
  /** Hauptzeile: Anzeige-Name des Fields (z.B. „Frage" oder „Telefonnummer"). */
  label: string;
  /** Type-Badge: kleine Label rechts oder darunter, z.B. „EINFACHAUSWAHL", „TELEFON". */
  typeLabel: string;
  /** Soll der Row klickbar/expandierbar sein. Default true. */
  expandable?: boolean;
  /** Aktuell expandiert? */
  expanded: boolean;
  /** Click auf den Header (öffnet/schließt). */
  onToggle: () => void;
  /** Wenn gesetzt: Drag-Handle wird gerendert mit diesen Props. */
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement> & {
    ref?: (node: HTMLElement | null) => void;
  };
  /** Wenn gesetzt: Mülltonne wird gerendert. */
  onDelete?: () => void;
  /** Aufgabe 39 Polish: Sichtbarkeit-Toggle (Auge) als Inline-Action. */
  visible?: boolean;
  onToggleVisible?: () => void;
  /** Aufgabe 57C: Canvas-Selektion zeigt auf diese Row → kräftiger Ring in Markenfarbe
      (wandert mit der Selektion, verschwindet mit Esc/Deselect — symmetrisch zum Canvas-Highlight). */
  highlighted?: boolean;
  /** Inhalt im expandierten Zustand (FieldProperties). */
  children?: ReactNode;
}

export function FieldRow({
  icon,
  pillClass,
  label,
  typeLabel,
  expandable = true,
  expanded,
  onToggle,
  dragHandleProps,
  onDelete,
  visible = true,
  onToggleVisible,
  highlighted = false,
  children,
}: Props) {
  return (
    <div
      className={`rounded-xl border transition-all ${
        expanded
          ? "border-primary bg-primary/5 dark:border-primary dark:bg-primary/10"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      } ${selRing(highlighted)} ${!visible ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-1.5 px-1.5 py-1.5">
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="flex w-5 cursor-grab items-center justify-center text-gray-300 transition-colors hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
            aria-label="Reihenfolge ändern"
          >
            <GripVertical size={14} />
          </span>
        )}

        <button
          type="button"
          onClick={expandable ? onToggle : undefined}
          disabled={!expandable}
          className="flex flex-1 items-center gap-2 px-1.5 py-1 text-left disabled:cursor-default"
        >
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${pillClass}`}
          >
            {icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
              {label || <span className="italic text-gray-400 dark:text-gray-500">Ohne Beschriftung</span>}
            </span>
            <span className="truncate text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {typeLabel}
            </span>
          </div>
          {expandable && (
            <span className="shrink-0 text-gray-400 dark:text-gray-500">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </button>

        {onToggleVisible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible();
            }}
            title={visible ? "Feld ausblenden" : "Feld einblenden"}
            aria-label={visible ? "Feld ausblenden" : "Feld einblenden"}
            className={
              visible
                ? "shrink-0 p-1.5 text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
                : "shrink-0 p-1.5 text-primary transition-colors hover:opacity-80"
            }
          >
            {visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Feld löschen"
            className="shrink-0 p-1.5 text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {expanded && children && (
        <div className="border-t border-gray-200 px-3 py-3 dark:border-gray-700/60">{children}</div>
      )}
    </div>
  );
}
