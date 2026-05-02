"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { renderIcon } from "@/components/icons";
import type {
  FunnelTheme,
  FunnelFont,
  FunnelConfig,
  QuestionConfig,
  ContactData,
} from "@/types";

// =============================================================================
// THEME & FONTS
// =============================================================================

// Shadow-Definition als Single Source of Truth – unterstützt mehrere Layer.
// Padding wird automatisch aus dem maximalen Extent aller Layer abgeleitet.
const CARD_SHADOW_LAYERS = [
  { offsetY: 8, blur: 20, spread: -16, alpha: 0.28 }, // Haupt-Shadow: starker Bottom, Seiten ~4px
  { offsetY: 0, blur: 10, spread:  -3, alpha: 0.16 }, // Ambient-Layer: gleichmäßiger Glow rundum
] as const;

const _extent = CARD_SHADOW_LAYERS.reduce(
  (acc, { offsetY, blur, spread }) => {
    const base = blur + spread;
    return {
      top:    Math.max(acc.top,    Math.max(0, base - offsetY)),
      bottom: Math.max(acc.bottom, base + offsetY),
      sides:  Math.max(acc.sides,  Math.max(0, base)),
    };
  },
  { top: 0, bottom: 0, sides: 0 },
);
const SHADOW_PADDING = {
  top:    Math.ceil(_extent.top) + 4,
  bottom: Math.ceil(_extent.bottom),
  sides:  Math.ceil(_extent.sides),
};
const CARD_SHADOW_STRING = CARD_SHADOW_LAYERS
  .map(({ offsetY, blur, spread, alpha }) =>
    `0 ${offsetY}px ${blur}px ${spread}px rgba(0,0,0,${alpha})`
  )
  .join(", ");

const THEME_DEFAULTS = {
  primaryColor: "#22c55e",
  textColor: "#1f2937",
  backgroundColor: "#ffffff",
  pageBackgroundColor: "transparent",
  font: "system" as FunnelFont,
  borderRadius: "0.5rem",
  maxWidth: "720px",
};

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Self-hosted Fonts – siehe public/fonts/ und @font-face in app/globals.css.
const FONT_STACKS: Record<FunnelFont, string> = {
  system: SYSTEM_FONT,
  inter: `'Inter', ${SYSTEM_FONT}`,
  poppins: `'Poppins', ${SYSTEM_FONT}`,
  roboto: `'Roboto', ${SYSTEM_FONT}`,
};

// Farbhelfer: Hover / Muted / Border / Input-BG werden abgeleitet.
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function toHex(r: number, g: number, b: number): string {
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c)));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}
function mix(hex1: string, hex2: string, pct: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return toHex(
    r1 * (1 - pct) + r2 * pct,
    g1 * (1 - pct) + g2 * pct,
    b1 * (1 - pct) + b2 * pct,
  );
}

// =============================================================================
// GRID-LAYOUT für variable Optionszahlen
// =============================================================================
// Regeln:
//   2 → immer 1×2
//   3 → immer 1×3
//   4 → 2×2 → ab @[660px] 1×4
//   5 → 2+3 (via grid-cols-6 + col-span) → ab @[660px] 1×5
//   6 → 2×3 → ab @[660px] 3×2
//
// Reservierte min-h stabilisiert den Container frageübergreifend
// (Card-Höhe h-32=128px / @md h-36=144px, gap-3=12px).
// Tailwind v4: @md=448px, @lg=512px – deshalb explizites @[660px] statt @lg.

function getOptionsGridClasses(count: number): string {
  switch (count) {
    case 2:
      return "grid-cols-2 max-w-[360px]";
    case 3:
      return "grid-cols-3 max-w-[520px]";
    case 4:
      return "grid-cols-2 @[660px]:grid-cols-4";
    case 5:
      return "grid-cols-6 @[660px]:grid-cols-5";
    case 6:
      return "grid-cols-2 @[660px]:grid-cols-3";
    default:
      return "grid-cols-2 @[660px]:grid-cols-4";
  }
}


// 5 Optionen: grid-cols-6 als Basis → erste 2 Cards spannen 3 Spalten
// (oben 2), letzte 3 Cards spannen 2 Spalten (unten 3). Ab @[660px] alles 1-spaltig.
function getOptionColSpanClasses(count: number, idx: number): string {
  if (count !== 5) return "";
  return idx < 2
    ? "col-span-3 @[660px]:col-span-1"
    : "col-span-2 @[660px]:col-span-1";
}

// =============================================================================
// HAUPTKOMPONENTE
// =============================================================================

interface FunnelProps {
  theme?: Partial<FunnelTheme>;
  funnel: FunnelConfig;
  questions: QuestionConfig[];
  companyName?: string;
  publicEmail?: string;
  onSubmit?: (data: {
    answers: Record<string, string>;
    contact: ContactData;
    honeypot: string;
  }) => void;
}

export function Funnel({
  theme: themeOverrides,
  funnel,
  questions,
  companyName,
  publicEmail,
  onSubmit,
}: FunnelProps) {
  // Nur primaryColor ist pflicht; alles andere hat Defaults oder wird abgeleitet.
  const primaryColor =
    themeOverrides?.primaryColor ?? THEME_DEFAULTS.primaryColor;
  const textColor = themeOverrides?.textColor ?? THEME_DEFAULTS.textColor;
  const backgroundColor =
    themeOverrides?.backgroundColor ?? THEME_DEFAULTS.backgroundColor;
  const pageBackgroundColor =
    themeOverrides?.pageBackgroundColor ?? THEME_DEFAULTS.pageBackgroundColor;
  const borderRadius =
    themeOverrides?.borderRadius ?? THEME_DEFAULTS.borderRadius;
  const maxWidth = themeOverrides?.maxWidth ?? THEME_DEFAULTS.maxWidth;
  const font = themeOverrides?.font ?? THEME_DEFAULTS.font;

  const theme = {
    primaryColor,
    primaryColorHover: darken(primaryColor, 0.12),
    textColor,
    textColorMuted: mix(backgroundColor, textColor, 0.55),
    backgroundColor,
    borderColor: mix(backgroundColor, textColor, 0.12),
    inputBgColor: mix(backgroundColor, textColor, 0.03),
    borderRadius,
    maxWidth,
    fontFamily: FONT_STACKS[font],
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const visibleQuestions = questions.filter((q) => q.visible);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    visibleQuestions.forEach((q) => {
      if (q.defaultValue) initial[q.id] = q.defaultValue;
    });
    return initial;
  });
  const [contactData, setContactData] = useState<ContactData>({
    anrede: "",
    name: "",
    telefon: "",
    email: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({
    anrede: "",
    name: "",
    telefon: "",
    email: "",
  });
  const [honeypot, setHoneypot] = useState("");

  const validateField = (field: keyof ContactData, value: string): string => {
    switch (field) {
      case "anrede":
        return !value ? "Bitte wählen Sie eine Anrede aus." : "";
      case "name":
        return !value.trim() ? "Bitte geben Sie Ihren Namen ein." : "";
      case "email":
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? "Bitte geben Sie eine gültige E-Mail-Adresse ein."
          : "";
      case "telefon": {
        const onlyAllowed = /^[+\d\s\-()\/]+$/.test(value)
        const digitCount = (value.match(/\d/g) ?? []).length
        return !onlyAllowed || digitCount < 6
          ? "Bitte geben Sie eine gültige Telefonnummer ein."
          : "";
      }
      default:
        return "";
    }
  };

  const totalSteps = visibleQuestions.length + 1;
  const isContactStep = currentStep === visibleQuestions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentQuestion = visibleQuestions[currentStep];

  const handleSelect = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setTimeout(() => {
        if (currentStep < visibleQuestions.length) {
          setCurrentStep((prev) => prev + 1);
        }
      }, 200);
    },
    [currentStep, visibleQuestions.length],
  );

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const isValid =
    !validateField("anrede", contactData.anrede) &&
    !validateField("name", contactData.name) &&
    !validateField("email", contactData.email) &&
    !validateField("telefon", contactData.telefon);

  const handleSubmit = () => {
    setIsSubmitted(true);
    onSubmit?.({ answers, contact: contactData, honeypot });
  };

  // Widget → Parent: Höhe bei jeder Layoutänderung senden (Schritte, Responsive, Schriften).
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const el = containerRef.current;
    if (!el) return;
    const sendHeight = () => {
      const height = el.scrollHeight;
      if (height > 0) {
        window.parent.postMessage({ type: "funnel-resize", height }, "*");
      }
    };
    const ro = new ResizeObserver(sendHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isSubmitted]);

  // CSS Custom Properties für dynamisches Styling
  const cssVars = {
    "--funnel-primary": theme.primaryColor,
    "--funnel-primary-hover": theme.primaryColorHover,
    "--funnel-text": theme.textColor,
    "--funnel-text-muted": theme.textColorMuted,
    "--funnel-bg": theme.backgroundColor,
    "--funnel-border": theme.borderColor,
    "--funnel-input-bg": theme.inputBgColor,
    "--funnel-radius": theme.borderRadius,
  } as React.CSSProperties;

  if (isSubmitted) {
    return (
      <div ref={containerRef} style={{ backgroundColor: pageBackgroundColor, width: "100%", paddingTop: `${SHADOW_PADDING.top}px`, paddingBottom: `${SHADOW_PADDING.bottom}px` }}>
      <div
        className="mx-auto overflow-hidden"
        style={{
          ...cssVars,
          maxWidth: theme.maxWidth,
          backgroundColor: theme.backgroundColor,
          fontFamily: theme.fontFamily,
          borderRadius: theme.borderRadius,
          boxShadow: CARD_SHADOW_STRING,
        }}
      >
        {/* Header Banner */}
        <div
          className="px-8 py-5"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <p className="text-white font-bold text-base m-0">{companyName}</p>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${theme.primaryColor}20` }}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke={theme.primaryColor}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2
            className="text-2xl font-bold mb-2 leading-snug"
            style={{ color: theme.textColor }}
          >
            {funnel.successMessage}
          </h2>

          <p className="text-sm mb-6" style={{ color: theme.textColorMuted }}>
            Wir melden uns {funnel.responseTimeText} bei Ihnen.
          </p>

          {/* Antworten-Box */}
          <div
            className="rounded-lg text-left text-sm p-4"
            style={{
              backgroundColor: theme.inputBgColor,
              borderLeft: `4px solid ${theme.primaryColor}`,
            }}
          >
            <p className="font-semibold mb-3" style={{ color: theme.textColor }}>
              Ihre Angaben im Überblick:
            </p>
            {visibleQuestions.map((q) => {
              const selected = q.options.find((o) => o.value === answers[q.id])
              if (!selected) return null
              return (
                <p key={q.id} className="mb-1" style={{ color: theme.textColorMuted }}>
                  {q.title.replace("?", "")}:{" "}
                  <span style={{ color: theme.textColor, fontWeight: 500 }}>
                    {selected.label}
                  </span>
                </p>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 border-t text-xs"
          style={{
            backgroundColor: theme.inputBgColor,
            borderColor: theme.borderColor,
            color: theme.textColorMuted,
          }}
        >
          <p className="m-0">{companyName} · {publicEmail}</p>
        </div>
      </div>
      </div>
    );
  }

  const optionCount = currentQuestion?.options.length ?? 0;
  const gridClasses = getOptionsGridClasses(optionCount);

  return (
    <div ref={containerRef} style={{ backgroundColor: pageBackgroundColor, width: "100%", paddingTop: `${SHADOW_PADDING.top}px`, paddingBottom: `${SHADOW_PADDING.bottom}px` }}>
      <div
        lang="de"
        className="@container mx-auto w-full"
        style={{
          ...cssVars,
          maxWidth: theme.maxWidth,
          backgroundColor: theme.backgroundColor,
          fontFamily: theme.fontFamily,
          borderRadius: theme.borderRadius,
          overflow: "hidden",
          boxShadow: CARD_SHADOW_STRING,
        }}
      >
        <div className="p-4 @md:p-8">
          <div key={currentStep} className="funnel-step-enter">
          {!isContactStep ? (
            <div>
              <div className="mb-6 @lg:mb-8">
                <h1
                  className="text-lg md:text-xl lg:text-2xl font-bold leading-tight text-center"
                  style={{ color: theme.textColor }}
                >
                  {currentQuestion.title}
                </h1>
              </div>

              {/* Options Grid – container queries (basieren auf Widget-Breite) */}
              <div className="flex items-center justify-center mb-3">
                <div className={cn("grid gap-3 w-full", gridClasses)}>
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected =
                      answers[currentQuestion.id] === option.value;
                    const colSpan = getOptionColSpanClasses(optionCount, idx);
                    return (
                      <button
                        key={option.value}
                        onClick={() =>
                          handleSelect(currentQuestion.id, option.value)
                        }
                        className={cn(
                          "flex flex-col items-center min-h-20 p-3 border-2 transition-all duration-150 cursor-pointer",
                          colSpan,
                        )}
                        style={{
                          borderColor: isSelected
                            ? theme.primaryColor
                            : theme.borderColor,
                          backgroundColor: isSelected
                            ? `${theme.primaryColor}0a`
                            : theme.backgroundColor,
                          borderRadius: theme.borderRadius,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = theme.primaryColor;
                            e.currentTarget.style.backgroundColor = `${theme.primaryColor}0a`;
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = theme.borderColor;
                            e.currentTarget.style.backgroundColor = theme.backgroundColor;
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
                          }
                        }}
                      >
                        {/* 1. Icon */}
                        <div
                          className="w-10 h-10 flex items-center justify-center mb-2 shrink-0 rounded-xl"
                          style={{ backgroundColor: `${theme.primaryColor}15` }}
                        >
                          {renderIcon(
                            option.iconKey,
                            option.iconUrl,
                            theme.primaryColor,
                          )}
                        </div>

                        {/* 2. Text */}
                        <span
                          className="text-xs font-medium text-center leading-tight hyphens-auto px-1 my-auto"
                          style={{
                            color: isSelected
                              ? theme.primaryColor
                              : theme.textColor,
                          }}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Kontakt-Formular */
            <div>
              <h1
                className="text-lg md:text-xl lg:text-2xl font-bold mb-2 leading-tight"
                style={{ color: theme.textColor }}
              >
                {funnel.title}
              </h1>

              <p
                className="font-semibold mb-4"
                style={{ color: theme.primaryColor }}
              >
                {funnel.contactFormSubtitle}
              </p>

              {/* Honeypot – für Menschen unsichtbar, Bots füllen es aus */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
              />

              {/* Anrede */}
              <div className="mb-4">
                <div className="flex gap-5">
                  {["Herr", "Frau"].map((anrede) => (
                    <label
                      key={anrede}
                      className="flex items-center gap-2 cursor-pointer min-h-11"
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                        style={{
                          borderColor:
                            contactData.anrede === anrede
                              ? theme.primaryColor
                              : theme.borderColor,
                        }}
                      >
                        {contactData.anrede === anrede && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                        )}
                      </div>
                      <span style={{ color: theme.textColor }}>{anrede}</span>
                      <input
                        type="radio"
                        name="anrede"
                        value={anrede}
                        checked={contactData.anrede === anrede}
                        onChange={(e) => {
                          setContactData((prev) => ({
                            ...prev,
                            anrede: e.target.value,
                          }));
                          setErrors((prev) => ({ ...prev, anrede: "" }));
                        }}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>
                {errors.anrede && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                    {errors.anrede}
                  </p>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-3 mb-4">
                <div>
                  <input
                    type="text"
                    placeholder="Vor- und Nachname"
                    value={contactData.name}
                    onChange={(e) =>
                      setContactData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base"
                    style={{
                      borderColor: errors.name ? "#ef4444" : theme.borderColor,
                      backgroundColor: theme.inputBgColor,
                      color: theme.textColor,
                      borderRadius: theme.borderRadius,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.primaryColor;
                      e.currentTarget.style.backgroundColor =
                        theme.backgroundColor;
                    }}
                    onBlur={(e) => {
                      const error = validateField(
                        "name",
                        e.currentTarget.value,
                      );
                      setErrors((prev) => ({ ...prev, name: error }));
                      e.currentTarget.style.borderColor = error
                        ? "#ef4444"
                        : theme.borderColor;
                      e.currentTarget.style.backgroundColor =
                        theme.inputBgColor;
                    }}
                  />
                  {errors.name && (
                    <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Telefonnummer"
                    value={contactData.telefon}
                    onChange={(e) =>
                      setContactData((prev) => ({
                        ...prev,
                        telefon: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base"
                    style={{
                      borderColor: errors.telefon
                        ? "#ef4444"
                        : theme.borderColor,
                      backgroundColor: theme.inputBgColor,
                      color: theme.textColor,
                      borderRadius: theme.borderRadius,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.primaryColor;
                      e.currentTarget.style.backgroundColor =
                        theme.backgroundColor;
                    }}
                    onBlur={(e) => {
                      const error = validateField(
                        "telefon",
                        e.currentTarget.value,
                      );
                      setErrors((prev) => ({ ...prev, telefon: error }));
                      e.currentTarget.style.borderColor = error
                        ? "#ef4444"
                        : theme.borderColor;
                      e.currentTarget.style.backgroundColor =
                        theme.inputBgColor;
                    }}
                  />
                  {errors.telefon && (
                    <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                      {errors.telefon}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="E-Mail"
                    value={contactData.email}
                    onChange={(e) =>
                      setContactData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base"
                    style={{
                      borderColor: errors.email ? "#ef4444" : theme.borderColor,
                      backgroundColor: theme.inputBgColor,
                      color: theme.textColor,
                      borderRadius: theme.borderRadius,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.primaryColor;
                      e.currentTarget.style.backgroundColor =
                        theme.backgroundColor;
                    }}
                    onBlur={(e) => {
                      const error = validateField(
                        "email",
                        e.currentTarget.value,
                      );
                      setErrors((prev) => ({ ...prev, email: error }));
                      e.currentTarget.style.borderColor = error
                        ? "#ef4444"
                        : theme.borderColor;
                      e.currentTarget.style.backgroundColor =
                        theme.inputBgColor;
                    }}
                  />
                  {errors.email && (
                    <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Datenschutz */}
              <p
                className="text-xs mb-4 leading-relaxed"
                style={{ color: theme.textColorMuted }}
              >
                {funnel.privacyText}
                {funnel.privacyPolicyUrl && funnel.privacyPolicyUrl !== "#" && (
                  <>
                    {" "}
                    <a
                      href={funnel.privacyPolicyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: theme.primaryColor }}
                      className="underline"
                    >
                      Datenschutzhinweise
                    </a>
                    .
                  </>
                )}
              </p>

              {/* Submit Button */}
              <button
                onClick={() => {
                  const newErrors = {
                    anrede: validateField("anrede", contactData.anrede),
                    name: validateField("name", contactData.name),
                    telefon: validateField("telefon", contactData.telefon),
                    email: validateField("email", contactData.email),
                  };
                  setErrors(newErrors);
                  if (Object.values(newErrors).every((e) => !e)) {
                    handleSubmit();
                  }
                }}
                className="flex items-center justify-center gap-2 w-full text-white px-5 py-3 rounded-lg font-semibold transition-colors"
                style={{
                  backgroundColor: theme.primaryColor,
                  borderRadius: theme.borderRadius,
                  cursor: isValid ? "pointer" : "not-allowed",
                }}
                onMouseEnter={(e) => {
                  if (isValid) {
                    e.currentTarget.style.backgroundColor =
                      theme.primaryColorHover;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.primaryColor;
                }}
              >
                <span className="text-sm sm:text-base">
                  {funnel.submitButtonLabel}
                </span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
          </div>

          {/* Progress Bar & Navigation */}
          <div
            className="mt-6 pt-4 border-t"
            style={{ borderColor: theme.borderColor }}
          >
            <div
              className="h-2.5 rounded-full mb-3 overflow-hidden"
              style={{ backgroundColor: theme.inputBgColor }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: theme.primaryColor,
                }}
              />
            </div>

            <div className="flex items-center">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                suppressHydrationWarning
                className="flex items-center gap-1 text-sm transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
                style={{ color: theme.textColorMuted }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled)
                    e.currentTarget.style.color = theme.textColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.textColorMuted;
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                zurück
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
