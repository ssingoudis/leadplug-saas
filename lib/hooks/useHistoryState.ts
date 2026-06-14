"use client";

import { useCallback, useState } from "react";

// =============================================================================
// Aufgabe 55 — Undo/Redo für den Funnel-Editor (Snapshot-Modell)
//
// Der gesamte Editor-Zustand ist EIN serialisierbares Objekt (EditorState) hinter
// einem einzigen setState — deshalb reicht Snapshot-Undo: kein Command-Pattern,
// kein Handler muss angefasst werden. Der Hook ist ein Drop-in-Ersatz für
// useState mit identischer set-Signatur (Wert ODER Updater-Funktion).
//
// Design-Entscheidungen:
//   • Pause-basiertes Coalescing: Änderungen mit < COALESCE_MS Abstand werden zu
//     EINEM Undo-Schritt verschmolzen → ein getipptes Wort = ein Undo, nicht
//     zwölf (die Properties-Panel-Inputs feuern pro Tastendruck).
//   • Stack-Limit MAX_HISTORY: EditorState ist wenige KB groß — 50 Snapshots
//     sind speicher-irrelevant, schützen aber gegen Endlos-Sessions.
//   • applyToAll: Transform über present + past + future OHNE History-Eintrag.
//     Für technische Merges, die in der gesamten Historie gelten müssen —
//     konkret der dbId-Merge nach dem Speichern (Aufgabe 54): ohne applyToAll
//     würde ein Undo über den Save-Punkt die frisch vergebenen Page-UUIDs
//     verlieren → der nächste Save würde die Pages löschen + neu anlegen und
//     damit after_page-Webhook-Bindings zerstören.
//   • StrictMode-sicher: alle Updater sind pure Funktionen über dem History-
//     Objekt (kein Ref-Mutieren im Updater) — Doppel-Invoke in Dev ist harmlos.
// =============================================================================

const MAX_HISTORY = 50;
const COALESCE_MS = 600;

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  /** Zeitpunkt der letzten Änderung — Basis für das Pause-Coalescing. */
  lastChangeAt: number;
}

export interface HistoryControls<T> {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Transform auf ALLE Snapshots anwenden, ohne History-Eintrag (s. Kopf-Kommentar). */
  applyToAll: (fn: (state: T) => T) => void;
}

export function useHistoryState<T>(
  initial: T,
): [T, (updater: T | ((prev: T) => T)) => void, HistoryControls<T>] {
  const [h, setH] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
    lastChangeAt: 0,
  });

  const set = useCallback((updater: T | ((prev: T) => T)) => {
    const now = Date.now();
    setH((cur) => {
      const next =
        typeof updater === "function" ? (updater as (p: T) => T)(cur.present) : updater;
      // Handler geben bei No-Ops `prev` zurück (z.B. Index out of range) — kein Eintrag.
      if (next === cur.present) return cur;
      // Pause-Coalescing: Nur wenn seit der letzten Änderung eine Pause war, beginnt
      // ein neuer Undo-Schritt (= der Vorzustand wird gepusht). Innerhalb eines
      // Tipp-Bursts bleibt der zuletzt gepushte Snapshot der Undo-Punkt.
      const startNewStep = now - cur.lastChangeAt > COALESCE_MS;
      const past = startNewStep ? [...cur.past, cur.present].slice(-MAX_HISTORY) : cur.past;
      return { past, present: next, future: [], lastChangeAt: now };
    });
  }, []);

  const undo = useCallback(() => {
    setH((cur) => {
      if (cur.past.length === 0) return cur;
      const previous = cur.past[cur.past.length - 1];
      return {
        past: cur.past.slice(0, -1),
        present: previous,
        future: [cur.present, ...cur.future],
        // 0 = der nächste Edit nach einem Undo startet immer einen neuen Schritt.
        lastChangeAt: 0,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setH((cur) => {
      if (cur.future.length === 0) return cur;
      const [next, ...rest] = cur.future;
      return {
        past: [...cur.past, cur.present].slice(-MAX_HISTORY),
        present: next,
        future: rest,
        lastChangeAt: 0,
      };
    });
  }, []);

  const applyToAll = useCallback((fn: (state: T) => T) => {
    setH((cur) => ({
      ...cur,
      present: fn(cur.present),
      past: cur.past.map(fn),
      future: cur.future.map(fn),
    }));
  }, []);

  return [
    h.present,
    set,
    { undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0, applyToAll },
  ];
}
