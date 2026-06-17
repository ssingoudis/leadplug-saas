"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Aufgabe 74: leichtgewichtiger, dependency-freier Tooltip (ersetzt die hässlichen nativen
// title="…"-Tooltips). Portal auf document.body → kein Clipping durch overflow-hidden
// (z.B. Step-Liste). Erscheint mit kleiner Verzögerung, schließt bei mouseleave/blur.
type Side = "top" | "bottom" | "left" | "right";

export default function Tooltip({
  label,
  children,
  side = "top",
  className = "inline-flex",
  delay = 300,
}: {
  label: ReactNode;
  children: ReactNode;
  side?: Side;
  /** Wrapper-Display/Layout — Default inline-flex; für Truncate-Zeilen z.B. "truncate …". */
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function open() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 8;
      let top = 0;
      let left = 0;
      if (side === "bottom") { top = r.bottom + gap; left = r.left + r.width / 2; }
      else if (side === "top") { top = r.top - gap; left = r.left + r.width / 2; }
      else if (side === "right") { top = r.top + r.height / 2; left = r.right + gap; }
      else { top = r.top + r.height / 2; left = r.left - gap; }
      setPos({ top, left });
    }, delay);
  }

  function close() {
    if (timer.current) clearTimeout(timer.current);
    setPos(null);
  }

  const translate =
    side === "bottom"
      ? "-translate-x-1/2"
      : side === "top"
        ? "-translate-x-1/2 -translate-y-full"
        : side === "right"
          ? "-translate-y-1/2"
          : "-translate-x-full -translate-y-1/2";

  return (
    <span
      ref={ref}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
      className={className}
    >
      {children}
      {pos != null &&
        label != null &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
            className={`pointer-events-none fixed z-[100] max-w-xs rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg ring-1 ring-black/10 dark:bg-gray-700 ${translate}`}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
