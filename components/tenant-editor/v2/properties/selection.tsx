"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Aufgabe 57C — Canvas→Panel-Selektions-Sync.

   Der Canvas-Klick auf ein [data-edit-field]-Element setzt selectedFieldRef im
   EditorShell. PropertiesPanel reicht den Ref per Context hierher durch; Panel-
   Komponenten markieren das passende Eingabe-Element mit einem Ring in der
   Markenfarbe (wandert mit der Selektion, verschwindet mit Esc/Deselect —
   symmetrisch zum Highlight im Canvas).

   data-sel-target dient als Scroll-Anker: PropertiesPanel scrollt das markierte
   Element bei Selektions-Wechsel ins Sichtfeld.
   ───────────────────────────────────────────────────────────────────────────── */

export const SelectedFieldRefContext = createContext<string>("");

export function useSelectedFieldRef(): string {
  return useContext(SelectedFieldRefContext);
}

const RING =
  "ring-2 ring-primary/70 ring-offset-1 ring-offset-white dark:ring-primary dark:ring-offset-gray-900";

export function selRing(active: boolean): string {
  return active ? RING : "";
}

/**
 * Wrapper, der sein Kind markiert, wenn die Canvas-Selektion auf refKey zeigt.
 * refKey=null → neutraler Wrapper ohne Selektions-Verhalten (für konditionale Ziele).
 */
export function SelMark({
  refKey,
  className,
  children,
}: {
  refKey: string | null;
  className?: string;
  children: ReactNode;
}) {
  const selected = useSelectedFieldRef();
  const active = refKey !== null && selected === refKey;
  const cls = `${className ?? ""} ${active ? `rounded-lg ${RING}` : ""}`.trim();
  return (
    <div data-sel-target={refKey ?? undefined} className={cls || undefined}>
      {children}
    </div>
  );
}
