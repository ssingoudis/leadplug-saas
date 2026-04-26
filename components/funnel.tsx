"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
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

const THEME_DEFAULTS = {
  primaryColor: "#22c55e",
  textColor: "#1f2937",
  backgroundColor: "#F7F6FF",
  pageBackgroundColor: "#F7F6FF",
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
// ICON LIBRARY – neue Icons per Eintrag hier hinzufügen, referenziert via icon_key
// =============================================================================

const Icons = {
  House: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 6L4 28h6v28h44V28h6L32 6zm18 46H14V30h36v22z" />
    </svg>
  ),
  Apartment: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M12 8v48h40V8H12zm36 44H16V12h32v40z" />
      <rect x="20" y="16" width="6" height="6" />
      <rect x="29" y="16" width="6" height="6" />
      <rect x="38" y="16" width="6" height="6" />
      <rect x="20" y="26" width="6" height="6" />
      <rect x="29" y="26" width="6" height="6" />
      <rect x="38" y="26" width="6" height="6" />
      <rect x="20" y="36" width="6" height="6" />
      <rect x="29" y="36" width="6" height="6" />
      <rect x="38" y="36" width="6" height="6" />
      <rect x="26" y="46" width="12" height="10" />
    </svg>
  ),
  Factory: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M4 56h56V24L44 36V24L28 36V16H4v40z" />
      <rect x="8" y="44" width="8" height="8" />
      <rect x="20" y="44" width="8" height="8" />
    </svg>
  ),
  HousePartial: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 6L4 28h6v28h44V28h6L32 6zm18 46H14V30h36v22z" />
      <rect x="24" y="38" width="16" height="16" />
    </svg>
  ),
  SolarPanel: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M10 14L4 52h50l6-38H10z" />
      <line x1="22" y1="14" x2="18" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="34" y1="14" x2="30" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="46" y1="14" x2="42" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="6" y1="33" x2="58" y2="33" stroke="#fff" strokeWidth="1.5" />
    </svg>
  ),
  Thermometer: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M28 8a4 4 0 0 1 8 0v31.1a10 10 0 1 1-8 0V8zm4 48a6 6 0 0 0 2-11.6V12a2 2 0 0 0-4 0v32.4A6 6 0 0 0 32 56z" />
      <circle cx="32" cy="50" r="4" />
      <rect x="30" y="16" width="4" height="30" rx="1" />
    </svg>
  ),
  Flame: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 4c-2 10-14 16-14 30 0 10 6 22 14 22s14-12 14-22c0-8-4-12-4-18-3 5-7 6-10 6 0-6 0-10 0-18z" />
    </svg>
  ),
  HeatPump: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M8 12h48v36H8V12zm4 4v28h40V16H12z" />
      <circle cx="32" cy="30" r="10" />
      <circle cx="32" cy="30" r="3" fill="#fff" />
      <path
        d="M32 20c-2 3-2 7 0 10 2-3 6-3 10 0-3-2-3-6 0-10-3 2-7 2-10 0z"
        fill="#fff"
      />
      <rect x="14" y="50" width="8" height="6" />
      <rect x="42" y="50" width="8" height="6" />
    </svg>
  ),
  Drop: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 4C22 20 14 32 14 42c0 10 8 18 18 18s18-8 18-18c0-10-8-22-18-38z" />
    </svg>
  ),
  Snowflake: ({ color = "#444" }: { color?: string }) => (
    <svg
      viewBox="0 0 64 64"
      className="w-full h-full"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    >
      <line x1="32" y1="6" x2="32" y2="58" />
      <line x1="6" y1="32" x2="58" y2="32" />
      <line x1="13" y1="13" x2="51" y2="51" />
      <line x1="51" y1="13" x2="13" y2="51" />
      <polyline points="26,10 32,16 38,10" />
      <polyline points="26,54 32,48 38,54" />
      <polyline points="10,26 16,32 10,38" />
      <polyline points="54,26 48,32 54,38" />
    </svg>
  ),
  Wrench: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M52.3 17.7l-7.1 7.1-5.6-5.6 7.1-7.1c-7 .4-11.5 3-13.7 7.9-1.6 3.6-1.4 7.4.1 10.6L9.9 52.7c-1.6 1.6-1.6 4.1 0 5.7 1.6 1.6 4.1 1.6 5.7 0l23-23c3.2 1.5 7 1.7 10.6.1 4.9-2.2 7.5-6.7 7.9-13.7l-4.8-4.1z" />
    </svg>
  ),
  Lightning: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M36 4L12 36h14l-4 24 26-34H34l4-22z" />
    </svg>
  ),
  Star: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 4l8.6 17.4L60 24.2 46 37.8l3.3 19.2L32 48l-17.3 9 3.3-19.2L4 24.2l19.4-2.8L32 4z" />
    </svg>
  ),
  Check: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M24 48L8 32l4-4 12 12 28-28 4 4L24 48z" />
    </svg>
  ),
  Cross: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M48 20l-4-4-12 12-12-12-4 4 12 12-12 12 4 4 12-12 12 12 4-4-12-12z" />
    </svg>
  ),
  Question: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 8c-8.8 0-16 7.2-16 16h6c0-5.5 4.5-10 10-10s10 4.5 10 10c0 4.1-2.5 7.8-6.3 9.4-2.8 1.2-5.7 4.2-5.7 8.6v4h6v-4c0-1.6.9-3.2 2.7-4 6-2.5 9.3-8.5 9.3-14 0-8.8-7.2-16-16-16zm-3 44h6v6h-6v-6z" />
    </svg>
  ),
  Euro: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M42 12c-9 0-16 5-19 14H14v4h8c0 1-.1 2-.1 3s.1 2 .1 3h-8v4h9c3 9 10 14 19 14 4 0 8-1 11-4l-3-5c-2 2-5 3-8 3-5 0-10-3-12-8h14v-4H29c0-1 0-2 0-3s0-2 0-3h17v-4H30c2-5 7-8 12-8 3 0 6 1 8 3l3-5c-3-3-7-4-11-4z" />
    </svg>
  ),
  Document: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M40 4H16v56h32V12L40 4zm4 52H20V8h16v8h8v40z" />
      <rect x="24" y="24" width="16" height="3" />
      <rect x="24" y="32" width="16" height="3" />
      <rect x="24" y="40" width="10" height="3" />
    </svg>
  ),
  Calendar: ({
    color = "#444",
    text = "",
  }: {
    color?: string;
    text?: string;
  }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M52 8h-4V4h-4v4H20V4h-4v4h-4c-2.2 0-4 1.8-4 4v40c0 2.2 1.8 4 4 4h40c2.2 0 4-1.8 4-4V12c0-2.2-1.8-4-4-4zm0 44H12V20h40v32z" />
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fontFamily="Arial"
      >
        {text}
      </text>
    </svg>
  ),
};

function renderIcon(
  iconKey: string,
  iconUrl?: string,
  iconProps?: Record<string, string>,
) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="w-full h-full object-contain"
        loading="lazy"
      />
    );
  }
  const IconComponent = Icons[iconKey as keyof typeof Icons];
  if (!IconComponent) return null;
  return <IconComponent {...iconProps} />;
}

// =============================================================================
// GRID-LAYOUT für variable Optionszahlen
// =============================================================================
// Regeln:
//   2 → immer 1×2
//   3 → immer 1×3
//   4 → 2×2 → ab @lg 1×4
//   5 → 2+3 (via grid-cols-6 + col-span) → ab @lg 1×5
//   6 → 2×3 → ab @lg 3×2
//
// Reservierte min-h stabilisiert den Container frageübergreifend
// (Card-Höhe h-32=128px / @md h-36=144px, gap-3=12px).

function getOptionsGridClasses(count: number): string {
  switch (count) {
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-3";
    case 4:
      return "grid-cols-2 @lg:grid-cols-4";
    case 5:
      return "grid-cols-6 @lg:grid-cols-5";
    case 6:
      return "grid-cols-2 @lg:grid-cols-3";
    default:
      return "grid-cols-2 @lg:grid-cols-4";
  }
}

function getOptionsMinHeightClasses(count: number): string {
  switch (count) {
    case 2:
    case 3:
      return "min-h-[128px] @md:min-h-[144px]";
    case 4:
    case 5:
      return "min-h-[268px] @md:min-h-[300px] @lg:min-h-[144px]";
    case 6:
      return "min-h-[408px] @md:min-h-[456px] @lg:min-h-[300px]";
    default:
      return "min-h-[408px] @md:min-h-[456px] @lg:min-h-[300px]";
  }
}

// 5 Optionen: grid-cols-6 als Basis → erste 2 Cards spannen 3 Spalten
// (oben 2), letzte 3 Cards spannen 2 Spalten (unten 3). Ab @lg alles 1-spaltig.
function getOptionColSpanClasses(count: number, idx: number): string {
  if (count !== 5) return "";
  return idx < 2
    ? "col-span-3 @lg:col-span-1"
    : "col-span-2 @lg:col-span-1";
}

// =============================================================================
// HAUPTKOMPONENTE
// =============================================================================

interface FunnelProps {
  theme?: Partial<FunnelTheme>;
  funnel: FunnelConfig;
  questions: QuestionConfig[];
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
      case "telefon":
        return !/^[+\d\s\-()]{6,}$/.test(value)
          ? "Bitte geben Sie eine gültige Telefonnummer ein."
          : "";
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

  // Widget → Parent: Höhe nach jedem Step-/Submit-Wechsel senden.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const raf = requestAnimationFrame(() => {
      window.parent.postMessage(
        {
          type: "funnel-resize",
          height: document.documentElement.scrollHeight,
        },
        "*",
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [currentStep, isSubmitted]);

  // Widget → Parent: Höhe bei Window-Resize senden.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const sendHeight = () => {
      requestAnimationFrame(() => {
        window.parent.postMessage(
          { type: "funnel-resize", height: document.documentElement.scrollHeight },
          "*",
        );
      });
    };
    window.addEventListener("resize", sendHeight);
    return () => window.removeEventListener("resize", sendHeight);
  }, []);

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
      <div
        className="mx-auto p-8 rounded-lg shadow-lg"
        style={{
          ...cssVars,
          maxWidth: theme.maxWidth,
          backgroundColor: theme.backgroundColor,
          fontFamily: theme.fontFamily,
        }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
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
            className="text-xl font-bold mb-4 leading-snug"
            style={{ color: theme.textColor }}
          >
            {funnel.successMessage}
          </h2>
          <div
            className="p-4 rounded-lg text-left text-sm"
            style={{ backgroundColor: theme.inputBgColor }}
          >
            <p
              className="font-semibold mb-2"
              style={{ color: theme.textColor }}
            >
              Ihre Angaben:
            </p>
            {visibleQuestions.map((q) => (
              <p key={q.id} style={{ color: theme.textColorMuted }}>
                {q.title.replace("?", ":")}{" "}
                <span style={{ color: theme.textColor, fontWeight: 500 }}>
                  {q.options.find((o) => o.value === answers[q.id])?.label ||
                    "-"}
                </span>
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const optionCount = currentQuestion?.options.length ?? 0;
  const gridClasses = getOptionsGridClasses(optionCount);
  const minHeightClasses = getOptionsMinHeightClasses(optionCount);

  return (
    <div
      style={{
        backgroundColor: pageBackgroundColor,
        width: "100%",
        minHeight: "100%",
      }}
    >
      <div
        className="@container mx-auto w-full"
        style={{
          ...cssVars,
          maxWidth: theme.maxWidth,
          backgroundColor: pageBackgroundColor,
          fontFamily: theme.fontFamily,
        }}
      >
        <div className="p-4 @md:p-8">
          {!isContactStep ? (
            <div>
              <div className="mb-6 @lg:mb-4">
                <h1
                  className="text-lg md:text-xl lg:text-2xl font-bold leading-tight text-center lg:text-left"
                  style={{ color: theme.textColor }}
                >
                  {currentQuestion.title}
                </h1>
              </div>

              {/* Options Grid – container queries (basieren auf Widget-Breite) */}
              <div className={cn("flex items-center mb-3", minHeightClasses)}>
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
                          "flex flex-col items-center h-32 @md:h-36 p-2 @md:p-3 rounded-lg border-2 transition-all duration-150 cursor-pointer",
                          colSpan,
                        )}
                        style={{
                          borderColor: isSelected
                            ? theme.primaryColor
                            : theme.borderColor,
                          backgroundColor: "#ffffff",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.borderColor =
                              theme.primaryColor;
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.borderColor =
                              theme.borderColor;
                        }}
                      >
                        {/* 1. Icon: In fester Box für gleiche Höhe */}
                        <div className="h-10 @md:h-12 flex items-center justify-center mb-1 shrink-0">
                          <div className="w-9 h-9 @md:w-11 @md:h-11">
                            {renderIcon(
                              option.iconKey,
                              option.iconUrl,
                              option.iconProps,
                            )}
                          </div>
                        </div>

                        {/* 2. Radio Circle: In fester Box für gleiche Höhe */}
                        <div className="h-6 flex items-center justify-center mb-1 shrink-0">
                          <div
                            className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors"
                            style={{
                              borderColor: isSelected
                                ? theme.primaryColor
                                : theme.borderColor,
                            }}
                          >
                            {isSelected && (
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: theme.primaryColor }}
                              />
                            )}
                          </div>
                        </div>

                        {/* 3. Text: flex-1 füllt den Rest, items-center zentriert vertikal */}
                        <div className="flex-1 flex items-center justify-center w-full min-h-0">
                          <span
                            className="text-xs @md:text-sm font-medium text-center leading-tight hyphens-auto px-1"
                            style={{
                              color: isSelected
                                ? theme.primaryColor
                                : theme.textColor,
                            }}
                          >
                            {option.label}
                          </span>
                        </div>
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
                  {["Herr", "Frau", "Divers"].map((anrede) => (
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

          {/* Progress Bar & Navigation */}
          <div
            className="mt-6 pt-4 border-t"
            style={{ borderColor: theme.borderColor }}
          >
            <div
              className="h-1.5 rounded-full mb-3 overflow-hidden"
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

            <div className="flex justify-between items-center">
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                className="flex items-center gap-1 text-sm transition-colors disabled:opacity-30"
                style={{ color: theme.textColorMuted }}
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
              <span
                className="text-xs font-medium"
                style={{ color: theme.textColorMuted }}
              >
                {Math.ceil(((currentStep + 1) / totalSteps) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
