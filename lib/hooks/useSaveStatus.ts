"use client";

import { useCallback, useRef, useState } from "react";

// =============================================================================
// Aufgabe 50 — Autosave-Status (projektweites Pattern).
//
// Kapselt den Lebenszyklus eines Inline-/On-Blur-Autosaves: idle → saving →
// saved → (fade) idle, bzw. → error. Gepaart mit <SaveStatus> (components/ui)
// als sichtbarer Indikator. Bewusst kein stilles Speichern: ein fehlgeschlagener
// Save bleibt als "error" sichtbar (Kernprinzip „Daten gehen nicht verloren").
// =============================================================================

export type SaveStatusState = "idle" | "saving" | "saved" | "error";

export function useSaveStatus(resetDelayMs = 2000) {
  const [status, setStatus] = useState<SaveStatusState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("saving");
      try {
        await fn();
        setStatus("saved");
        timerRef.current = setTimeout(() => setStatus("idle"), resetDelayMs);
      } catch {
        // Bewusst nicht werfen — der Aufrufer behält die ungespeicherte Eingabe,
        // der Indikator signalisiert „nicht gespeichert".
        setStatus("error");
      }
    },
    [resetDelayMs],
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("idle");
  }, []);

  return { status, run, reset };
}
