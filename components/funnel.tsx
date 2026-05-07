"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderIcon } from "@/components/icons";
import { resolveAnswer } from "@/lib/resolveAnswer";
import type {
  FunnelTheme,
  FunnelFont,
  FunnelConfig,
  QuestionConfig,
  TextConfig,
  SliderConfig,
  ContactData,
} from "@/types";

// =============================================================================
// CONSTANTS
// =============================================================================

// Multi-layer shadow: strong bottom offset + soft ambient glow.
// SHADOW_PADDING reserves space around the card so the shadow isn't clipped.
const CARD_SHADOW_LAYERS = [
  { offsetY: 8, blur: 20, spread: -16, alpha: 0.28 },
  { offsetY: 0, blur: 10, spread: -3,  alpha: 0.16 },
] as const;

const shadowExtent = CARD_SHADOW_LAYERS.reduce(
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
  top:    Math.ceil(shadowExtent.top) + 4,
  bottom: Math.ceil(shadowExtent.bottom),
  sides:  Math.ceil(shadowExtent.sides),
};

const CARD_SHADOW_STRING = CARD_SHADOW_LAYERS.map(
  ({ offsetY, blur, spread, alpha }) =>
    `0 ${offsetY}px ${blur}px ${spread}px rgba(0,0,0,${alpha})`,
).join(", ");

const THEME_DEFAULTS = {
  primaryColor:        "#22c55e",
  textColor:           "#1f2937",
  backgroundColor:     "#ffffff",
  pageBackgroundColor: "transparent",
  font:                "system" as FunnelFont,
  borderRadius:        "0.5rem",
  maxWidth:            "720px",
};

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// Self-hosted fonts loaded via @font-face in app/globals.css (DSGVO-konform).
const FONT_STACKS: Record<FunnelFont, string> = {
  system:  SYSTEM_FONT,
  inter:   `'Inter', ${SYSTEM_FONT}`,
  poppins: `'Poppins', ${SYSTEM_FONT}`,
  roboto:  `'Roboto', ${SYSTEM_FONT}`,
};

// =============================================================================
// COLOR HELPERS
// =============================================================================

// Pure color math: hex ↔ rgb, darkening, and mixing.
// Used to derive hover, muted-text, border, and input-bg colors from primaryColor.

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

// Returns a darkened version of `hex` by `amount` (0–1).
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// Blends hex1 toward hex2 by `pct` (0 = hex1, 1 = hex2).
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
// GRID HELPERS
// =============================================================================

// Maps option count to Tailwind grid classes.
// Breakpoint @[660px] used because Tailwind v4 @lg = 512px (too small for 4+ cards).
//
//   2 → 1×2  |  3 → 1×3  |  4 → 2×2 → 1×4  |  5 → 2+3 → 1×5  |  6 → 2×3 → 3×2

function getOptionsGridClasses(count: number): string {
  switch (count) {
    case 2:  return "grid-cols-2 max-w-[360px]";
    case 3:  return "grid-cols-3 max-w-[520px]";
    case 4:  return "grid-cols-2 @[660px]:grid-cols-4";
    case 5:  return "grid-cols-6 @[660px]:grid-cols-5";
    case 6:  return "grid-cols-2 @[660px]:grid-cols-3";
    default: return "grid-cols-2 @[660px]:grid-cols-4";
  }
}

// For 5 options: first 2 span 3 cols (row of 2), last 3 span 2 cols (row of 3).
// Above @[660px] all items are equal width (col-span-1).
function getOptionColSpanClasses(count: number, idx: number): string {
  if (count !== 5) return "";
  return idx < 2
    ? "col-span-3 @[660px]:col-span-1"
    : "col-span-2 @[660px]:col-span-1";
}

// =============================================================================
// VALIDATION
// =============================================================================

// Validates a single contact field. Returns an error message or "" if valid.
// Rules: anrede must be selected; name must be non-empty after trim; email must
// match basic format; telefon must start with 0/+, use only allowed chars, and have ≥7 digits.
function validateField(field: keyof ContactData, value: string): string {
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
      const onlyAllowed     = /^[+\d\s\-()\/]+$/.test(value);
      const digitCount      = (value.match(/\d/g) ?? []).length;
      const startsCorrectly = /^[0+]/.test(value.trim());
      return !onlyAllowed || digitCount < 7 || !startsCorrectly
        ? "Bitte geben Sie eine gültige Telefonnummer ein."
        : "";
    }

    default:
      return "";
  }
}

// =============================================================================
// COMPONENT
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

  // ---------------------------------------------------------------------------
  // Theme resolution
  // Overrides are merged with defaults; hover/muted/border variants are derived
  // automatically via color math so no manual secondary colors are needed.
  // ---------------------------------------------------------------------------

  const primaryColor        = themeOverrides?.primaryColor        ?? THEME_DEFAULTS.primaryColor;
  const textColor           = themeOverrides?.textColor           ?? THEME_DEFAULTS.textColor;
  const backgroundColor     = themeOverrides?.backgroundColor     ?? THEME_DEFAULTS.backgroundColor;
  const pageBackgroundColor = themeOverrides?.pageBackgroundColor ?? THEME_DEFAULTS.pageBackgroundColor;
  const borderRadius        = themeOverrides?.borderRadius        ?? THEME_DEFAULTS.borderRadius;
  const maxWidth            = themeOverrides?.maxWidth            ?? THEME_DEFAULTS.maxWidth;
  const font            = themeOverrides?.font                ?? THEME_DEFAULTS.font;

  const theme = {
    primaryColor,
    primaryColorHover: darken(primaryColor, 0.12),
    textColor,
    textColorMuted:    mix(backgroundColor, textColor, 0.55),
    backgroundColor,
    borderColor:       mix(backgroundColor, textColor, 0.12),
    inputBgColor:      mix(backgroundColor, textColor, 0.03),
    borderRadius,
    maxWidth,
    fontFamily:        FONT_STACKS[font],
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const containerRef     = useRef<HTMLDivElement>(null);
  const visibleQuestions = questions.filter((q) => q.visible);

  const [currentStep, setCurrentStep] = useState(0);

  // Answers keyed by question ID. Pre-populated with defaultValue if set on the question.
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    visibleQuestions.forEach((q) => {
      if (q.defaultValue) initial[q.id] = q.defaultValue;
    });
    return initial;
  });

  const [contactData, setContactData] = useState<ContactData>({
    anrede: "", name: "", telefon: "", email: "",
  });

  const [isSubmitted,    setIsSubmitted]    = useState(false);
  const [errors,         setErrors]         = useState({ anrede: "", name: "", telefon: "", email: "" });
  const [honeypot,       setHoneypot]       = useState("");
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const totalSteps      = visibleQuestions.length + 1; // +1 for the contact form
  const isContactStep   = currentStep === visibleQuestions.length;
  const progress        = ((currentStep + 1) / totalSteps) * 100;
  const currentQuestion = visibleQuestions[currentStep];

  // Recalculated on every keystroke to drive the submit button opacity/cursor.
  const isValid =
    !validateField("anrede",  contactData.anrede)  &&
    !validateField("name",    contactData.name)     &&
    !validateField("email",   contactData.email)    &&
    !validateField("telefon", contactData.telefon);

  // single_choice auto-advances on click; all other types need an explicit Weiter button.
  const isChoiceType     = !isContactStep && currentQuestion?.questionType === "single_choice";
  const showWeiterButton = !isContactStep && !isChoiceType;

  const currentAnswer      = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";
  const isQuestionRequired = (currentQuestion?.config as TextConfig)?.required !== false;

  // Weiter is disabled when the current field is required and still empty.
  const isWeiterDisabled =
    showWeiterButton &&
    currentQuestion?.questionType !== "slider" &&
    isQuestionRequired &&
    !currentAnswer.trim();

  // Slider config and current value — null when the current question is not a slider.
  const sliderConfig =
    currentQuestion?.questionType === "slider"
      ? (currentQuestion.config as SliderConfig)
      : null;
  const sliderVal = sliderConfig
    ? Number(answers[currentQuestion!.id] ?? sliderConfig.default ?? sliderConfig.min)
    : 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  // Single-choice: sets answer, then advances after 325ms so the selected color
  // is briefly visible before the step transition fires.
  const handleSelect = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setTimeout(() => {
        if (currentStep < visibleQuestions.length) {
          setCurrentStep((prev) => prev + 1);
        }
      }, 325);
    },
    [currentStep, visibleQuestions.length],
  );

  // Goes back one step. The zurück button is disabled at step 0.
  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  // Advances to the next step. Used by the Weiter button on non-choice question types.
  const handleNext = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  // Multiple-choice: toggles `value` in/out of the comma-separated answer string for `questionId`.
  const handleToggleMultiple = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => {
        const current = prev[questionId]?.split(",").filter(Boolean) ?? [];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [questionId]: updated.join(",") };
      });
    },
    [],
  );

  // Contact form submit: validates all fields, sets error state, calls handleSubmit on success.
  const handleFormSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setHasTriedSubmit(true);
    const newErrors = {
      anrede:  validateField("anrede",  contactData.anrede),
      name:    validateField("name",    contactData.name),
      telefon: validateField("telefon", contactData.telefon),
      email:   validateField("email",   contactData.email),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).every((err) => !err)) {
      handleSubmit();
    }
  };

  // Fires the onSubmit prop with current answers + contact data, then shows the success screen.
  const handleSubmit = () => {
    setIsSubmitted(true);
    onSubmit?.({ answers, contact: contactData, honeypot });
  };

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Sends the widget height to the parent frame after every layout change via postMessage.
  // The ResizeObserver re-fires automatically on step transitions and after fonts load.
  // Only active when the widget is embedded in an iframe (window.parent !== window).
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

  // ---------------------------------------------------------------------------
  // CSS custom properties — set on the card element, consumed by child styles
  // ---------------------------------------------------------------------------

  const cssVars = {
    "--funnel-primary":       theme.primaryColor,
    "--funnel-primary-hover": theme.primaryColorHover,
    "--funnel-text":          theme.textColor,
    "--funnel-text-muted":    theme.textColorMuted,
    "--funnel-bg":            theme.backgroundColor,
    "--funnel-border":        theme.borderColor,
    "--funnel-input-bg":      theme.inputBgColor,
    "--funnel-radius":        theme.borderRadius,
  } as React.CSSProperties;

  // ---------------------------------------------------------------------------
  // Render — Success screen (shown after submit)
  // ---------------------------------------------------------------------------

  if (isSubmitted) {
    return (
      <div
        ref={containerRef}
        style={{
          backgroundColor: pageBackgroundColor,
          width: "100%",
          paddingTop: `${SHADOW_PADDING.top}px`,
          paddingBottom: `${SHADOW_PADDING.bottom}px`,
        }}
      >
        <div
          className="mx-auto overflow-hidden"
          style={{
            ...cssVars,
            maxWidth:        theme.maxWidth,
            backgroundColor: theme.backgroundColor,
            fontFamily:      theme.fontFamily,
            borderRadius:    theme.borderRadius,
            boxShadow:       CARD_SHADOW_STRING,
          }}
        >
          {/* Header banner */}
          <div className="px-8 py-5" style={{ backgroundColor: theme.primaryColor }}>
            <p className="text-white font-bold text-base m-0">{companyName}</p>
          </div>

          {/* Checkmark + success message */}
          <div className="p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: `${theme.primaryColor}20` }}
            >
              <svg className="w-8 h-8" fill="none" stroke={theme.primaryColor} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold mb-2 leading-snug" style={{ color: theme.textColor }}>
              {funnel.successMessage}
            </h2>
            <p className="text-sm mb-6" style={{ color: theme.textColorMuted }}>
              Wir melden uns {funnel.responseTimeText} bei Ihnen.
            </p>

            {/* Summary of answers */}
            <div
              className="rounded-lg text-left text-sm p-4"
              style={{ backgroundColor: theme.inputBgColor, borderLeft: `4px solid ${theme.primaryColor}` }}
            >
              <p className="font-semibold mb-3" style={{ color: theme.textColor }}>
                Ihre Angaben im Überblick:
              </p>
              {visibleQuestions.map((q) => {
                const display = resolveAnswer(q, answers);
                if (!display) return null;
                return (
                  <p key={q.id} className="mb-1" style={{ color: theme.textColorMuted }}>
                    {q.title.replace("?", "")}:{" "}
                    <span style={{ color: theme.textColor, fontWeight: 500 }}>{display}</span>
                  </p>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-8 py-4 border-t text-xs"
            style={{ backgroundColor: theme.inputBgColor, borderColor: theme.borderColor, color: theme.textColorMuted }}
          >
            <p className="m-0">{companyName} · {publicEmail}</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — Funnel (question steps + contact form)
  // ---------------------------------------------------------------------------

  const optionCount = currentQuestion?.options.length ?? 0;
  const gridClasses = getOptionsGridClasses(optionCount);

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: pageBackgroundColor,
        width: "100%",
        paddingTop: `${SHADOW_PADDING.top}px`,
        paddingBottom: `${SHADOW_PADDING.bottom}px`,
      }}
    >
      <div
        lang="de"
        className="@container mx-auto w-full"
        style={{
          ...cssVars,
          maxWidth:        theme.maxWidth,
          backgroundColor: theme.backgroundColor,
          fontFamily:      theme.fontFamily,
          borderRadius:    theme.borderRadius,
          overflow:        "hidden",
          boxShadow:       CARD_SHADOW_STRING,
        }}
      >
        <div className="p-4 @md:p-8">
          <div key={currentStep} className="funnel-step-enter">

            {/* --------------------------------------------------------------
                Question step
            -------------------------------------------------------------- */}
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

                {/* single_choice / multiple_choice */}
                {(currentQuestion.questionType === "single_choice" ||
                  currentQuestion.questionType === "multiple_choice") && (
                  <div className="flex items-center justify-center mb-3">
                    <div className={cn("grid gap-3 w-full", gridClasses)}>
                      {currentQuestion.options.map((option, idx) => {
                        const isMultiple     = currentQuestion.questionType === "multiple_choice";
                        const selectedValues = answers[currentQuestion.id]?.split(",").filter(Boolean) ?? [];
                        const isSelected     = isMultiple
                          ? selectedValues.includes(option.value)
                          : answers[currentQuestion.id] === option.value;
                        const colSpan = getOptionColSpanClasses(optionCount, idx);

                        return (
                          <button
                            key={option.value}
                            onClick={() =>
                              isMultiple
                                ? handleToggleMultiple(currentQuestion.id, option.value)
                                : handleSelect(currentQuestion.id, option.value)
                            }
                            className={cn(
                              "flex flex-col items-center justify-center min-h-24 p-4 transition-all duration-200 cursor-pointer",
                              colSpan,
                            )}
                            style={{
                              borderRadius:    theme.borderRadius,
                              backgroundColor: isSelected ? theme.primaryColor : theme.backgroundColor,
                              border:          `2px solid ${isSelected ? theme.primaryColor : "transparent"}`,
                              boxShadow:       isSelected ? `0 4px 16px ${theme.primaryColor}40` : "0 2px 8px rgba(0,0,0,0.08)",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.border     = `2px solid ${theme.primaryColor}`;
                                e.currentTarget.style.boxShadow  = "0 8px 24px rgba(0,0,0,0.14)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.border     = "2px solid transparent";
                                e.currentTarget.style.boxShadow  = "0 2px 8px rgba(0,0,0,0.08)";
                              }
                            }}
                          >
                            <div className="mb-3 shrink-0">
                              {renderIcon(
                                option.iconKey,
                                option.iconUrl,
                                isSelected ? "#ffffff" : theme.primaryColor,
                                44,
                              )}
                            </div>
                            <span
                              className="text-xs font-medium text-center leading-tight px-1"
                              style={{ color: isSelected ? "#ffffff" : theme.textColor }}
                            >
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* slider */}
                {currentQuestion.questionType === "slider" && sliderConfig && (
                  <div className="mb-6">
                    <p className="text-center text-3xl font-bold mb-6" style={{ color: theme.primaryColor }}>
                      {sliderVal.toLocaleString("de-DE")} {sliderConfig.unit}
                    </p>

                    <input
                      type="range"
                      min={sliderConfig.min}
                      max={sliderConfig.max}
                      step={sliderConfig.step ?? 1}
                      value={sliderVal}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                      }
                      className="funnel-slider"
                    />

                    <div className="flex justify-between text-xs mt-1 mb-5" style={{ color: theme.textColorMuted }}>
                      <span>{sliderConfig.min.toLocaleString("de-DE")} {sliderConfig.unit}</span>
                      <span>{sliderConfig.max.toLocaleString("de-DE")} {sliderConfig.unit}</span>
                    </div>

                    {/* Manual number input, synced with the slider */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm shrink-0" style={{ color: theme.textColorMuted }}>
                        Alternativ eintippen:
                      </span>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={sliderVal}
                          min={sliderConfig.min}
                          max={sliderConfig.max}
                          step={sliderConfig.step ?? 1}
                          onChange={(e) => {
                            const clamped = Math.min(
                              sliderConfig.max,
                              Math.max(sliderConfig.min, Number(e.target.value) || sliderConfig.min),
                            );
                            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: String(clamped) }));
                          }}
                          className="w-full px-4 py-2.5 border outline-none text-center"
                          style={{
                            borderColor:     theme.borderColor,
                            backgroundColor: theme.backgroundColor,
                            color:           theme.textColor,
                            borderRadius:    "9999px",
                            paddingRight:    "3.5rem",
                          }}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-12 text-white text-sm font-bold"
                          style={{ backgroundColor: theme.primaryColor, borderRadius: "0 9999px 9999px 0" }}
                        >
                          {sliderConfig.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* long_text */}
                {currentQuestion.questionType === "long_text" && (
                  <div className="mb-3">
                    <textarea
                      value={answers[currentQuestion.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                      }
                      placeholder={(currentQuestion.config as TextConfig).placeholder ?? ""}
                      maxLength={(currentQuestion.config as TextConfig).maxLength}
                      rows={4}
                      className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base resize-none"
                      style={{
                        borderColor:     theme.borderColor,
                        backgroundColor: theme.inputBgColor,
                        color:           theme.textColor,
                        borderRadius:    theme.borderRadius,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor     = theme.primaryColor;
                        e.currentTarget.style.backgroundColor = theme.backgroundColor;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor     = theme.borderColor;
                        e.currentTarget.style.backgroundColor = theme.inputBgColor;
                      }}
                    />
                  </div>
                )}

                {/* short_text */}
                {currentQuestion.questionType === "short_text" && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={answers[currentQuestion.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                      }
                      placeholder={(currentQuestion.config as TextConfig).placeholder ?? ""}
                      maxLength={(currentQuestion.config as TextConfig).maxLength}
                      className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base"
                      style={{
                        borderColor:     theme.borderColor,
                        backgroundColor: theme.inputBgColor,
                        color:           theme.textColor,
                        borderRadius:    theme.borderRadius,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor     = theme.primaryColor;
                        e.currentTarget.style.backgroundColor = theme.backgroundColor;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor     = theme.borderColor;
                        e.currentTarget.style.backgroundColor = theme.inputBgColor;
                      }}
                    />
                  </div>
                )}
              </div>

            ) : (

              /* --------------------------------------------------------------
                  Contact form (last step)
              -------------------------------------------------------------- */
              <form onSubmit={handleFormSubmit}>
                <h1
                  className="text-lg md:text-xl lg:text-2xl font-bold mb-2 leading-tight"
                  style={{ color: theme.textColor }}
                >
                  {funnel.title}
                </h1>
                <p className="font-semibold mb-4" style={{ color: theme.primaryColor }}>
                  {funnel.contactFormSubtitle}
                </p>

                {/* Honeypot — invisible to humans, filled by bots → rejected server-side */}
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
                      <label key={anrede} className="flex items-center gap-2 cursor-pointer min-h-11">
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                          style={{ borderColor: contactData.anrede === anrede ? theme.primaryColor : theme.borderColor }}
                        >
                          {contactData.anrede === anrede && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                          )}
                        </div>
                        <span style={{ color: theme.textColor }}>{anrede}</span>
                        <input
                          type="radio"
                          name="anrede"
                          value={anrede}
                          checked={contactData.anrede === anrede}
                          onChange={(e) => {
                            setContactData((prev) => ({ ...prev, anrede: e.target.value }));
                            setErrors((prev) => ({ ...prev, anrede: "" }));
                          }}
                          className="sr-only"
                        />
                      </label>
                    ))}
                  </div>
                  {errors.anrede && (
                    <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.anrede}</p>
                  )}
                </div>

                {/* Name, Telefon, E-Mail */}
                <div className="space-y-3 mb-4">

                  {/* Name */}
                  <div>
                    <input
                      type="text"
                      placeholder="Vor- und Nachname"
                      value={contactData.name}
                      onChange={(e) => setContactData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base"
                      style={{
                        borderColor:     errors.name ? "#ef4444" : theme.borderColor,
                        backgroundColor: theme.inputBgColor,
                        color:           theme.textColor,
                        borderRadius:    theme.borderRadius,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor     = theme.primaryColor;
                        e.currentTarget.style.backgroundColor = theme.backgroundColor;
                      }}
                      onBlur={(e) => {
                        if (hasTriedSubmit) {
                          const error = validateField("name", e.currentTarget.value);
                          setErrors((prev) => ({ ...prev, name: error }));
                          e.currentTarget.style.borderColor = error ? "#ef4444" : theme.borderColor;
                        } else {
                          e.currentTarget.style.borderColor = theme.borderColor;
                        }
                        e.currentTarget.style.backgroundColor = theme.inputBgColor;
                      }}
                    />
                    {errors.name && (
                      <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.name}</p>
                    )}
                  </div>

                  {/* Telefon */}
                  <div>
                    <input
                      type="tel"
                      placeholder="Telefonnummer"
                      value={contactData.telefon}
                      onChange={(e) => setContactData((prev) => ({ ...prev, telefon: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base"
                      style={{
                        borderColor:     errors.telefon ? "#ef4444" : theme.borderColor,
                        backgroundColor: theme.inputBgColor,
                        color:           theme.textColor,
                        borderRadius:    theme.borderRadius,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor     = theme.primaryColor;
                        e.currentTarget.style.backgroundColor = theme.backgroundColor;
                      }}
                      onBlur={(e) => {
                        if (hasTriedSubmit) {
                          const error = validateField("telefon", e.currentTarget.value);
                          setErrors((prev) => ({ ...prev, telefon: error }));
                          e.currentTarget.style.borderColor = error ? "#ef4444" : theme.borderColor;
                        } else {
                          e.currentTarget.style.borderColor = theme.borderColor;
                        }
                        e.currentTarget.style.backgroundColor = theme.inputBgColor;
                      }}
                    />
                    {errors.telefon && (
                      <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.telefon}</p>
                    )}
                  </div>

                  {/* E-Mail */}
                  <div>
                    <input
                      type="email"
                      placeholder="E-Mail"
                      value={contactData.email}
                      onChange={(e) => setContactData((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base"
                      style={{
                        borderColor:     errors.email ? "#ef4444" : theme.borderColor,
                        backgroundColor: theme.inputBgColor,
                        color:           theme.textColor,
                        borderRadius:    theme.borderRadius,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor     = theme.primaryColor;
                        e.currentTarget.style.backgroundColor = theme.backgroundColor;
                      }}
                      onBlur={(e) => {
                        if (hasTriedSubmit) {
                          const error = validateField("email", e.currentTarget.value);
                          setErrors((prev) => ({ ...prev, email: error }));
                          e.currentTarget.style.borderColor = error ? "#ef4444" : theme.borderColor;
                        } else {
                          e.currentTarget.style.borderColor = theme.borderColor;
                        }
                        e.currentTarget.style.backgroundColor = theme.inputBgColor;
                      }}
                    />
                    {errors.email && (
                      <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Privacy notice */}
                <p className="text-xs mb-4 leading-relaxed" style={{ color: theme.textColorMuted }}>
                  Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden
                  {funnel.privacyPolicyUrl ? (
                    <>
                      {" "}(siehe{" "}
                      <a
                        href={
                          funnel.privacyPolicyUrl.startsWith("http")
                            ? funnel.privacyPolicyUrl
                            : `https://${funnel.privacyPolicyUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: theme.primaryColor }}
                        className="underline"
                      >
                        Datenschutzhinweise
                      </a>
                      )
                    </>
                  ) : null}
                  . Widerruf jederzeit möglich.
                </p>

                {/* Submit button */}
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 w-full text-white px-5 py-3 rounded-lg font-semibold transition-colors"
                  style={{
                    backgroundColor: theme.primaryColor,
                    borderRadius:    theme.borderRadius,
                    cursor:          isValid ? "pointer" : "not-allowed",
                    opacity:         isValid ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (isValid) e.currentTarget.style.backgroundColor = theme.primaryColorHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.primaryColor;
                  }}
                >
                  <span className="text-sm sm:text-base">{funnel.submitButtonLabel}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            )}
          </div>

          {/* Progress bar + navigation */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: theme.borderColor }}>

            <div className="h-2.5 rounded-full mb-5 overflow-hidden" style={{ backgroundColor: theme.inputBgColor }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: theme.primaryColor }}
              />
            </div>

            <div className="flex items-center justify-between">

              {/* Zurück */}
              <button
                onClick={handleBack}
                disabled={currentStep === 0}
                suppressHydrationWarning
                className="flex items-center gap-2 text-sm transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
                style={{ color: theme.textColorMuted }}
                onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.color = theme.textColor; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.textColorMuted; }}
              >
                <ArrowLeft size={16} strokeWidth={1.5} />
                zurück
              </button>

              {/* Weiter — only shown for non-choice question types */}
              {showWeiterButton && (
                <button
                  onClick={handleNext}
                  disabled={isWeiterDisabled}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = theme.primaryColorHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.primaryColor; }}
                >
                  Weiter
                  <ArrowRight size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
