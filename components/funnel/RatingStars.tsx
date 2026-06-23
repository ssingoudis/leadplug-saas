import { useState } from "react";

// 1-N Sterne mit Hover-Preview. Klick setzt den Wert; Hover füllt bis zur Position.
export function RatingStars({
  maxStars,
  value,
  onChange,
  primaryColor,
  mutedColor,
  centered = false,
}: {
  maxStars: number;
  value: number;
  onChange: (v: number) => void;
  primaryColor: string;
  mutedColor: string;
  /** Folgt dem „Mittig"-Karten-Layout (titleAlignment). */
  centered?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  return (
    <div
      className={`mb-3 flex items-center gap-1 @md:gap-1.5 ${centered ? "justify-center" : ""}`}
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((n) => {
        const filled = n <= display;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            aria-label={`${n} von ${maxStars} Sternen`}
            className="inline-flex h-10 w-10 @md:h-12 @md:w-12 items-center justify-center transition-colors"
            style={{ color: filled ? primaryColor : mutedColor, opacity: filled ? 1 : 0.4 }}
          >
            <svg
              viewBox="0 0 24 24"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-7 w-7 @md:h-9 @md:w-9"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
