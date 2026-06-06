"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Check, GripVertical, Plus, Trash2, Copy } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

// Lazy-loaded Inline-Kalender — Bundle wird nur geladen wenn der Funnel ein date-Feld hat.
// ~30KB (react-day-picker + date-fns) bleiben aus dem Initial-Bundle.
const DateInlinePicker = dynamic(() => import("./funnel/DateInlinePicker"), {
  ssr: false,
  loading: () => <div className="mb-3 h-80 w-full max-w-80 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />,
});
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { resolveAnswer } from "@/lib/resolveAnswer";
import { validateContactField } from "@/lib/validateContactField";
import type {
  FunnelTheme,
  FunnelFont,
  FunnelConfig,
  QuestionConfig,
  TextConfig,
  SliderConfig,
  DateConfig,
  NumberConfig,
  CheckboxConfig,
  ContactFieldConfig,
  OptionMarker,
} from "@/types";

// Aufgabe 50: Marker-String einer Antwort-Option je nach Stil. null = kein Chip rendern.
function optionMarkerFor(marker: OptionMarker | undefined, idx: number): string | null {
  if (marker === "none") return null;
  if (marker === "numbers") return String(idx + 1);
  return String.fromCharCode(65 + idx); // 'letters' (Default)
}

// Aufgabe 51: einfacher Markdown-Link-Parser für Consent-Texte. `[Text](https://…)` wird zu einem
// klickbaren <a> in Brand-Farbe. stopPropagation, damit der Link-Klick nicht die umgebende Checkbox togglet.
function renderLabelWithLinks(text: string, linkColor: string): React.ReactNode {
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push(
      <a
        key={key++}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ color: linkColor, textDecoration: "underline" }}
      >
        {m[1]}
      </a>,
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

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
// FOOTER HELPER
// =============================================================================


// =============================================================================
// SLIDE-ANIMATION-VARIANTS (Typeform-Stil) — Spring-Slide auf Y-Achse
// =============================================================================

const STEP_SLIDE_VARIANTS: Variants = {
  enter: (direction: number) => ({ y: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (direction: number) => ({ y: direction > 0 ? -80 : 80, opacity: 0 }),
};
const STEP_SLIDE_TRANSITION = { type: "spring" as const, stiffness: 300, damping: 30 };

// =============================================================================
// COMPONENT
// =============================================================================

interface FunnelProps {
  theme?: Partial<FunnelTheme>;
  funnel: FunnelConfig;
  questions: QuestionConfig[];
  contactFields: ContactFieldConfig[];
  initialSubmitted?: boolean;
  initialStep?: number;
  previewHighlight?: string; // Editor-only: hebt das gerade bearbeitete Element hervor
  initialAnswers?: Record<string, string>; // Editor-only: Platzhalter-Antworten für Erfolgsseiten-Preview
  onFieldClick?: (field: string, questionVisibleIndex?: number) => void; // Editor-only: Klick im Preview → Sidebar-Feld fokussieren
  onStepChange?: (mode: "question" | "contact" | "success", index: number) => void; // Editor-only: Test-Modus reflektiert den aktuellen Schritt in der Step-Navigation
  // C.1c WYSIWYG-Edit: Wenn editMode=true werden inline-editierbare Texte zu contentEditable,
  // und alle Step-Advance-Handler werden short-circuited (kein Weiterspringen bei Klick auf Option).
  editMode?: boolean;
  onTextChange?: (fieldRef: string, newText: string) => void; // Editor-only: Inline-Edit committed → State-Update durchreichen
  // Editor-only Canvas-Aktionen für Choice-Options (single_choice / multi_choice). Alle beziehen sich auf die aktuell sichtbare Frage.
  onAddOption?: () => void;
  onReorderOptions?: (fromIdx: number, toIdx: number) => void;
  onDuplicateOption?: (idx: number) => void;
  onDeleteOption?: (idx: number) => void;
  // Partial-Submissions: feuert (debounced) wenn answers oder contactData sich ändern.
  // Live-Mode: TenantFunnelClient POSTet das an /api/track-progress.
  // Editor-Mode: undefined → kein Tracking.
  onAnswersChange?: (data: { answers: Record<string, string>; contact: Record<string, string> }) => void;
  // Aufgabe 40 Polish: nach jedem Step-Advance über eine Page feuert (mit der dbId der gerade verlassenen
  // Page). Wir liefern auch den aktuellen answers+contact-Snapshot mit, damit der Server-side UPSERT
  // mit den korrekten Daten passiert (sonst würde leerer {}-Snapshot existing Daten überschreiben).
  // Live-Mode: TenantFunnelClient POSTet das an /api/track-progress mit advancedPageId + snapshot.
  // Server triggert dann after_page-Webhooks via triggerOnPageAdvance (mit server-side Dedup).
  onPageAdvanced?: (pageId: string, snapshot: { answers: Record<string, string>; contact: Record<string, string> }) => void;
  onSubmit?: (data: {
    answers: Record<string, string>;
    contact: Record<string, string>;
    honeypot: string;
  }) => void;
  // Aufgabe 35: wenn true, kein Submit-Schritt — Funnel feuert /api/submit direkt nach letzter Frage.
  skipSubmitStep?: boolean;
  // Aufgabe 39: End-Screen-Redirect-Modus. Wenn gesetzt, Widget redirected nach Submit auf diese URL.
  redirectUrl?: string;
  // Polish: Custom-Karte leer → Builder rendert inline "+ Feld hinzufügen"-Button im Canvas, bubble up
  onAddCustomFieldRequest?: () => void;
}

export function Funnel({
  theme: themeOverrides,
  funnel,
  questions,
  contactFields,
  initialSubmitted,
  initialStep,
  previewHighlight,
  initialAnswers,
  onFieldClick,
  onStepChange,
  editMode = false,
  onTextChange,
  onAddOption,
  onReorderOptions,
  onDuplicateOption,
  onDeleteOption,
  onAnswersChange,
  onPageAdvanced,
  onSubmit,
  skipSubmitStep = false,
  redirectUrl,
  onAddCustomFieldRequest,
}: FunnelProps) {

  // Editor-Preview-Highlight (Standard): outline AUSSERHALB des Elements (offset +3px).
  // Mit Luft zwischen Element-Kante und Rahmen → klar erkennbar, auch wenn das Element
  // selbst die Primärfarbe verwendet (Option-Buttons).
  const hl = (...keys: string[]): React.CSSProperties =>
    previewHighlight && keys.includes(previewHighlight)
      ? { outline: "2px solid var(--funnel-primary)", outlineOffset: "3px" }
      : {};

  // Edge-Variante: outline INSIDE (offset -2px) für Elemente die direkt an der Card-Kante sitzen
  // und sonst von overflow:hidden geclippt würden (Header-Banner, Footer, die Card selbst,
  // der äußere Page-BG-Wrapper).
  const hlEdge = (...keys: string[]): React.CSSProperties =>
    previewHighlight && keys.includes(previewHighlight)
      ? { outline: "2px solid var(--funnel-primary)", outlineOffset: "-2px" }
      : {};

  // Editor-only: Klick auf ein data-edit-field-Element → Callback zum Editor.
  // In editMode KEIN stopPropagation/preventDefault — sonst feuern die Canvas-Buttons (Duplicate/Delete/Add-Option)
  // ihre eigenen onClick-Handler nicht. Step-Advance ist via editMode-Short-Circuit in handleSelect/handleNext
  // sowieso disabled, Submit-Button ist type="button" in editMode.
  // Im Live-/Test-Modus: stopPropagation + preventDefault verhindern unbeabsichtigte Option-Klicks/Form-Submit.
  const handlePreviewClick = (e: React.MouseEvent) => {
    if (!onFieldClick) return;
    const target = (e.target as HTMLElement).closest("[data-edit-field]") as HTMLElement | null;
    if (!target) return;
    if (!editMode) {
      e.preventDefault();
      e.stopPropagation();
    }
    onFieldClick(target.dataset.editField!, currentStep);
  };

  // Im Editor-Modus signalisieren Anzeige-Elemente Klickbarkeit per Cursor.
  const editCursor: React.CSSProperties = onFieldClick ? { cursor: "pointer" } : {};

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
    // Underline für Text-Inputs (resting state): 35% Brand-Mix mit BG.
    // Aktiv (focus) bleibt voller primaryColor. Gibt subtile Markenpräsenz ohne
    // den cleanen Typeform-Look mit klobigem Border zu zerstören.
    underlineColor:    mix(backgroundColor, primaryColor, 0.35),
    // Tint-Variante des Brand-Colors für „weiche" Hintergründe: Choice-Option-Cards
    // im Resting-State, Back-Button, etc. Hover ist eine Stufe stärker.
    tintColor:         mix(backgroundColor, primaryColor, 0.06),
    tintColorHover:    mix(backgroundColor, primaryColor, 0.12),
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
  // Aufgabe 50 Fix: im Editor NICHT nach visible filtern — dort enthält `questions` bewusst auch
  // hidden Pages (keepHidden), damit der Sidebar-Index 1:1 dem Widget-Index entspricht und hidden
  // Steps ausgegraut anzeigbar sind. Sonst kippt die Zuordnung, sobald ein hidden Step vor dem
  // selektierten liegt (z.B. ein deaktivierter Welcome-Screen an Index 0). Live/Test filtert normal.
  const visibleQuestions = editMode ? questions : questions.filter((q) => q.visible);

  const [currentStep, setCurrentStep] = useState(initialStep ?? 0);
  // C.1c — Slide-Animations-Richtung (1 = forward/slide-up, -1 = backward/slide-down). In editMode unbenutzt.
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

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

  // Aufgabe 35: im Skip-Mode entfällt der Kontakt-Step — totalSteps = nur Fragen.
  const totalSteps      = visibleQuestions.length + (skipSubmitStep ? 0 : 1);
  const isContactStep   = !skipSubmitStep && currentStep === visibleQuestions.length;
  const progress        = ((currentStep + 1) / Math.max(totalSteps, 1)) * 100;
  const currentQuestion = visibleQuestions[currentStep];
  const isLastQuestion  = currentStep === visibleQuestions.length - 1;

  // Alle sichtbaren Pflichtfelder müssen einen gültigen Wert haben.
  const isValid = visibleContactFields
    .filter((f) => f.required)
    .every((f) => !validateContactField(f, contactData[f.key] ?? ""));

  // Aufgabe 38: Custom-Multi-Field-Page (kind="custom") wird wie ein Multi-Field-Step behandelt.
  const isCustomStep     = !isContactStep && currentQuestion?.kind === "custom";
  // Aufgabe 39: Welcome-Page = Intro mit Button, Statement = Info ohne Input.
  const isWelcomeStep    = !isContactStep && currentQuestion?.kind === "welcome";
  const isStatementStep  = !isContactStep && currentQuestion?.questionType === "statement";
  // single_choice auto-advances on click; all other types (incl. custom/welcome/rating/scale/statement) need an explicit Weiter button.
  const isChoiceType     = !isContactStep && !isCustomStep && !isWelcomeStep && currentQuestion?.questionType === "single_choice";
  const showWeiterButton = !isContactStep && !isChoiceType;

  const currentAnswer      = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";
  const isQuestionRequired = (currentQuestion?.config as TextConfig)?.required !== false;

  // Visible Custom-Felder (für Render + Validation)
  const visibleCustomFields = isCustomStep && currentQuestion?.customFields
    ? currentQuestion.customFields.filter((f) => f.visible)
    : [];

  // Aufgabe 50: 1-Feld-Karte = sauberer Einzelfrage-Look. Bei genau EINEM sichtbaren Feld blenden
  // wir das Feld-Label aus — der große Karten-Titel benennt die Frage. Ab 2 Feldern: Labels zeigen.
  // Fallback: hat die Karte (noch) keinen Titel, bleibt das Feld-Label sichtbar (sonst stünde nichts da).
  const singleCustomField = visibleCustomFields.length === 1;
  const cardHasTitle = Boolean((currentQuestion?.title ?? "").trim());
  const customFieldLabel = (field: ContactFieldConfig) =>
    singleCustomField && cardHasTitle ? null : (
      <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
        {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
      </label>
    );

  // Custom-Step ist disabled bis alle required Fields gültig sind.
  const isCustomStepValid = visibleCustomFields
    .filter((f) => f.required)
    .every((f) => !validateContactField(f, answers[f.key] ?? ""));

  // Weiter is disabled when the current field is required and still empty.
  // Sonderfälle:
  //   - slider hat immer default → nie disabled
  //   - checkbox: required heißt "muss aktiviert sein" → value === "true"
  //   - custom: alle required Fields müssen valide sein
  //   - welcome + statement: nie disabled (Button-Klick advances ohne Input)
  //   - rating + scale: nur required wenn config.required !== false; Wert > 0 bzw. nicht leer
  const ratingScaleConfig = (currentQuestion?.config as { required?: boolean }) ?? {};
  const isWeiterDisabled =
    showWeiterButton &&
    !isWelcomeStep && !isStatementStep &&
    (isCustomStep
      ? !isCustomStepValid
      : currentQuestion?.questionType === "rating"
        ? ratingScaleConfig.required !== false && !currentAnswer.trim()
        : currentQuestion?.questionType === "scale"
          ? ratingScaleConfig.required !== false && !currentAnswer.trim()
          : currentQuestion?.questionType !== "slider" &&
            isQuestionRequired &&
            (currentQuestion?.questionType === "checkbox"
              ? currentAnswer !== "true"
              : !currentAnswer.trim()));

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

  // C.1c Canvas-Options: Sensors für Drag-Reorder der Choice-Optionen (nur in editMode aktiv).
  const optionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleOptionDragEnd = useCallback((e: DragEndEvent) => {
    if (!onReorderOptions) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIdx = (currentQuestion?.options ?? []).findIndex((o) => o.value === active.id);
    const toIdx   = (currentQuestion?.options ?? []).findIndex((o) => o.value === over.id);
    if (fromIdx < 0 || toIdx < 0) return;
    onReorderOptions(fromIdx, toIdx);
  // currentQuestion ändert sich pro Step — wir wollen den jeweils aktuellen Wert
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReorderOptions, currentQuestion]);

  // Aufgabe 35: Auto-Finish im Skip-Mode. Wird sowohl vom Auto-Advance (Single-Choice)
  // als auch vom Weiter-Button am Ende der letzten Frage gerufen.
  // Verwendet Funktional-Update via Ref auf das letzte Answer-Snapshot, damit der gerade
  // gesetzte Wert nicht durch eine async setState-Race verloren geht.
  const autoFinish = useCallback(
    (extraAnswer?: { questionId: string; value: string }) => {
      const finalAnswers = extraAnswer
        ? { ...answers, [extraAnswer.questionId]: extraAnswer.value }
        : answers;
      setIsSubmitted(true);
      onSubmit?.({ answers: finalAnswers, contact: contactData, honeypot });
    },
    [answers, contactData, honeypot, onSubmit],
  );

  // Single-choice: sets answer, then advances after 250ms so the selected color
  // is briefly visible before the step transition fires (Typeform-Pattern).
  // C.1c: editMode short-circuit — Builder-Klick auf Option soll selektieren/editieren, nicht advancen.
  // Aufgabe 35: im Skip-Mode + letzter Frage feuert direkt /api/submit + zeigt Success.
  // Aufgabe 40 Polish: nach Step-Advance feuert onPageAdvanced(pageId) — triggert after_page-Webhooks.
  const handleSelect = useCallback(
    (questionId: string, value: string) => {
      if (editMode) return;
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setTimeout(() => {
        if (skipSubmitStep && isLastQuestion) {
          autoFinish({ questionId, value });
          return;
        }
        if (currentStep < visibleQuestions.length) {
          const advancingPageId = currentQuestion?.pageId;
          setSlideDirection(1);
          setCurrentStep((prev) => prev + 1);
          if (advancingPageId) {
            const snapshot = { answers: { ...answers, [questionId]: value }, contact: contactData };
            onPageAdvanced?.(advancingPageId, snapshot);
          }
        }
      }, 250);
    },
    [currentStep, visibleQuestions.length, editMode, skipSubmitStep, isLastQuestion, autoFinish, currentQuestion, onPageAdvanced],
  );

  // Goes back one step. The zurück button is disabled at step 0.
  const handleBack = () => {
    if (editMode) return;
    if (currentStep > 0) {
      setSlideDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Advances to the next step. Used by the Weiter button on non-choice question types.
  // Aufgabe 35: im Skip-Mode + letzter Frage Auto-Finish statt Step-Advance.
  // Aufgabe 40 Polish: nach Step-Advance feuert onPageAdvanced(pageId) — triggert after_page-Webhooks.
  const handleNext = useCallback(() => {
    if (editMode) return;
    if (skipSubmitStep && isLastQuestion) {
      autoFinish();
      return;
    }
    const advancingPageId = currentQuestion?.pageId;
    setSlideDirection(1);
    setCurrentStep((prev) => prev + 1);
    if (advancingPageId) {
      onPageAdvanced?.(advancingPageId, { answers, contact: contactData });
    }
  }, [editMode, skipSubmitStep, isLastQuestion, autoFinish, currentQuestion, onPageAdvanced, answers, contactData]);

  // Multiple-choice: toggles `value` in/out of the comma-separated answer string for `questionId`.
  const handleToggleMultiple = useCallback(
    (questionId: string, value: string) => {
      if (editMode) return;
      setAnswers((prev) => {
        const current = prev[questionId]?.split(",").filter(Boolean) ?? [];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [questionId]: updated.join(",") };
      });
    },
    [editMode],
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

  // Aufgabe 39: End-Screen-Redirect-Modus. Wenn redirectUrl gesetzt UND wir gerade
  // submitted haben → kurze Success-Anzeige (~1500ms damit Tracking-Pixel feuern können),
  // dann window.location.replace. Im editMode/onFieldClick-Mode (Builder-Preview) NICHT
  // redirecten, sonst springt der Editor weg.
  useEffect(() => {
    if (!isSubmitted) return;
    if (editMode || onFieldClick) return;
    if (!redirectUrl) return;
    const trimmed = redirectUrl.trim();
    if (!trimmed) return;
    const target = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const timer = window.setTimeout(() => {
      try {
        window.location.replace(target);
      } catch {
        // Notfall: window.location.href fallback
        window.location.href = target;
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [isSubmitted, redirectUrl, editMode, onFieldClick]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Editor-Test-Modus: meldet aktuellen Schritt zurück an PreviewPanel,
  // damit die Step-Navigation oben mitläuft. Im Live-Widget ist onStepChange undefined → No-Op.
  useEffect(() => {
    if (!onStepChange) return;
    if (isSubmitted) {
      onStepChange("success", 0);
    } else if (isContactStep) {
      onStepChange("contact", 0);
    } else {
      onStepChange("question", currentStep);
    }
  }, [currentStep, isContactStep, isSubmitted, onStepChange]);

  // Partial-Submissions: feuere debounced 600ms nach jeder Antwort-Änderung den onAnswersChange-Callback.
  // In editMode oder ohne Callback: No-Op. Submitted-State auch No-Op (dort wird /api/submit aufgerufen).
  useEffect(() => {
    if (!onAnswersChange || editMode || isSubmitted) return;
    const timer = window.setTimeout(() => {
      onAnswersChange({ answers, contact: contactData });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [answers, contactData, onAnswersChange, editMode, isSubmitted]);

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
        onClickCapture={onFieldClick ? handlePreviewClick : undefined}
        style={{
          backgroundColor: pageBackgroundColor,
          width: "100%",
          paddingTop:    `${SHADOW_PADDING.top}px`,
          paddingBottom: `${SHADOW_PADDING.bottom}px`,
          paddingLeft:   `${SHADOW_PADDING.sides}px`,
          paddingRight:  `${SHADOW_PADDING.sides}px`,
          overflowX: "hidden",
          ...hlEdge("page_background_color"),
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
            ...hlEdge("primary_color", "text_color", "background_color", "font", "border_radius", "max_width"),
          }}
        >
          {/* Aufgabe 51: kein Top-Streifen + kein Footer mehr. Die Markenfarbe lebt zentriert im
              gefüllten Häkchen-Kreis (weißer Haken) — passt zum mittigen Success-Layout und ist das
              klassische „erledigt"-Pattern, ohne Fremdkörper-Streifen oder asymmetrischen Seitenrand. */}
          {/* Checkmark + success message */}
          <div className="p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <svg className="w-8 h-8" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <EditableText
              as="h2"
              editMode={editMode}
              fieldRef="success_message"
              initial={funnel.successMessage}
              placeholder="Erfolgs-Überschrift eingeben…"
              onCommit={onTextChange}
              className="text-2xl font-bold mb-2 leading-snug"
              style={{ color: theme.textColor, ...editCursor, ...hl("success_message") }}
            />
            {/* Aufgabe 51: Antwort-Text ist optional (Toggle in SuccessProps). Leer = nicht rendern. */}
            {funnel.responseMessage && (
              <EditableText
                as="p"
                editMode={editMode}
                fieldRef="response_message"
                initial={funnel.responseMessage}
                placeholder="Antwort-Text eingeben…"
                onCommit={onTextChange}
                className="text-sm mb-6"
                style={{ color: theme.textColorMuted, ...editCursor, ...hl("response_message") }}
              />
            )}

            {/* Summary of answers — Aufgabe 51: nur wenn aktiviert (Default aus = cleaner Dank) */}
            {funnel.showAnswersOverview && (
            <div
              className="rounded-lg text-left text-sm p-4"
              style={{ backgroundColor: theme.inputBgColor, borderLeft: `4px solid ${theme.primaryColor}` }}
            >
              <p
                className="font-semibold mb-3"
                data-edit-field="answers_overview_label"
                style={{ color: theme.textColor, ...editCursor, ...hl("answers_overview_label") }}
              >
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
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — Funnel (question steps + contact form)
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      onClickCapture={onFieldClick ? handlePreviewClick : undefined}
      style={{
        backgroundColor: pageBackgroundColor,
        width: "100%",
        paddingTop:    `${SHADOW_PADDING.top}px`,
        paddingBottom: `${SHADOW_PADDING.bottom}px`,
        paddingLeft:   `${SHADOW_PADDING.sides}px`,
        paddingRight:  `${SHADOW_PADDING.sides}px`,
        overflowX: "hidden",
        ...hlEdge("page_background_color"),
      }}
    >
      <div
        lang="de"
        className="@container mx-auto w-full relative"
        style={{
          ...cssVars,
          maxWidth:        theme.maxWidth,
          backgroundColor: theme.backgroundColor,
          fontFamily:      theme.fontFamily,
          borderRadius:    theme.borderRadius,
          overflow:        "hidden",
          boxShadow:       CARD_SHADOW_STRING,
          ...hlEdge("primary_color", "text_color", "background_color", "font", "border_radius", "max_width"),
        }}
      >
        {/* Progress-Bar 1px oben — Typeform-Pattern */}
        <div className="h-0.5 w-full" style={{ backgroundColor: `color-mix(in srgb, ${theme.textColor} 8%, transparent)` }}>
          <div
            className="h-full transition-[width] duration-300"
            style={{ width: `${progress}%`, backgroundColor: theme.primaryColor }}
          />
        </div>
        {/* Floating-Nav existiert nicht mehr (siehe BackButton-Bar am Content-Ende),
            also gleichmäßiges Padding ohne übergroßen Bottom-Buffer. */}
        <div className="p-4 @md:p-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
            <motion.div
              key={`${isContactStep ? "contact" : "q"}-${currentStep}`}
              custom={slideDirection}
              variants={STEP_SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={STEP_SLIDE_TRANSITION}
            >

            {/* --------------------------------------------------------------
                Question step
            -------------------------------------------------------------- */}
            {!isContactStep ? (
              <div>
                {/* Aufgabe 39: Welcome-Step hat keinen Step-Counter (Intro-Step vor dem eigentlichen Flow) */}
                {!isWelcomeStep && (
                  <div className="mb-3 flex items-center gap-2 font-mono text-xs" style={{ color: theme.primaryColor }}>
                    {!editMode && !showWeiterButton && currentStep > 0 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        aria-label="Zurück"
                        title="Zurück"
                        className="inline-flex h-5 w-5 items-center justify-center transition-colors"
                        style={{
                          backgroundColor: theme.tintColor,
                          color: theme.primaryColor,
                          borderRadius: theme.borderRadius,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.tintColorHover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.tintColor; }}
                      >
                        <ChevronLeft size={11} strokeWidth={2.5} />
                      </button>
                    )}
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[11px] font-semibold" style={{ backgroundColor: theme.primaryColor, color: "#ffffff" }}>
                      {/* Aufgabe 51: nur Fragen/Cards zählen — Welcome-Step nicht mitnummerieren (1. Frage = 1) */}
                      {visibleQuestions.slice(0, currentStep + 1).filter((q) => q.kind !== "welcome").length}
                    </span>
                  </div>
                )}

                <div className="mb-6 @lg:mb-8">
                  <EditableText
                    as="h1"
                    editMode={editMode}
                    fieldRef="question_title"
                    initial={currentQuestion.title || (onFieldClick && !editMode ? "Ihre Frage?" : "")}
                    placeholder="Frage-Titel eingeben…"
                    onCommit={onTextChange}
                    className="font-light leading-snug text-left text-balance"
                    style={{
                      // Fluid Typography: skaliert smooth zwischen 24px (schmale Cards) und 36px (breite Cards).
                      // cqw = % der Container-Width (Card hat @container) — kein abrupter Breakpoint-Sprung.
                      fontSize: "clamp(1.5rem, 5.5cqw, 2.25rem)",
                      color: currentQuestion.title ? theme.textColor : theme.textColorMuted,
                      fontStyle: currentQuestion.title ? "normal" : "italic",
                      ...editCursor,
                      ...hl("question_title"),
                    }}
                  />
                  {/* Subtitle wird nur gerendert wenn Content existiert oder gerade editiert wird.
                      Empty-Editor-Slot mit "Untertitel (optional)" entfernt — Right-Panel-Input ist die
                      Edit-Quelle, doppelte Affordance schafft nur Rauschen im Canvas. */}
                  {(currentQuestion.subtitle || previewHighlight === "question_subtitle") && (
                    <EditableText
                      as="p"
                      editMode={editMode}
                      fieldRef="question_subtitle"
                      initial={currentQuestion.subtitle ?? ""}
                      placeholder="Untertitel (optional)"
                      onCommit={onTextChange}
                      className="mt-2 font-light leading-relaxed text-left"
                      style={{
                        fontSize: "clamp(0.875rem, 2.5cqw, 1.125rem)",
                        color: theme.textColorMuted,
                        ...editCursor,
                        ...hl("question_subtitle"),
                      }}
                    />
                  )}
                </div>

                {/* Aufgabe 38: Custom-Multi-Field-Page — rendert N Felder als vertikale Stack,
                    Werte werden in answers gespeichert (keyed by field.key). Submit-Page bleibt
                    der finale Step. */}
                {isCustomStep && editMode && visibleCustomFields.length === 0 && onAddCustomFieldRequest && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddCustomFieldRequest(); }}
                    className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-8 text-sm font-medium transition-colors"
                    style={{
                      borderColor: theme.tintColorHover,
                      color: theme.primaryColor,
                      backgroundColor: theme.tintColor,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.tintColorHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.tintColor; }}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    Feld hinzufügen
                  </button>
                )}
                {isCustomStep && visibleCustomFields.length > 0 && (
                  <div className="space-y-4 mb-2">
                    {visibleCustomFields.map((field) => {
                      const fieldValue = answers[field.key] ?? "";

                      // --- Radio (z.B. Anrede) ---
                      if (field.type === "radio" && field.options) {
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <div className="flex gap-5">
                              {field.options.map((option) => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer min-h-11">
                                  <div
                                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                                    style={{ borderColor: fieldValue === option ? theme.primaryColor : theme.borderColor }}
                                  >
                                    {fieldValue === option && (
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
                                    )}
                                  </div>
                                  <span style={{ color: theme.textColor }}>{option}</span>
                                  <input
                                    type="radio"
                                    name={field.key}
                                    value={option}
                                    checked={fieldValue === option}
                                    onChange={(e) =>
                                      setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                                    }
                                    className="sr-only"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Polish-Runde 2: Multi-Choice (mehrere Werte als comma-separated)
                      if (field.type === "multi_choice" && field.options) {
                        const selected = (fieldValue || "").split(",").map((s) => s.trim()).filter(Boolean);
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <div className="flex flex-col gap-2">
                              {field.options.map((opt) => {
                                const isChecked = selected.includes(opt);
                                return (
                                  <label
                                    key={opt}
                                    className="flex items-center gap-3 cursor-pointer px-3 py-2 border transition-colors"
                                    style={{
                                      borderColor: isChecked ? theme.primaryColor : theme.tintColor,
                                      backgroundColor: isChecked
                                        ? `color-mix(in srgb, ${theme.primaryColor} 12%, transparent)`
                                        : theme.tintColor,
                                      borderRadius: theme.borderRadius,
                                    }}
                                  >
                                    <span
                                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border"
                                      style={{
                                        borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                                        backgroundColor: isChecked ? theme.primaryColor : theme.backgroundColor,
                                      }}
                                    >
                                      {isChecked && <Check size={12} strokeWidth={3} color="#ffffff" />}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        const next = isChecked
                                          ? selected.filter((s) => s !== opt)
                                          : [...selected, opt];
                                        setAnswers((prev) => ({ ...prev, [field.key]: next.join(",") }));
                                      }}
                                      className="sr-only"
                                    />
                                    <span className="text-sm font-light" style={{ color: theme.textColor }}>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Polish-Runde 2: Slider
                      if (field.type === "slider") {
                        const min = field.sliderMin ?? 0;
                        const max = field.sliderMax ?? 100;
                        const step = field.sliderStep ?? 1;
                        const fallback = field.sliderDefault ?? Math.floor((min + max) / 2);
                        const current = fieldValue ? Number(fieldValue) : fallback;
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <p className="text-2xl font-bold font-mono mb-2 leading-none" style={{ color: theme.primaryColor }}>
                              {current.toLocaleString("de-DE")}{" "}
                              {field.sliderUnit && (
                                <span className="text-lg font-light opacity-80">{field.sliderUnit}</span>
                              )}
                            </p>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              step={step}
                              value={current}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="w-full cursor-pointer accent-primary"
                              style={{ accentColor: theme.primaryColor }}
                            />
                            <div className="mt-1 flex justify-between text-[11px] font-light" style={{ color: theme.textColorMuted }}>
                              <span>{min}{field.sliderUnit ? ` ${field.sliderUnit}` : ""}</span>
                              <span>{max}{field.sliderUnit ? ` ${field.sliderUnit}` : ""}</span>
                            </div>
                          </div>
                        );
                      }

                      // Polish-Runde 2: Rating
                      if (field.type === "rating") {
                        const maxStars = Math.max(1, Math.min(10, field.ratingMaxStars ?? 5));
                        const currentVal = Number(fieldValue) || 0;
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <RatingStars
                              maxStars={maxStars}
                              value={currentVal}
                              onChange={(v) => setAnswers((prev) => ({ ...prev, [field.key]: String(v) }))}
                              primaryColor={theme.primaryColor}
                              mutedColor={theme.textColorMuted}
                            />
                          </div>
                        );
                      }

                      // Polish-Runde 2: Scale (NPS-Style)
                      if (field.type === "scale") {
                        const min = field.scaleMin ?? 0;
                        const max = field.scaleMax ?? 10;
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <ScaleButtons
                              min={min}
                              max={max}
                              value={fieldValue ?? ""}
                              onChange={(v) => setAnswers((prev) => ({ ...prev, [field.key]: v }))}
                              labelLeft={field.scaleLabelLeft}
                              labelRight={field.scaleLabelRight}
                              primaryColor={theme.primaryColor}
                              tintColor={theme.tintColor}
                              tintColorHover={theme.tintColorHover}
                              textColor={theme.textColor}
                              mutedColor={theme.textColorMuted}
                              borderRadius={theme.borderRadius}
                            />
                          </div>
                        );
                      }

                      // Aufgabe 39 Polish: Long-Text (Textarea)
                      if (field.type === "long_text") {
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <textarea
                              placeholder={field.placeholder ?? ""}
                              value={fieldValue}
                              rows={3}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="w-full bg-transparent border-b text-base @md:text-lg py-2 outline-none transition-colors resize-none font-light"
                              style={{ borderColor: theme.underlineColor, color: theme.textColor }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                            />
                          </div>
                        );
                      }

                      // Aufgabe 39 Polish: Number
                      if (field.type === "number") {
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <input
                              type="number"
                              placeholder={field.placeholder ?? ""}
                              value={fieldValue}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="w-full bg-transparent border-b text-base @md:text-lg py-2 outline-none transition-colors font-light"
                              style={{ borderColor: theme.underlineColor, color: theme.textColor }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                            />
                          </div>
                        );
                      }

                      // Aufgabe 39 Polish: Date
                      if (field.type === "date") {
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <DateInlinePicker
                              value={fieldValue}
                              onChange={(iso) =>
                                setAnswers((prev) => ({ ...prev, [field.key]: iso }))
                              }
                              primaryColor={theme.primaryColor}
                              textColor={theme.textColor}
                              borderRadius={theme.borderRadius}
                            />
                          </div>
                        );
                      }

                      // Aufgabe 39 Polish: Checkbox
                      if (field.type === "checkbox") {
                        const isChecked = fieldValue === "true";
                        return (
                          <label
                            key={field.key}
                            className="flex items-center gap-3 cursor-pointer px-3 py-3 border transition-colors"
                            style={{
                              borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                              backgroundColor: isChecked
                                ? `color-mix(in srgb, ${theme.primaryColor} 12%, transparent)`
                                : theme.inputBgColor,
                              borderRadius: theme.borderRadius,
                            }}
                          >
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors"
                              style={{
                                borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                                backgroundColor: isChecked ? theme.primaryColor : theme.backgroundColor,
                              }}
                            >
                              {isChecked && <Check size={12} strokeWidth={3} color="#ffffff" />}
                            </span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [field.key]: e.target.checked ? "true" : "false" }))
                              }
                              className="sr-only"
                            />
                            <span className="text-sm @md:text-base leading-snug font-light" style={{ color: theme.textColor }}>
                              {renderLabelWithLinks(field.checkboxLabel || field.label, theme.primaryColor)}
                            </span>
                          </label>
                        );
                      }

                      // Aufgabe 39 Polish: Dropdown
                      if (field.type === "dropdown" && field.options) {
                        return (
                          <div key={field.key}>
                            {customFieldLabel(field)}
                            <select
                              value={fieldValue}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="w-full bg-transparent border-b text-base @md:text-lg py-2 outline-none transition-colors font-light"
                              style={{ borderColor: theme.underlineColor, color: theme.textColor }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                            >
                              <option value="">Bitte wählen…</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      // --- Text / Email / Tel / PLZ / Name (Default-Fallback) ---
                      // Aufgabe 40 Polish: first_name/last_name/full_name werden wie text gerendert,
                      // aber mit sinnvollen Platzhaltern wenn der Tenant keinen eigenen gesetzt hat.
                      const inputType =
                        field.type === "email" ? "email" :
                        field.type === "tel"   ? "tel"   :
                        "text";
                      const defaultPlaceholder =
                        field.type === "first_name" ? "Vorname" :
                        field.type === "last_name"  ? "Nachname" :
                        field.type === "full_name"  ? "Voller Name" :
                        "";
                      return (
                        <div key={field.key}>
                          {customFieldLabel(field)}
                          <input
                            type={inputType}
                            placeholder={field.placeholder || defaultPlaceholder}
                            value={fieldValue}
                            onChange={(e) =>
                              setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="w-full bg-transparent border-b text-base @md:text-lg py-2 outline-none transition-colors font-light"
                            style={{
                              borderColor: theme.underlineColor,
                              color: theme.textColor,
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Aufgabe 50: Canvas-„+" auf nicht-leeren Karten — Feld direkt in die Karte hinzufügen. */}
                {isCustomStep && editMode && visibleCustomFields.length > 0 && onAddCustomFieldRequest && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddCustomFieldRequest(); }}
                    className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium transition-colors"
                    style={{
                      borderColor: theme.tintColorHover,
                      color: theme.primaryColor,
                      backgroundColor: theme.tintColor,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.tintColorHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.tintColor; }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    Feld hinzufügen
                  </button>
                )}

                {/* single_choice / multi_choice — Typeform-Stil: Letter-Chip LINKS + Label RECHTS, vertikal gestapelt
                    Welcome + Custom haben kein eigenes Choice-Input — der Block würde sonst fälschlich
                    den "+ Option hinzufügen" Builder-Slot rendern (Welcome hat fallback questionType="single_choice"). */}
                {!isCustomStep && !isWelcomeStep && (currentQuestion.questionType === "single_choice" ||
                  currentQuestion.questionType === "multi_choice") && (() => {
                  const isMultiple = currentQuestion.questionType === "multi_choice";
                  const selectedValues = answers[currentQuestion.id]?.split(",").filter(Boolean) ?? [];

                  const renderOptionContent = (
                    option: typeof currentQuestion.options[0],
                    idx: number,
                    isSelected: boolean,
                    // Aufgabe 50: im editMode wird der Letter-Chip zusätzlich zum Griff zum Drag-Handle
                    // (größerer Greifbereich) — die Listener kommen aus dem SortableEditOption-Wrapper.
                    dragListeners?: DraggableSyntheticListeners,
                  ) => {
                    const letter = optionMarkerFor(currentQuestion.optionMarker, idx);
                    const indicator = letter === null ? null : (
                      <span
                        aria-hidden="true"
                        {...(dragListeners ?? {})}
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold border${dragListeners ? " cursor-grab active:cursor-grabbing" : ""}`}
                        style={{
                          borderColor: isSelected ? theme.primaryColor : theme.underlineColor,
                          backgroundColor: isSelected ? theme.primaryColor : theme.backgroundColor,
                          color: isSelected ? "#ffffff" : theme.primaryColor,
                        }}
                      >
                        {letter}
                      </span>
                    );
                    const multiCheckbox = isMultiple ? (
                      <span
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors"
                        style={{
                          borderColor: isSelected ? theme.primaryColor : theme.borderColor,
                          backgroundColor: isSelected ? theme.primaryColor : theme.backgroundColor,
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} color="#ffffff" />}
                      </span>
                    ) : null;
                    return (
                      <>
                        {multiCheckbox}
                        {indicator}
                        <EditableText
                          as="span"
                          editMode={editMode}
                          fieldRef={`option_${idx}`}
                          initial={option.label}
                          placeholder="Option-Text"
                          onCommit={onTextChange}
                          className="flex-1 text-sm @md:text-base font-light leading-snug"
                          style={{ color: theme.textColor }}
                        />
                      </>
                    );
                  };

                  // Brand-getintet im Resting-State (cohärentes Design-Language mit Back-Button + Tint-Sektionen),
                  // hover one Stufe stärker für sanftes Feedback ohne grellen Sprung.
                  const optionWrapperStyle = (idx: number, isSelected: boolean): React.CSSProperties => ({
                    borderRadius:    theme.borderRadius,
                    borderColor:     isSelected ? theme.primaryColor : theme.tintColor,
                    backgroundColor: isSelected
                      ? `color-mix(in srgb, ${theme.primaryColor} 14%, transparent)`
                      : theme.tintColor,
                    ...hl(`option_${idx}`),
                  });
                  const optionWrapperClass = "group/option relative flex items-center w-full text-left gap-3 px-3 py-2.5 cursor-pointer outline-none border transition-colors";
                  const handleOptionHover = (e: React.MouseEvent<HTMLElement>, isSelected: boolean) => {
                    if (isSelected || editMode) return;
                    e.currentTarget.style.backgroundColor = theme.tintColorHover;
                  };
                  const handleOptionLeave = (e: React.MouseEvent<HTMLElement>, isSelected: boolean) => {
                    if (isSelected || editMode) return;
                    e.currentTarget.style.backgroundColor = theme.tintColor;
                  };

                  return (
                    <div className="mb-3 flex flex-col gap-2.5">
                      {editMode ? (
                        <DndContext sensors={optionSensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
                          <SortableContext items={currentQuestion.options.map((o) => o.value)} strategy={verticalListSortingStrategy}>
                            {currentQuestion.options.map((option, idx) => {
                              const isSelected = isMultiple
                                ? selectedValues.includes(option.value)
                                : answers[currentQuestion.id] === option.value;
                              return (
                                <SortableEditOption
                                  key={option.value}
                                  id={option.value}
                                  idx={idx}
                                  wrapperClassName={optionWrapperClass}
                                  wrapperStyle={optionWrapperStyle(idx, isSelected)}
                                  onDuplicate={onDuplicateOption}
                                  onDelete={onDeleteOption}
                                >
                                  {(dragListeners) => renderOptionContent(option, idx, isSelected, dragListeners)}
                                </SortableEditOption>
                              );
                            })}
                          </SortableContext>
                        </DndContext>
                      ) : (
                        currentQuestion.options.map((option, idx) => {
                          const isSelected = isMultiple
                            ? selectedValues.includes(option.value)
                            : answers[currentQuestion.id] === option.value;
                          return (
                            <button
                              key={option.value}
                              data-edit-field={`option_${idx}`}
                              onClick={() =>
                                isMultiple
                                  ? handleToggleMultiple(currentQuestion.id, option.value)
                                  : handleSelect(currentQuestion.id, option.value)
                              }
                              onMouseEnter={(e) => handleOptionHover(e, isSelected)}
                              onMouseLeave={(e) => handleOptionLeave(e, isSelected)}
                              className={optionWrapperClass}
                              style={optionWrapperStyle(idx, isSelected)}
                            >
                              {renderOptionContent(option, idx, isSelected)}
                            </button>
                          );
                        })
                      )}

                      {/* Add-Option-Link nur in editMode — kompakt unter den Optionen */}
                      {editMode && onAddOption && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onAddOption(); }}
                          className="inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-black/5"
                          style={{ color: theme.primaryColor }}
                        >
                          <Plus size={12} strokeWidth={2.5} />
                          Option hinzufügen
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* slider — Typeform-Stil: großes Number-Readout in Brand-Color über dem Range */}
                {currentQuestion.questionType === "slider" && sliderConfig && (
                  <div className="mb-6">
                    <p
                      className="text-4xl @md:text-5xl font-bold font-mono mb-4 leading-none"
                      data-edit-field="slider_default"
                      style={{ color: theme.primaryColor, ...editCursor, ...hl("slider_default", "slider_unit") }}
                    >
                      {sliderVal.toLocaleString("de-DE")}{" "}
                      <span className="text-2xl @md:text-3xl font-light opacity-80">{sliderConfig.unit}</span>
                    </p>

                    {/* Wrapper-Div damit die Highlight-Outline den ganzen Slider-Bereich umfasst */}
                    <div
                      data-edit-field="slider_step"
                      className="py-3"
                      style={{ ...editCursor, ...hl("slider_step") }}
                    >
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
                    </div>

                    <div className="flex justify-between text-xs mt-1 font-mono" style={{ color: theme.textColorMuted }}>
                      <span data-edit-field="slider_min" style={{ ...editCursor, ...hl("slider_min") }}>
                        {sliderConfig.min.toLocaleString("de-DE")} {sliderConfig.unit}
                      </span>
                      <span data-edit-field="slider_max" style={{ ...editCursor, ...hl("slider_max") }}>
                        {sliderConfig.max.toLocaleString("de-DE")} {sliderConfig.unit}
                      </span>
                    </div>
                  </div>
                )}

                {/* long_text — Underline-only Style (Typeform) */}
                {currentQuestion.questionType === "long_text" && (
                  <div className="mb-3">
                    <textarea
                      value={answers[currentQuestion.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !isWeiterDisabled) {
                          e.preventDefault();
                          handleNext();
                        }
                      }}
                      placeholder={`${(currentQuestion.config as TextConfig).placeholder ?? ""}${(currentQuestion.config as TextConfig).required === false ? " (optional)" : ""}`}
                      maxLength={(currentQuestion.config as TextConfig).maxLength}
                      rows={3}
                      data-edit-field="text_input"
                      className="w-full bg-transparent border-b text-lg @md:text-xl py-2 outline-none transition-colors resize-none font-light"
                      style={{
                        borderColor:     theme.underlineColor,
                        color:           theme.textColor,
                        ...hl("text_input", "text_placeholder", "text_required"),
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                    />
                  </div>
                )}

                {/* short_text — Underline-only Style */}
                {currentQuestion.questionType === "short_text" && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={answers[currentQuestion.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isWeiterDisabled) {
                          e.preventDefault();
                          handleNext();
                        }
                      }}
                      placeholder={`${(currentQuestion.config as TextConfig).placeholder ?? ""}${(currentQuestion.config as TextConfig).required === false ? " (optional)" : ""}`}
                      maxLength={(currentQuestion.config as TextConfig).maxLength}
                      data-edit-field="text_input"
                      className="w-full bg-transparent border-b text-xl @md:text-2xl py-3 outline-none transition-colors font-light"
                      style={{
                        borderColor:     theme.underlineColor,
                        color:           theme.textColor,
                        ...hl("text_input", "text_placeholder", "text_required"),
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                    />
                  </div>
                )}

                {/* date — Inline-Kalender via react-day-picker (lazy-loaded) */}
                {currentQuestion.questionType === "date" && (() => {
                  const dateCfg = currentQuestion.config as DateConfig;
                  const value = answers[currentQuestion.id] ?? dateCfg.default ?? "";
                  return (
                    <div data-edit-field="text_input" style={{ ...hl("text_input") }}>
                      <DateInlinePicker
                        value={value}
                        onChange={(iso) =>
                          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: iso }))
                        }
                        min={dateCfg.min}
                        max={dateCfg.max}
                        primaryColor={theme.primaryColor}
                        textColor={theme.textColor}
                        borderRadius={theme.borderRadius}
                      />
                    </div>
                  );
                })()}

                {/* number — HTML5 native input, Underline-only + Unit-Suffix rechts */}
                {currentQuestion.questionType === "number" && (() => {
                  const numCfg = currentQuestion.config as NumberConfig;
                  const value = answers[currentQuestion.id] ?? (numCfg.default != null ? String(numCfg.default) : "");
                  return (
                    <div className="mb-3 flex items-baseline gap-2 border-b transition-colors" style={{ borderColor: theme.underlineColor }}>
                      <input
                        type="number"
                        value={value}
                        min={numCfg.min}
                        max={numCfg.max}
                        step={numCfg.step ?? 1}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isWeiterDisabled) {
                            e.preventDefault();
                            handleNext();
                          }
                        }}
                        data-edit-field="text_input"
                        className="flex-1 bg-transparent text-xl @md:text-2xl py-3 outline-none font-light"
                        style={{
                          color: theme.textColor,
                          ...hl("text_input"),
                        }}
                      />
                      {numCfg.unit && (
                        <span className="text-lg font-light shrink-0" style={{ color: theme.textColorMuted }}>
                          {numCfg.unit}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* dropdown — Underline-only Select */}
                {currentQuestion.questionType === "dropdown" && (
                  <div className="mb-3">
                    <select
                      value={answers[currentQuestion.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                      }
                      data-edit-field="text_input"
                      className="w-full bg-transparent border-b text-lg @md:text-xl py-3 outline-none transition-colors font-light"
                      style={{
                        borderColor:     theme.underlineColor,
                        color:           theme.textColor,
                        ...hl("text_input"),
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                    >
                      <option value="">Bitte wählen…</option>
                      {currentQuestion.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Aufgabe 39: rating — 1-N Sterne mit Hover-Preview, Click setzt Antwort */}
                {currentQuestion.questionType === "rating" && (() => {
                  const cfg = currentQuestion.config as { maxStars?: number };
                  const maxStars = Math.max(1, Math.min(10, cfg.maxStars ?? 5));
                  const currentVal = Number(answers[currentQuestion.id]) || 0;
                  return (
                    <RatingStars
                      maxStars={maxStars}
                      value={currentVal}
                      onChange={(v) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: String(v) }))}
                      primaryColor={theme.primaryColor}
                      mutedColor={theme.textColorMuted}
                    />
                  );
                })()}

                {/* Aufgabe 39: scale — 0-N Buttons in a row (NPS-Style) mit optionalen Labels links/rechts */}
                {currentQuestion.questionType === "scale" && (() => {
                  const cfg = currentQuestion.config as { min?: number; max?: number; labelLeft?: string; labelRight?: string };
                  const min = cfg.min ?? 0;
                  const max = cfg.max ?? 10;
                  const currentVal = answers[currentQuestion.id] ?? "";
                  return (
                    <ScaleButtons
                      min={min}
                      max={max}
                      value={currentVal}
                      onChange={(v) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: v }))}
                      labelLeft={cfg.labelLeft}
                      labelRight={cfg.labelRight}
                      primaryColor={theme.primaryColor}
                      tintColor={theme.tintColor}
                      tintColorHover={theme.tintColorHover}
                      textColor={theme.textColor}
                      mutedColor={theme.textColorMuted}
                      borderRadius={theme.borderRadius}
                    />
                  );
                })()}

                {/* Aufgabe 39: statement — Info-Block ohne Input. Render = nichts (Title + Subtitle reichen). */}

                {/* checkbox — Single-Boolean (z.B. DSGVO/Newsletter), Typeform-Light-Style */}
                {currentQuestion.questionType === "checkbox" && (() => {
                  const cbCfg = currentQuestion.config as CheckboxConfig;
                  const isChecked = answers[currentQuestion.id] === "true";
                  return (
                    <label
                      className="mb-3 flex items-center gap-3 cursor-pointer px-3 py-3 border transition-colors"
                      data-edit-field="text_input"
                      style={{
                        borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                        backgroundColor: isChecked
                          ? `color-mix(in srgb, ${theme.primaryColor} 12%, transparent)`
                          : theme.inputBgColor,
                        borderRadius: theme.borderRadius,
                        ...hl("text_input"),
                      }}
                    >
                      <span
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors"
                        style={{
                          borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                          backgroundColor: isChecked ? theme.primaryColor : theme.backgroundColor,
                        }}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} color="#ffffff" />}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: e.target.checked ? "true" : "false",
                          }))
                        }
                        className="sr-only"
                      />
                      <span className="text-sm @md:text-base leading-snug font-light" style={{ color: theme.textColor }}>
                        {cbCfg.label || "Ich stimme zu"}
                      </span>
                    </label>
                  );
                })()}
              </div>

            ) : (

              /* --------------------------------------------------------------
                  Contact form (last step) — dynamisch aus contactFields, Typeform-Style
              -------------------------------------------------------------- */
              <form onSubmit={handleFormSubmit}>
                {/* Step-Counter für den letzten Schritt (ohne Pfeil) */}
                <div className="mb-3 flex items-center gap-2 font-mono text-xs" style={{ color: theme.primaryColor }}>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[11px] font-semibold" style={{ backgroundColor: theme.primaryColor, color: "#ffffff" }}>
                    {visibleQuestions.length + 1}
                  </span>
                </div>
                <EditableText
                  as="h1"
                  editMode={editMode}
                  fieldRef="contact_form_title"
                  initial={funnel.title}
                  placeholder="Überschrift Kontaktformular…"
                  onCommit={onTextChange}
                  className="text-2xl @md:text-3xl @lg:text-[2rem] font-light mb-2 leading-snug text-left"
                  style={{ color: theme.textColor, ...editCursor, ...hl("contact_form_title") }}
                />
                <EditableText
                  as="p"
                  editMode={editMode}
                  fieldRef="contact_form_subtitle"
                  initial={funnel.contactFormSubtitle}
                  placeholder="Untertitel Kontaktformular…"
                  onCommit={onTextChange}
                  className="text-sm @md:text-base font-light mb-6 leading-relaxed text-left"
                  style={{ color: theme.textColorMuted, ...editCursor, ...hl("contact_form_subtitle") }}
                />

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
                        <div
                          key={field.key}
                          data-edit-field={`contact_field_${field.key}`}
                          style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}
                        >
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

                    // Polish-Runde 2 — Multi-Choice
                    if (field.type === "multi_choice" && field.options) {
                      const selectedVals = (contactData[field.key] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                            {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                          </label>
                          <div className="flex flex-col gap-2">
                            {field.options.map((opt) => {
                              const isChecked = selectedVals.includes(opt);
                              return (
                                <label
                                  key={opt}
                                  className="flex items-center gap-3 cursor-pointer px-3 py-2 border transition-colors"
                                  style={{
                                    borderColor: isChecked ? theme.primaryColor : theme.tintColor,
                                    backgroundColor: isChecked
                                      ? `color-mix(in srgb, ${theme.primaryColor} 12%, transparent)`
                                      : theme.tintColor,
                                    borderRadius: theme.borderRadius,
                                  }}
                                >
                                  <span
                                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border"
                                    style={{
                                      borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                                      backgroundColor: isChecked ? theme.primaryColor : theme.backgroundColor,
                                    }}
                                  >
                                    {isChecked && <Check size={12} strokeWidth={3} color="#ffffff" />}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const next = isChecked
                                        ? selectedVals.filter((s) => s !== opt)
                                        : [...selectedVals, opt];
                                      handleContactChange(field.key, next.join(","));
                                    }}
                                    className="sr-only"
                                  />
                                  <span className="text-sm font-light" style={{ color: theme.textColor }}>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                          {errors[field.key] && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>}
                        </div>
                      );
                    }

                    // Polish-Runde 2 — Slider
                    if (field.type === "slider") {
                      const min = field.sliderMin ?? 0;
                      const max = field.sliderMax ?? 100;
                      const step = field.sliderStep ?? 1;
                      const fallback = field.sliderDefault ?? Math.floor((min + max) / 2);
                      const raw = contactData[field.key];
                      const current = raw ? Number(raw) : fallback;
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                            {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                          </label>
                          <p className="text-2xl font-bold font-mono mb-2 leading-none" style={{ color: theme.primaryColor }}>
                            {current.toLocaleString("de-DE")}{" "}
                            {field.sliderUnit && (
                              <span className="text-lg font-light opacity-80">{field.sliderUnit}</span>
                            )}
                          </p>
                          <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={current}
                            onChange={(e) => handleContactChange(field.key, e.target.value)}
                            className="w-full cursor-pointer"
                            style={{ accentColor: theme.primaryColor }}
                          />
                          <div className="mt-1 flex justify-between text-[11px] font-light" style={{ color: theme.textColorMuted }}>
                            <span>{min}{field.sliderUnit ? ` ${field.sliderUnit}` : ""}</span>
                            <span>{max}{field.sliderUnit ? ` ${field.sliderUnit}` : ""}</span>
                          </div>
                        </div>
                      );
                    }

                    // Polish-Runde 2 — Rating
                    if (field.type === "rating") {
                      const maxStars = Math.max(1, Math.min(10, field.ratingMaxStars ?? 5));
                      const currentVal = Number(contactData[field.key]) || 0;
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                            {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                          </label>
                          <RatingStars
                            maxStars={maxStars}
                            value={currentVal}
                            onChange={(v) => handleContactChange(field.key, String(v))}
                            primaryColor={theme.primaryColor}
                            mutedColor={theme.textColorMuted}
                          />
                          {errors[field.key] && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>}
                        </div>
                      );
                    }

                    // Polish-Runde 2 — Scale
                    if (field.type === "scale") {
                      const min = field.scaleMin ?? 0;
                      const max = field.scaleMax ?? 10;
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                            {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                          </label>
                          <ScaleButtons
                            min={min}
                            max={max}
                            value={contactData[field.key] ?? ""}
                            onChange={(v) => handleContactChange(field.key, v)}
                            labelLeft={field.scaleLabelLeft}
                            labelRight={field.scaleLabelRight}
                            primaryColor={theme.primaryColor}
                            tintColor={theme.tintColor}
                            tintColorHover={theme.tintColorHover}
                            textColor={theme.textColor}
                            mutedColor={theme.textColorMuted}
                            borderRadius={theme.borderRadius}
                          />
                          {errors[field.key] && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>}
                        </div>
                      );
                    }

                    // Aufgabe 39 Polish — Long-Text
                    if (field.type === "long_text") {
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                            {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                          </label>
                          <textarea
                            placeholder={field.placeholder ?? ""}
                            value={contactData[field.key] ?? ""}
                            rows={3}
                            onChange={(e) => handleContactChange(field.key, e.target.value)}
                            className="w-full bg-transparent border-b text-base @md:text-lg py-2 outline-none transition-colors resize-none font-light"
                            style={{ borderColor: errors[field.key] ? "#ef4444" : theme.underlineColor, color: theme.textColor }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                          />
                          {errors[field.key] && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>}
                        </div>
                      );
                    }

                    // Aufgabe 39 Polish — Number
                    if (field.type === "number") {
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                            {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                          </label>
                          <input
                            type="number"
                            placeholder={field.placeholder ?? ""}
                            value={contactData[field.key] ?? ""}
                            onChange={(e) => handleContactChange(field.key, e.target.value)}
                            className="w-full bg-transparent border-b text-base @md:text-lg py-2 outline-none transition-colors font-light"
                            style={{ borderColor: errors[field.key] ? "#ef4444" : theme.underlineColor, color: theme.textColor }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                          />
                          {errors[field.key] && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>}
                        </div>
                      );
                    }

                    // Aufgabe 39 Polish — Date
                    if (field.type === "date") {
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                            {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                          </label>
                          <DateInlinePicker
                            value={contactData[field.key] ?? ""}
                            onChange={(iso) => handleContactChange(field.key, iso)}
                            primaryColor={theme.primaryColor}
                            textColor={theme.textColor}
                            borderRadius={theme.borderRadius}
                          />
                          {errors[field.key] && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>}
                        </div>
                      );
                    }

                    // Aufgabe 39 Polish — Checkbox
                    if (field.type === "checkbox") {
                      const isChecked = contactData[field.key] === "true";
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label
                            className="flex items-center gap-3 cursor-pointer px-3 py-3 border transition-colors"
                            style={{
                              borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                              backgroundColor: isChecked ? `color-mix(in srgb, ${theme.primaryColor} 12%, transparent)` : theme.inputBgColor,
                              borderRadius: theme.borderRadius,
                            }}
                          >
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors"
                              style={{
                                borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                                backgroundColor: isChecked ? theme.primaryColor : theme.backgroundColor,
                              }}
                            >
                              {isChecked && <Check size={12} strokeWidth={3} color="#ffffff" />}
                            </span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleContactChange(field.key, e.target.checked ? "true" : "false")}
                              className="sr-only"
                            />
                            <span className="text-sm @md:text-base leading-snug font-light" style={{ color: theme.textColor }}>
                              {renderLabelWithLinks(field.checkboxLabel || field.label, theme.primaryColor)}
                            </span>
                          </label>
                          {errors[field.key] && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>}
                        </div>
                      );
                    }

                    // Aufgabe 39 Polish — Dropdown
                    if (field.type === "dropdown" && field.options) {
                      return (
                        <div key={field.key} data-edit-field={`contact_field_${field.key}`} style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}>
                          <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                            {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                          </label>
                          <select
                            value={contactData[field.key] ?? ""}
                            onChange={(e) => handleContactChange(field.key, e.target.value)}
                            className="w-full bg-transparent border-b text-base @md:text-lg py-2 outline-none transition-colors font-light"
                            style={{ borderColor: errors[field.key] ? "#ef4444" : theme.underlineColor, color: theme.textColor }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                          >
                            <option value="">Bitte wählen…</option>
                            {field.options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                          </select>
                          {errors[field.key] && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{errors[field.key]}</p>}
                        </div>
                      );
                    }

                    // --- Text / Email / Tel / PLZ / Name (Default-Fallback) ---
                    // Aufgabe 40 Polish: first_name/last_name/full_name werden wie text gerendert
                    // mit sensible default-Platzhaltern.
                    const submitInputType =
                      field.type === "email" ? "email" :
                      field.type === "tel"   ? "tel"   :
                      "text";
                    const submitDefaultPlaceholder =
                      field.type === "first_name" ? "Vorname" :
                      field.type === "last_name"  ? "Nachname" :
                      field.type === "full_name"  ? "Voller Name" :
                      "";
                    return (
                      <div
                        key={field.key}
                        data-edit-field={`contact_field_${field.key}`}
                        style={{ ...editCursor, ...hl(`contact_field_${field.key}`) }}
                      >
                        <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
                          {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
                        </label>
                        <input
                          type={submitInputType}
                          placeholder={field.placeholder || submitDefaultPlaceholder}
                          value={contactData[field.key] ?? ""}
                          onChange={(e) => handleContactChange(field.key, e.target.value)}
                          className="w-full bg-transparent border-b text-base @md:text-lg py-2 outline-none transition-colors font-light"
                          style={{
                            borderColor:     errors[field.key] ? "#ef4444" : theme.underlineColor,
                            color:           theme.textColor,
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                          onBlur={(e) => {
                            if (hasTriedSubmit) {
                              const err = validateContactField(field, e.currentTarget.value);
                              setErrors((prev) => ({ ...prev, [field.key]: err }));
                              e.currentTarget.style.borderColor = err ? "#ef4444" : theme.underlineColor;
                            } else {
                              e.currentTarget.style.borderColor = theme.underlineColor;
                            }
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
                <p
                  className="text-xs mb-4 leading-relaxed"
                  data-edit-field="privacy_text"
                  style={{ color: theme.textColorMuted, ...editCursor, ...hl("privacy_text") }}
                >
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

                {/* Bottom-Action-Bar: Back + Submit als Einheit (Typeform-Pattern). */}
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <BackButton onClick={handleBack} theme={theme} editMode={editMode} />
                  )}
                  <button
                    type={editMode ? "button" : "submit"}
                    data-edit-field="submit_button"
                    className="inline-flex items-center px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors"
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
                    <EditableText
                      as="span"
                      editMode={editMode}
                      fieldRef="submit_button"
                      initial={funnel.submitButtonLabel}
                      placeholder="Button-Text…"
                      onCommit={onTextChange}
                      className="text-sm @md:text-base"
                    />
                  </button>
                </div>
              </form>
            )}

            {/* Bottom-Action-Bar: NUR wenn OK gezeigt wird (Pairing-Pattern).
                Single-Choice (auto-advance) zeigt unten keinen Solo-Back-Button mehr —
                der wirkte "verloren". Stattdessen rendert oben ein Text-Link „← Zurück".
                So bleibt Navigation universal, ohne orphan-Buttons. */}
            {!isContactStep && showWeiterButton && (
              <div className="mt-6 flex items-center gap-2">
                {currentStep > 0 && (
                  <BackButton onClick={handleBack} theme={theme} editMode={editMode} />
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isWeiterDisabled || editMode}
                  className="inline-flex items-center px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = theme.primaryColorHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.primaryColor; }}
                >
                  {isWelcomeStep
                    ? (currentQuestion?.config as { buttonLabel?: string })?.buttonLabel || "Los geht's →"
                    : skipSubmitStep && isLastQuestion ? "Absenden" : "OK"}
                </button>
              </div>
            )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   BackButton — quadratischer Tinted-Brand-Button, links neben dem OK-Button.
   Ersetzt die alte Bottom-Right-Floating-Nav: einheitliche Action-Bar am Ende
   des Content statt zwei separater Layer (löst auch Aufgabe-37-Overlap dauerhaft).
   ────────────────────────────────────────────────────────────────────────────── */

function BackButton({
  onClick,
  theme,
  editMode,
}: {
  onClick: () => void;
  theme: { primaryColor: string; tintColor: string; tintColorHover: string; borderRadius: string };
  editMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={editMode}
      aria-label="Zurück zur vorherigen Frage"
      title="Zurück"
      className="inline-flex h-9 w-9 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        backgroundColor: theme.tintColor,
        color: theme.primaryColor,
        borderRadius: theme.borderRadius,
      }}
      onMouseEnter={(e) => {
        if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = theme.tintColorHover;
      }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.tintColor; }}
    >
      <ChevronLeft size={16} strokeWidth={2.5} />
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Aufgabe 39: RatingStars — 1-N Sterne mit Hover-Preview (Typeform/Tally-Style).
   Klick setzt Wert. Hover füllt bis zur gehoverten Position. Wert als String "1"..."N".
   ────────────────────────────────────────────────────────────────────────────── */

function RatingStars({
  maxStars,
  value,
  onChange,
  primaryColor,
  mutedColor,
}: {
  maxStars: number;
  value: number;
  onChange: (v: number) => void;
  primaryColor: string;
  mutedColor: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  return (
    <div
      className="mb-3 flex items-center gap-1 @md:gap-1.5"
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

/* ──────────────────────────────────────────────────────────────────────────────
   Aufgabe 39: ScaleButtons — 0-N Buttons in einer Reihe (NPS-Style).
   Aktiver Button = full Brand. Optionale Labels links/rechts unter den Buttons.
   ────────────────────────────────────────────────────────────────────────────── */

function ScaleButtons({
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
}) {
  const range = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-1.5 @md:gap-2">
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

/* ──────────────────────────────────────────────────────────────────────────────
   C.1c WYSIWYG-Edit: EditableText
   Schaltet zwischen reiner Anzeige (editMode=false, Live + read-only Preview)
   und contentEditable (editMode=true, Builder-Canvas) um. Uncontrolled —
   commit nur auf blur/Enter, Esc revertet via Remount-Key.
   ────────────────────────────────────────────────────────────────────────────── */

type EditableTextTag = "h1" | "h2" | "p" | "span" | "div";

interface EditableTextProps {
  as?: EditableTextTag;
  editMode: boolean;
  fieldRef: string;
  initial: string;
  placeholder: string;
  onCommit?: (fieldRef: string, newText: string) => void;
  multiline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function EditableText({
  as = "span",
  editMode,
  fieldRef,
  initial,
  placeholder,
  onCommit,
  multiline = false,
  className,
  style,
}: EditableTextProps) {
  const skipNextCommit = useRef(false);

  if (!editMode) {
    // Read-only Branch: identisch zum existierenden Render (Tag + data-edit-field + style + initial).
    // Empty-State zeigt den Placeholder gefadet/italic (Style wird vom Caller via style-prop reingegeben).
    const Tag = as;
    return (
      <Tag data-edit-field={fieldRef} className={className} style={style}>
        {initial}
      </Tag>
    );
  }

  // Edit-Branch: contentEditable mit Placeholder-via-CSS-Pseudo.
  // key={fieldRef + "_" + initial} → externe State-Änderungen remounten das Element sauber
  // (z.B. wenn der User in der OptionsEditor-Liste rechts den Text ändert, soll der contenteditable nachziehen).
  const Tag = as;
  return (
    <Tag
      key={`${fieldRef}_${initial}`}
      data-edit-field={fieldRef}
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      className={cn("funnel-editable", className)}
      // Text-Cursor (I-Beam) statt Pointer — Signal "hier kannst du tippen". Nach dem Spread damit es Parent-Pointer übersteuert.
      style={{ ...style, cursor: "text" }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        if (skipNextCommit.current) {
          skipNextCommit.current = false;
          return;
        }
        const text = e.currentTarget.innerText.replace(/ /g, " ").trim();
        if (text !== initial) {
          onCommit?.(fieldRef, text);
        }
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          skipNextCommit.current = true;
          // Revert: setze innerText zurück auf initial, dann blur
          (e.currentTarget as HTMLElement).innerText = initial;
          e.currentTarget.blur();
        }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        // Plain-Text-Paste-Sanitization gegen Rich-HTML aus Word/Browser.
        // execCommand ist deprecated aber für contentEditable-Paste das einzige Pattern
        // mit Cursor-Position-Preservation. Alternative (Selection-API + manueller Insert)
        // wäre ~30 Zeilen für minimalen Nutzen — bleiben bei execCommand bis Browser-Support endet.
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        if (typeof document !== "undefined" && document.execCommand) {
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          document.execCommand("insertText", false, text);
        }
      }}
    >
      {initial}
    </Tag>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   C.1c Canvas-Edit: SortableEditOption
   Wrapper um eine Choice-Option im editMode — fügt Drag-Handle (links, hover-visible)
   und Duplicate/Delete-Buttons (rechts, hover-visible) hinzu, plus useSortable für
   @dnd-kit-Drag-Reorder. data-edit-field bleibt am Wrapper für Click-Select.
   ────────────────────────────────────────────────────────────────────────────── */

interface SortableEditOptionProps {
  id: string;
  idx: number;
  wrapperClassName: string;
  wrapperStyle: React.CSSProperties;
  onDuplicate?: (idx: number) => void;
  onDelete?: (idx: number) => void;
  // Aufgabe 50: children als Render-Funktion bekommt die Drag-Listener — damit z.B. der
  // Letter-Chip zusätzlich zum Griff als Drag-Handle dienen kann.
  children: React.ReactNode | ((dragListeners: DraggableSyntheticListeners) => React.ReactNode);
}

function SortableEditOption({
  id,
  idx,
  wrapperClassName,
  wrapperStyle,
  onDuplicate,
  onDelete,
  children,
}: SortableEditOptionProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      role="button"
      tabIndex={-1}
      data-edit-field={`option_${idx}`}
      className={wrapperClassName}
      style={{ ...wrapperStyle, ...sortableStyle }}
    >
      {/* Drag-Handle — auf Hover sichtbar, links vor dem Indicator */}
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label="Reihenfolge ändern"
        title="Reihenfolge ändern"
        className="-ml-1 flex h-6 w-4 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover/option:opacity-60 active:cursor-grabbing"
        style={{ color: "currentColor" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </span>

      {typeof children === "function" ? children(listeners) : children}

      {/* Aktions-Buttons rechts — auf Hover sichtbar */}
      <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/option:opacity-100">
        {onDuplicate && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(idx); }}
            aria-label="Option duplizieren"
            title="Duplizieren"
            className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-black/10"
          >
            <Copy size={12} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
            aria-label="Option löschen"
            title="Löschen"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={12} />
          </button>
        )}
      </span>
    </div>
  );
}
