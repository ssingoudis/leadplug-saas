"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { FunnelTheme, FunnelFont } from "@/types";

// =============================================================================
// TYPEN & KONFIGURATION
// =============================================================================

interface Option {
  label: string;
  value: string;
  iconKey: string;
  iconProps?: Record<string, string>;
}

interface QuestionConfig {
  id: string;
  title: string;
  options: Option[];
  defaultValue?: string;
  visible: boolean;
}

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
// ICON KOMPONENTEN
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
  SolarSmall: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M18 14L12 48h16l6-34H18z" />
      <line x1="22" y1="14" x2="18" y2="48" stroke="#fff" strokeWidth="1.5" />
      <line x1="28" y1="14" x2="24" y2="48" stroke="#fff" strokeWidth="1.5" />
      <line x1="13" y1="31" x2="32" y2="28" stroke="#fff" strokeWidth="1.5" />
      <rect x="10" y="48" width="20" height="4" rx="1" />
      <rect x="18" y="52" width="4" height="8" />
    </svg>
  ),
  SolarMedium: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M12 12L4 52h24l8-40H12z" />
      <path d="M38 12L30 52h24l8-40H38z" />
      <line x1="18" y1="12" x2="12" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="28" y1="12" x2="22" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="44" y1="12" x2="38" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="54" y1="12" x2="48" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="5" y1="32" x2="34" y2="28" stroke="#fff" strokeWidth="1.5" />
      <line x1="31" y1="32" x2="60" y2="28" stroke="#fff" strokeWidth="1.5" />
      <rect x="2" y="52" width="60" height="4" rx="1" />
      <rect x="28" y="56" width="8" height="6" />
    </svg>
  ),
  SolarLarge: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M4 8L0 32h32l4-24H4z" />
      <path d="M32 8L28 32h32l4-24H32z" />
      <path d="M4 36L0 60h32l4-24H4z" />
      <path d="M32 36L28 60h32l4-24H32z" />
      <line x1="12" y1="8" x2="8" y2="32" stroke="#fff" strokeWidth="1" />
      <line x1="24" y1="8" x2="20" y2="32" stroke="#fff" strokeWidth="1" />
      <line x1="40" y1="8" x2="36" y2="32" stroke="#fff" strokeWidth="1" />
      <line x1="52" y1="8" x2="48" y2="32" stroke="#fff" strokeWidth="1" />
      <line x1="12" y1="36" x2="8" y2="60" stroke="#fff" strokeWidth="1" />
      <line x1="24" y1="36" x2="20" y2="60" stroke="#fff" strokeWidth="1" />
      <line x1="40" y1="36" x2="36" y2="60" stroke="#fff" strokeWidth="1" />
      <line x1="52" y1="36" x2="48" y2="60" stroke="#fff" strokeWidth="1" />
      <line x1="1" y1="20" x2="34" y2="18" stroke="#fff" strokeWidth="1" />
      <line x1="29" y1="20" x2="62" y2="18" stroke="#fff" strokeWidth="1" />
      <line x1="1" y1="48" x2="34" y2="46" stroke="#fff" strokeWidth="1" />
      <line x1="29" y1="48" x2="62" y2="46" stroke="#fff" strokeWidth="1" />
    </svg>
  ),
  SolarXL: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M2 4L0 20h20l2-16H2z" />
      <path d="M24 4L22 20h20l2-16H24z" />
      <path d="M46 4L44 20h18l2-16H46z" />
      <path d="M2 24L0 40h20l2-16H2z" />
      <path d="M24 24L22 40h20l2-16H24z" />
      <path d="M46 24L44 40h18l2-16H46z" />
      <path d="M2 44L0 60h20l2-16H2z" />
      <path d="M24 44L22 60h20l2-16H24z" />
      <path d="M46 44L44 60h18l2-16H46z" />
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
  HousePartial: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 6L4 28h6v28h44V28h6L32 6zm18 46H14V30h36v22z" />
      <rect x="24" y="38" width="16" height="16" />
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

// =============================================================================
// FRAGEN-KONFIGURATION
// =============================================================================

const questionsConfig: QuestionConfig[] = [
  {
    id: "gebaeudetyp",
    title: "Worauf soll die Solaranlage installiert werden?",
    visible: true,
    defaultValue: "efh",
    options: [
      { label: "Ein-/Zweifamilienhaus", value: "efh", iconKey: "House" },
      { label: "Mehrfamilienhaus", value: "mfh", iconKey: "Apartment" },
      { label: "Firmengebäude", value: "firma", iconKey: "Factory" },
      { label: "Sonstiges", value: "sonstiges", iconKey: "Question" },
    ],
  },
  {
    id: "flaeche",
    title: "Wie groß ist die Fläche bzw. die geplante Anlage?",
    visible: true,
    defaultValue: "21-100",
    options: [
      { label: "Bis 20 qm", value: "bis-20", iconKey: "SolarSmall" },
      { label: "21 bis 100 qm", value: "21-100", iconKey: "SolarMedium" },
      { label: "101 bis 200 qm", value: "101-200", iconKey: "SolarLarge" },
      { label: "Über 200 qm", value: "ueber-200", iconKey: "SolarXL" },
    ],
  },
  {
    id: "ausrichtung",
    title: "Haben Sie eine südlich ausgerichtete Dachfläche?",
    visible: true,
    defaultValue: "ja",
    options: [
      { label: "Ja", value: "ja", iconKey: "Check" },
      { label: "Nein", value: "nein", iconKey: "Cross" },
      { label: "Teilweise", value: "teilweise", iconKey: "HousePartial" },
      { label: "Bin nicht sicher", value: "unsicher", iconKey: "Question" },
    ],
  },
  {
    id: "stromspeicher",
    title: "Sind Sie an einem Stromspeicher interessiert?",
    visible: true,
    defaultValue: "ja",
    options: [
      { label: "Ja", value: "ja", iconKey: "Check" },
      { label: "Nein", value: "nein", iconKey: "Cross" },
      { label: "Weiß nicht", value: "unsicher", iconKey: "Question" },
    ],
  },
  {
    id: "kaufmiete",
    title: "Möchten Sie einen Angebotsvergleich zu Kauf und Miete?",
    visible: true,
    defaultValue: "beides",
    options: [
      { label: "Ja, beides interessant", value: "beides", iconKey: "Check" },
      { label: "Kaufen", value: "kaufen", iconKey: "Euro" },
      { label: "Mieten", value: "mieten", iconKey: "Document" },
      {
        label: "Weiß nicht / bitte Beratung",
        value: "unsicher",
        iconKey: "Question",
      },
    ],
  },
  {
    id: "zeitraum",
    title: "Wann soll das Projekt umgesetzt werden?",
    visible: true,
    defaultValue: "1-3",
    options: [
      {
        label: "umgehend",
        value: "umgehend",
        iconKey: "Calendar",
        iconProps: { text: "<1" },
      },
      {
        label: "In 1 bis 3 Monaten",
        value: "1-3",
        iconKey: "Calendar",
        iconProps: { text: "1-3" },
      },
      {
        label: "In 3 bis 6 Monaten",
        value: "3-6",
        iconKey: "Calendar",
        iconProps: { text: "3-6" },
      },
      { label: "Weiß nicht", value: "unsicher", iconKey: "Question" },
    ],
  },
];

// Icon Renderer
function renderIcon(iconKey: string, props?: Record<string, string>) {
  const IconComponent = Icons[iconKey as keyof typeof Icons];
  if (!IconComponent) return null;
  return <IconComponent {...props} />;
}

// =============================================================================
// HAUPTKOMPONENTE
// =============================================================================

interface SolarFunnelProps {
  theme?: Partial<FunnelTheme>;
  questions?: QuestionConfig[];
  onSubmit?: (data: {
    answers: Record<string, string>;
    contact: ContactData;
  }) => void;
}

interface ContactData {
  anrede: string;
  name: string;
  telefon: string;
  email: string;
}

export function SolarFunnel({
  theme: themeOverrides,
  questions = questionsConfig,
  onSubmit,
}: SolarFunnelProps) {
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
    onSubmit?.({ answers, contact: contactData });
  };

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
            className="text-xl font-bold mb-3"
            style={{ color: theme.textColor }}
          >
            Vielen Dank für Ihre Anfrage!
          </h2>
          <p className="text-sm mb-4" style={{ color: theme.textColorMuted }}>
            Wir melden uns innerhalb von 24 Stunden bei Ihnen.
          </p>
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
          // backgroundColor: theme.backgroundColor,
          backgroundColor: pageBackgroundColor,
          fontFamily: theme.fontFamily,
        }}
      >
        <div className="p-4 @md:p-8">
          {!isContactStep ? (
            <div>
              {/* Frage-Container: Hält die Höhe stabil, egal ob 1 oder 2 Zeilen */}
              <div className="flex flex-col justify-end min-h-[60px] @md:min-h-[80px] mb-6 @lg:mb-4">
                <h1
                  className="text-lg md:text-xl lg:text-2xl font-bold leading-tight text-center lg:text-left"
                  style={{ color: theme.textColor }}
                >
                  {currentQuestion.title}
                </h1>
              </div>

              {/* Options Grid – container queries (basieren auf Widget-Breite, nicht Viewport).
                Reservierte min-h pro Breakpoint hält die Container-Höhe frageübergreifend stabil:
                  < 320px (1-col, 4-opt = 4 Reihen): 548px
                  320–447px (2x2, 4-opt = 2 Reihen): 268px
                  ≥ 448px (1x4, 1 Reihe): 144px */}
              <div className="flex items-center mb-3 min-h-[548px] @xs:min-h-[268px] @lg:min-h-[144px]">
                <div
                  className={cn(
                    "grid gap-3 w-full",
                    currentQuestion.options.length === 2
                      ? "grid-cols-1 @xs:grid-cols-2"
                      : currentQuestion.options.length === 3
                        ? "grid-cols-1 @xs:grid-cols-3"
                        : "grid-cols-1 @xs:grid-cols-2 @xl:grid-cols-4",
                  )}
                >
                  {currentQuestion.options.map((option) => {
                    const isSelected =
                      answers[currentQuestion.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() =>
                          handleSelect(currentQuestion.id, option.value)
                        }
                        className="flex flex-col items-center h-32 @md:h-36 p-2 @md:p-3 rounded-lg border-2 transition-all duration-150 cursor-pointer"
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
                            {renderIcon(option.iconKey, option.iconProps)}
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
                Kostenlos Angebote vergleichen und genaue Ersparnis erfahren.
              </h1>

              <p
                className="font-semibold mb-4"
                style={{ color: theme.primaryColor }}
              >
                Wer soll die Angebote erhalten?
              </p>

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
                Mit Klick auf &quot;Angebotsvergleich starten&quot; stimme ich
                zu, zwecks Photovoltaik Angebotsvergleich per E-Mail &amp;
                Telefon kontaktiert zu werden. Widerrufen geht jederzeit. Mehr
                Infos in den{" "}
                <a
                  href="#"
                  style={{ color: theme.primaryColor }}
                  className="underline"
                >
                  Datenschutzhinweisen
                </a>
                .
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
                  Angebotsvergleich starten
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

// Export für einfache Anpassung
export type { QuestionConfig, Option };
export { questionsConfig as defaultQuestions };
