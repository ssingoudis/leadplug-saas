// 0-N Buttons in einer Reihe (NPS-Style); aktiver = volle Markenfarbe.
export function ScaleButtons({
  min,
  max,
  value,
  onChange,
  labelLeft,
  labelRight,
  primaryColor,
  tintColor,
  tintColorHover,
  textColor,
  mutedColor,
  borderRadius,
  centered = false,
}: {
  min: number;
  max: number;
  value: string;
  onChange: (v: string) => void;
  labelLeft?: string;
  labelRight?: string;
  primaryColor: string;
  tintColor: string;
  tintColorHover: string;
  textColor: string;
  mutedColor: string;
  borderRadius: string;
  /** Folgt dem „Mittig"-Karten-Layout (titleAlignment). */
  centered?: boolean;
}) {
  const range = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
  return (
    <div className="mb-3">
      <div className={`flex flex-wrap items-center gap-1.5 @md:gap-2 ${centered ? "justify-center" : ""}`}>
        {range.map((n) => {
          const active = String(n) === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className="inline-flex h-10 min-w-10 @md:h-12 @md:min-w-12 items-center justify-center px-2 text-sm @md:text-base font-medium transition-colors"
              style={{
                backgroundColor: active ? primaryColor : tintColor,
                color: active ? "#ffffff" : textColor,
                borderRadius,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = tintColorHover;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = tintColor;
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(labelLeft || labelRight) && (
        <div className="mt-2 flex items-baseline justify-between text-xs @md:text-sm font-light" style={{ color: mutedColor }}>
          <span>{labelLeft}</span>
          <span>{labelRight}</span>
        </div>
      )}
    </div>
  );
}
