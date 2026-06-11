"use client";

import { useCallback, useSyncExternalStore } from "react";

// Aufgabe 60: true, sobald der Viewport mindestens `px` breit ist. Reagiert live auf
// Resize (matchMedia-Listener). SSR/Hydration-sicher via useSyncExternalStore: der
// Server-Snapshot ist true (breit), der Client korrigiert direkt nach der Hydration
// ohne Mismatch-Fehler.
export function useMinWidth(px: number): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(`(min-width: ${px}px)`);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [px],
  );
  const getSnapshot = useCallback(() => window.matchMedia(`(min-width: ${px}px)`).matches, [px]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function getServerSnapshot(): boolean {
  return true;
}
