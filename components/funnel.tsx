"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderIcon } from "@/components/icons";
import { resolveAnswer } from "@/lib/resolveAnswer";
import { validateContactField } from "@/lib/validateContactField";
import type {
  FunnelTheme,
  FunnelFont,
  FunnelConfig,
  QuestionConfig,
  TextConfig,
  SliderConfig,
  ContactFieldConfig,
} from "@/types";

// =============================================================================
// CONSTANTS
// =============================================================================

// Multi-layer shadow: strong bottom offset + soft ambient glow.
// SHADOW_PADDING reserves space around the card so the shadow isn't clipped.
const CARD_SHADOW_LAYERS = [
  { offsetY: 0, blur: 16, spread: -4,  alpha: 0.10 },
  { offsetY: 10, blur: 32, spread: -10, alpha: 0.18 },
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
    case 5:  return "grid-cols-2 @[660px]:grid-cols-5";
    case 6:  return "grid-cols-2 @[660px]:grid-cols-3";
    default: return "grid-cols-2 @[660px]:grid-cols-4";
  }
}

// For 5 options: last card spans both columns on mobile so all cards share equal width.
// Above @[660px] all items are equal width (col-span-1).
function getOptionColSpanClasses(count: number, idx: number): string {
  if (count !== 5) return "";
  return idx === 4 ? "col-span-2 max-w-[calc(50%-6px)] mx-auto @[660px]:col-span-1 @[660px]:max-w-none" : "";
}

// =============================================================================
// FOOTER HELPER
// =============================================================================

// Ersetzt {{company_name}}, {{public_email}}, {{public_phone}} im Template.
// Segmente die nach der Ersetzung leer sind, werden samt ihrem " · " Trennzeichen
// entfernt, so dass z.B. ein fehlendes phone keine doppelten Punkte hinterlässt.
function resolveFooterText(
  template: string,
  vars: { company_name: string; public_email: string; public_phone: string },
): string {
  const replaced = template.replace(
    /\{\{(company_name|public_email|public_phone)\}\}/g,
    (_, key) => vars[key as keyof typeof vars] ?? "",
  );
  return replaced
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");
}

// =============================================================================
// COMPONENT
// =============================================================================

interface FunnelProps {
  theme?: Partial<FunnelTheme>;
  funnel: FunnelConfig;
  questions: QuestionConfig[];
  contactFields: ContactFieldConfig[];
  companyName?: string;
  publicEmail?: string;
  publicPhone?: string;
  initialSubmitted?: boolean;
  initialStep?: number;
  previewHighlight?: string; // Editor-only: hebt das gerade bearbeitete Element hervor
  initialAnswers?: Record<string, string>; // Editor-only: Platzhalter-Antworten für Erfolgsseiten-Preview
  onSubmit?: (data: {
    answers: Record<string, string>;
    contact: Record<string, string>;
    honeypot: string;
  }) => void;
}

export function Funnel({
  theme: themeOverrides,
  funnel,
  questions,
  contactFields,
  companyName,
  publicEmail,
  publicPhone,
  initialSubmitted,
  initialStep,
  previewHighlight,
  initialAnswers,
  onSubmit,
}: FunnelProps) {

  // Gibt einen blauen Outline-Style zurück wenn das Element gerade im Editor fokussiert ist.
  // Nur aktiv wenn previewHighlight gesetzt ist (d.h. im Editor-Kontext).
  const hl = (key: string): React.CSSProperties =>
    previewHighlight === key
      ? { outline: "2px solid #3b82f6", outlineOffset: "3px", borderRadius: "4px" }
      : {};

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
  const font                = themeOverrides?.font                ?? THEME_DEFAULTS.font;

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
  // Derived contact field config
  // Nur sichtbare Felder, sortiert nach sort_order.
  // ---------------------------------------------------------------------------

  const visibleContactFields = contactFields
    .filter((f) => f.visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const containerRef     = useRef<HTMLDivElement>(null);
  const visibleQuestions = questions.filter((q) => q.visible);

  const [currentStep, setCurrentStep] = useState(initialStep ?? 0);

  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});

  // Kontaktdaten als freies Record — Keys entsprechen ContactFieldConfig.key.
  const [contactData, setContactData] = useState<Record<string, string>>({});

  const [isSubmitted,    setIsSubmitted]    = useState(initialSubmitted ?? false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [honeypot,       setHoneypot]       = useState("");
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const totalSteps      = visibleQuestions.length + 1; // +1 for the contact form
  const isContactStep   = currentStep === visibleQuestions.length;
  const progress        = ((currentStep + 1) / totalSteps) * 100;
  const currentQuestion = visibleQuestions[currentStep];

  // Alle sichtbaren Pflichtfelder müssen einen gültigen Wert haben.
  const isValid = visibleContactFields
    .filter((f) => f.required)
    .every((f) => !validateContactField(f, contactData[f.key] ?? ""));

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

  // Footer-Text mit aufgelösten Template-Variablen.
  const resolvedFooter = resolveFooterText(funnel.footerText, {
    company_name: companyName ?? "",
    public_email: publicEmail ?? "",
    public_phone: publicPhone ?? "",
  });

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

  // Setzt den Wert eines Kontaktfelds und löscht seinen Fehler.
  const handleContactChange = useCallback((key: string, value: string) => {
    setContactData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  // Contact form submit: validates all visible fields, sets error state, calls handleSubmit on success.
  const handleFormSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setHasTriedSubmit(true);
    const newErrors: Record<string, string> = {};
    visibleContactFields.forEach((f) => {
      const err = validateContactField(f, contactData[f.key] ?? "");
      if (err) newErrors[f.key] = err;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
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
          paddingTop:    `${SHADOW_PADDING.top}px`,
          paddingBottom: `${SHADOW_PADDING.bottom}px`,
          paddingLeft:   `${SHADOW_PADDING.sides}px`,
          paddingRight:  `${SHADOW_PADDING.sides}px`,
          overflowX: "hidden",
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

            <h2 className="text-2xl font-bold mb-2 leading-snug" style={{ color: theme.textColor, ...hl("success_message") }}>
              {funnel.successMessage}
            </h2>
            <p className="text-sm mb-6" style={{ color: theme.textColorMuted, ...hl("response_message") }}>
              {funnel.responseMessage}
            </p>

            {/* Summary of answers */}
            <div
              className="rounded-lg text-left text-sm p-4"
              style={{ backgroundColor: theme.inputBgColor, borderLeft: `4px solid ${theme.primaryColor}` }}
            >
              <p className="font-semibold mb-3" style={{ color: theme.textColor, ...hl("answers_overview_label") }}>
                {funnel.answersOverviewLabel}
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
            <p className="m-0">{resolvedFooter}</p>
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
        paddingTop:    `${SHADOW_PADDING.top}px`,
        paddingBottom: `${SHADOW_PADDING.bottom}px`,
        paddingLeft:   `${SHADOW_PADDING.sides}px`,
        paddingRight:  `${SHADOW_PADDING.sides}px`,
        overflowX: "hidden",
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
                    className="text-lg @md:text-xl @lg:text-2xl font-bold leading-tight text-center text-balance"
                    style={{ color: theme.textColor, ...hl("question_title") }}
                  >
                    {currentQuestion.title}
                  </h1>
                  {currentQuestion.subtitle && (
                    <p
                      className="mt-2 text-sm @md:text-base leading-relaxed text-center"
                      style={{ color: theme.textColorMuted, ...hl("question_subtitle") }}
                    >
                      {currentQuestion.subtitle}
                    </p>
                  )}
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
                              "relative flex flex-col items-center justify-center min-h-24 p-4 cursor-pointer outline-none",
                              "transition-all duration-300 active:scale-90 active:duration-200 sm:hover:scale-105",
                              colSpan,
                            )}
                            style={{
                              borderRadius:    theme.borderRadius,
                              backgroundColor: theme.primaryColor,
                              border:          "2px solid transparent",
                              boxShadow:       "0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
                              ...hl(`option_${idx}`),
                            }}
                          >
                            {/* Checkmark — nur bei multiple_choice + selected */}
                            {isMultiple && isSelected && (
                              <div
                                className="absolute top-2 right-2 z-30 w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "#ffffff" }}
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path
                                    d="M2 6l3 3 5-5"
                                    stroke={theme.primaryColor}
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            )}

                            <div className="mb-3 shrink-0 relative z-20">
                              {renderIcon(
                                option.iconKey,
                                option.iconUrl,
                                "#ffffff",
                                44,
                              )}
                            </div>
                            <span
                              className="text-xs font-medium text-center leading-tight px-1 relative z-20"
                              style={{ color: "#ffffff" }}
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

                    <div className="flex justify-between text-xs mt-1" style={{ color: theme.textColorMuted }}>
                      <span>{sliderConfig.min.toLocaleString("de-DE")} {sliderConfig.unit}</span>
                      <span>{sliderConfig.max.toLocaleString("de-DE")} {sliderConfig.unit}</span>
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
                      placeholder={`${(currentQuestion.config as TextConfig).placeholder ?? ""}${(currentQuestion.config as TextConfig).required === false ? " (optional)" : ""}`}
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
                      placeholder={`${(currentQuestion.config as TextConfig).placeholder ?? ""}${(currentQuestion.config as TextConfig).required === false ? " (optional)" : ""}`}
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
                  Contact form (last step) — dynamisch aus contactFields
              -------------------------------------------------------------- */
              <form onSubmit={handleFormSubmit}>
                <h1
                  className="text-lg @md:text-xl @lg:text-2xl font-bold mb-2 leading-tight"
                  style={{ color: theme.textColor, ...hl("contact_form_title") }}
                >
                  {funnel.title}
                </h1>
                <p className="font-semibold mb-4" style={{ color: theme.primaryColor, ...hl("contact_form_subtitle") }}>
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

                {/* Dynamische Felder aus contact_fields DB-Config */}
                <div className="space-y-4 mb-4">
                  {visibleContactFields.map((field) => {

                    // --- Radio (z.B. Anrede) ---
                    if (field.type === "radio" && field.options) {
                      return (
                        <div key={field.key}>
                          <div className="flex gap-5">
                            {field.options.map((option) => (
                              <label key={option} className="flex items-center gap-2 cursor-pointer min-h-11">
                                <div
                                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                                  style={{ borderColor: contactData[field.key] === option ? theme.primaryColor : theme.borderColor }}
                                >
                                  {contactData[field.key] === option && (
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                                  )}
                                </div>
                                <span style={{ color: theme.textColor }}>{option}</span>
                                <input
                                  type="radio"
                                  name={field.key}
                                  value={option}
                                  checked={contactData[field.key] === option}
                                  onChange={(e) => handleContactChange(field.key, e.target.value)}
                                  className="sr-only"
                                />
                              </label>
                            ))}
                          </div>
                          {errors[field.key] && (
                            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>
                          )}
                        </div>
                      );
                    }

                    // --- Text / Email / Tel ---
                    return (
                      <div key={field.key}>
                        <input
                          type={field.type === "plz" ? "text" : field.type}
                          placeholder={`${field.placeholder ?? field.label}${!field.required ? " (optional)" : ""}`}
                          value={contactData[field.key] ?? ""}
                          onChange={(e) => handleContactChange(field.key, e.target.value)}
                          className="w-full px-4 py-3 border rounded-lg transition-colors outline-none text-base"
                          style={{
                            borderColor:     errors[field.key] ? "#ef4444" : theme.borderColor,
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
                              const err = validateContactField(field, e.currentTarget.value);
                              setErrors((prev) => ({ ...prev, [field.key]: err }));
                              e.currentTarget.style.borderColor = err ? "#ef4444" : theme.borderColor;
                            } else {
                              e.currentTarget.style.borderColor = theme.borderColor;
                            }
                            e.currentTarget.style.backgroundColor = theme.inputBgColor;
                          }}
                        />
                        {errors[field.key] && (
                          <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Privacy notice */}
                <p className="text-xs mb-4 leading-relaxed" style={{ color: theme.textColorMuted, ...hl("privacy_text") }}>
                  {funnel.privacyText}
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
                    opacity:         isValid ? 1 : 0.65,
                    ...hl("submit_button"),
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

            <div className="h-2 rounded-full mb-5 overflow-hidden" style={{ backgroundColor: mix(theme.backgroundColor, theme.textColor, 0.08) }}>
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
