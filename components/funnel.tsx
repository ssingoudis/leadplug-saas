"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Check, CircleAlert, Plus } from "lucide-react";
// Kein framer-motion: der Folien-Übergang ist reine CSS-Animation (.funnel-step-enter-*
// in globals.css). JS-Springs ruckelten auf Mobile/Firefox; CSS animiert der Compositor.

// Lazy Inline-Kalender (react-day-picker+date-fns ~30 KB) — lädt nur bei date-Feldern.
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { resolveAnswer } from "@/lib/resolveAnswer";
import { validateContactField } from "@/lib/validateContactField";
import { groupRulesBySource, resolveNext } from "@/lib/logic/funnelLogic";
import { resolveFunnelTheme } from "@/lib/funnel/theme";
import { SHADOW_PADDING, CARD_SHADOW_STRING } from "@/lib/funnel/shadow";
import { optionMarkerFor, renderLabelWithLinks } from "@/lib/funnel/markdown";
import { BackButton } from "./funnel/BackButton";
import { OptionIcon } from "./funnel/OptionIcon";
import { RatingStars } from "./funnel/RatingStars";
import { ScaleButtons } from "./funnel/ScaleButtons";
import { EditableText } from "./funnel/EditableText";
import { SortableEditOption } from "./funnel/SortableEditOption";
import { autoGrowTextarea } from "./funnel/autoGrowTextarea";
import type {
  TextConfig,
  SliderConfig,
  DateConfig,
  NumberConfig,
  CheckboxConfig,
  ContactFieldConfig,
} from "@/types";
import type { FunnelProps } from "./funnel/types";

// Slide-Animation: beim Step-Wechsel remountet der key={`q-${currentStep}`}-Wrapper und
// die neue Folie gleitet rein (.funnel-step-enter-fwd/-back in globals.css); die
// Höhen-Transition im Embed glättet embed.js.

// =============================================================================
// COMPONENT
// =============================================================================

export function Funnel({
  theme: themeOverrides,
  funnel,
  questions,
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
  redirectUrl,
  onAddCustomFieldRequest,
  logicRules,
}: FunnelProps) {

  // Editor-Preview-Highlight: Outline außerhalb des Elements (offset +3px) — sichtbar auch
  // wenn das Element selbst die Primärfarbe nutzt (Option-Buttons).
  const hl = (...keys: string[]): React.CSSProperties =>
    previewHighlight && keys.includes(previewHighlight)
      ? { outline: "2px solid var(--funnel-primary)", outlineOffset: "3px" }
      : {};

  // Edge-Variante: Outline innen (offset -2px) für Elemente an der Card-Kante, die sonst
  // von overflow:hidden geclippt würden (Card selbst, Page-BG-Wrapper).
  const hlEdge = (...keys: string[]): React.CSSProperties =>
    previewHighlight && keys.includes(previewHighlight)
      ? { outline: "2px solid var(--funnel-primary)", outlineOffset: "-2px" }
      : {};

  // Editor-only: Klick auf [data-edit-field] → onFieldClick. In editMode KEIN stopPropagation
  // (sonst feuern die Canvas-Buttons nicht); Live/Test stoppt unbeabsichtigte Option-Klicks.
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

  const theme = resolveFunnelTheme(themeOverrides);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const containerRef     = useRef<HTMLDivElement>(null);
  // Im Editor NICHT nach visible filtern: `questions` enthält dort bewusst auch hidden Pages
  // (keepHidden), damit Sidebar-Index 1:1 dem Widget-Index entspricht. Live/Test filtert normal.
  const visibleQuestions = editMode ? questions : questions.filter((q) => q.visible);

  const [currentStep, setCurrentStep] = useState(initialStep ?? 0);
  // Slide-Richtung (1 = vorwärts, -1 = zurück); in editMode unbenutzt.
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  // Erst ab der ersten Navigation animieren (Initial-Render slidet nicht rein).
  const hasNavigatedRef = useRef(false);

  // Logik-Sprünge: Regeln nach Quell-Page gruppiert (O(1)-Lookup beim Advance).
  const rulesBySource = useMemo(() => groupRulesBySource(logicRules ?? []), [logicRules]);
  // Stack der besuchten Step-Indizes: „Zurück" nach einem Sprung führt auf den tatsächlich
  // besuchten Step, nicht Index-1. Ref, weil render-irrelevant.
  const stepHistoryRef = useRef<number[]>([]);

  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {});

  const [isSubmitted, setIsSubmitted] = useState(initialSubmitted ?? false);
  const [honeypot,    setHoneypot]    = useState("");

  // Browser-Zurück (Button/Geste) geht eine Frage zurück statt aus dem Funnel. Pro Advance
  // ein History-Push, popstate führt den Schritt aus (auch im iFrame-Embed). Nur Live —
  // editMode/Preview/Test fassen die History nicht an.
  const historyEnabled = !editMode && !onFieldClick && !onStepChange;
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;
  const isSubmittedRef = useRef(isSubmitted);
  isSubmittedRef.current = isSubmitted;
  const visibleCountRef = useRef(visibleQuestions.length);
  visibleCountRef.current = visibleQuestions.length;

  const pushStepToHistory = useCallback((idx: number) => {
    if (!historyEnabled || typeof window === "undefined") return;
    try {
      window.history.pushState({ ...window.history.state, lpStep: idx }, "");
    } catch {
      // Sandbox/Quota — Browser-Zurück verhält sich dann einfach wie vorher (Seiten-Exit).
    }
  }, [historyEnabled]);

  useEffect(() => {
    if (!historyEnabled || typeof window === "undefined") return;
    // Basis-Eintrag als Step 0 markieren, damit popstate-Ziele erkennbar sind.
    try {
      window.history.replaceState({ ...window.history.state, lpStep: 0 }, "");
    } catch { /* siehe pushStepToHistory */ }
    const onPop = (e: PopStateEvent) => {
      // Nach dem Absenden bleibt der Success-Screen stehen — kein Zurück ins Formular.
      if (isSubmittedRef.current) return;
      const state = e.state as { lpStep?: number } | null;
      const target = typeof state?.lpStep === "number" ? state.lpStep : 0;
      const cur = currentStepRef.current;
      if (target === cur) return;
      hasNavigatedRef.current = true;
      if (target < cur) {
        // Wie der interne Zurück-Button: auf den tatsächlich besuchten Step (History-Stack).
        setSlideDirection(-1);
        const prev = stepHistoryRef.current.pop();
        setCurrentStep(prev !== undefined && prev < cur ? prev : Math.max(0, cur - 1));
      } else {
        // Vorwärts-Button: Einträge existieren nur für bereits besuchte (= validierte) Steps.
        stepHistoryRef.current.push(cur);
        setSlideDirection(1);
        setCurrentStep(Math.min(target, Math.max(0, visibleCountRef.current - 1)));
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [historyEnabled]);

  // Validierungs-Icon erst zeigen, wenn ein Feld einmal den Fokus verlor (frisch geöffnete
  // Karte bleibt ruhig). Meldung steckt als Tooltip im title.
  const [touchedKeys, setTouchedKeys] = useState<Set<string>>(new Set());
  const markTouched = useCallback((key: string) => {
    setTouchedKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const totalSteps      = visibleQuestions.length;
  const progress        = ((currentStep + 1) / Math.max(totalSteps, 1)) * 100;
  const currentQuestion = visibleQuestions[currentStep];
  const isLastQuestion  = currentStep === visibleQuestions.length - 1;

  // Custom-Multi-Field-Karte (kind="custom").
  const isCustomStep     = currentQuestion?.kind === "custom";
  // Welcome = Intro mit Button, Statement = Info ohne Input.
  const isWelcomeStep    = currentQuestion?.kind === "welcome";
  const isStatementStep  = currentQuestion?.questionType === "statement";
  // single_choice advanced beim Klick automatisch; alle anderen brauchen den Weiter-Button.
  const isChoiceType     = !isCustomStep && !isWelcomeStep && currentQuestion?.questionType === "single_choice";
  const showWeiterButton = !isChoiceType;

  // „Mittig" ist ein Layout-Modus für die ganze Karte: zentriert kompakte Inline-Gruppen
  // (Rating/Skala/Kalender) + Button-Zeile. Vollbreite Felder bleiben unverändert.
  const isCenteredLayout = funnel.titleAlignment === "center";

  const currentAnswer      = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";
  const isQuestionRequired = (currentQuestion?.config as TextConfig)?.required !== false;

  // Visible Custom-Felder (für Render + Validation)
  const visibleCustomFields = isCustomStep && currentQuestion?.customFields
    ? currentQuestion.customFields.filter((f) => f.visible)
    : [];

  // 1-Feld-Karte: Feld-Label ausblenden (der Karten-Titel benennt die Frage); ab 2 Feldern zeigen.
  // Ohne Karten-Titel bleibt das Label sichtbar (sonst stünde nichts da).
  const singleCustomField = visibleCustomFields.length === 1;
  const cardHasTitle = Boolean((currentQuestion?.title ?? "").trim());
  const customFieldLabel = (field: ContactFieldConfig) =>
    singleCustomField && cardHasTitle ? null : (
      <label className="block text-xs font-medium mb-1" style={{ color: theme.textColorMuted }}>
        {field.label}{!field.required && <span className="opacity-60"> (optional)</span>}
      </label>
    );

  // Ausrufezeichen rechts im Feld, wenn berührt + invalide (in editMode nie).
  const fieldErrorHint = (field: ContactFieldConfig, value: string, align: "center" | "top" = "center") => {
    if (editMode || !touchedKeys.has(field.key)) return null;
    const err = validateContactField(field, value);
    if (!err) return null;
    return (
      <span
        title={err}
        aria-label={err}
        className={`absolute right-0 text-amber-500 ${align === "top" ? "top-2.5" : "top-1/2 -translate-y-1/2"}`}
      >
        <CircleAlert size={15} strokeWidth={2} />
      </span>
    );
  };

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

  // Slider-Config + aktueller Wert; null wenn die Frage kein Slider ist.
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

  // Sensoren für Drag-Reorder der Choice-Optionen (nur editMode).
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

  // Submit-Auslöser (von Auto-Advance + Weiter-Button auf der letzten Frage). Mergt extraAnswer
  // in den Snapshot, damit der gerade gesetzte Wert nicht durch die async setState-Race verloren geht.
  const autoFinish = useCallback(
    (extraAnswer?: { questionId: string; value: string }) => {
      const finalAnswers = extraAnswer
        ? { ...answers, [extraAnswer.questionId]: extraAnswer.value }
        : answers;
      setIsSubmitted(true);
      onSubmit?.({ answers: finalAnswers, contact: {}, honeypot });
    },
    [answers, honeypot, onSubmit],
  );

  // Sprung-Auflösung: wertet die Logik-Regeln der aktuellen Page gegen den Snapshot aus →
  // Ziel-Index oder "end". Vorwärts-only (MUSS = computePath im Server-Backstop bleiben):
  // Rückwärts-/fehlende Ziele degradieren zu „nächster Schritt".
  const resolveAdvanceIndex = useCallback(
    (answersSnapshot: Record<string, string>): number | "end" => {
      const pageId = currentQuestion?.pageId;
      const target = pageId ? resolveNext(rulesBySource.get(pageId), answersSnapshot) : null;
      if (target?.type === "end") return "end";
      if (target?.type === "page") {
        const idx = visibleQuestions.findIndex((q, j) => j > currentStep && q.pageId === target.pageId);
        if (idx > currentStep) return idx;
      }
      return currentStep + 1;
    },
    [currentQuestion, currentStep, visibleQuestions, rulesBySource],
  );

  // Single-Choice: setzt Antwort, advanced nach 250ms (Farb-Feedback kurz sichtbar, Typeform).
  // editMode short-circuit. Letzte Frage → autoFinish; sonst resolveAdvanceIndex + History-Push
  // + onPageAdvanced (after_page-Webhooks).
  const handleSelect = useCallback(
    (questionId: string, value: string) => {
      if (editMode) return;
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setTimeout(() => {
        const answersSnapshot = { ...answers, [questionId]: value };
        const dest = isLastQuestion ? "end" : resolveAdvanceIndex(answersSnapshot);
        if (dest === "end") {
          autoFinish({ questionId, value });
          return;
        }
        if (dest < visibleQuestions.length) {
          const advancingPageId = currentQuestion?.pageId;
          stepHistoryRef.current.push(currentStep);
          hasNavigatedRef.current = true;
          setSlideDirection(1);
          setCurrentStep(dest);
          pushStepToHistory(dest);
          if (advancingPageId) {
            onPageAdvanced?.(advancingPageId, { answers: answersSnapshot, contact: {} });
          }
        }
      }, 250);
    },
    [currentStep, visibleQuestions.length, editMode, isLastQuestion, autoFinish, currentQuestion, onPageAdvanced, answers, resolveAdvanceIndex, pushStepToHistory],
  );

  // Ein Schritt zurück (an Step 0 disabled). Nach Sprüngen auf den tatsächlich besuchten Step
  // (History-Stack); Index-Guard ist Defensive gegen Stack-Desync.
  const handleBack = () => {
    if (editMode) return;
    if (currentStep > 0) {
      // Live: Zurück läuft über history.back() → popstate führt den Schritt aus — EIN Pfad
      // für Widget-Button + Browser/Geste, beide bleiben synchron.
      if (historyEnabled && typeof window !== "undefined") {
        window.history.back();
        return;
      }
      hasNavigatedRef.current = true;
      setSlideDirection(-1);
      const prev = stepHistoryRef.current.pop();
      setCurrentStep(prev !== undefined && prev < currentStep ? prev : currentStep - 1);
    }
  };

  // Weiter-Button (Nicht-Single-Choice). Letzte Frage → autoFinish; sonst resolveAdvanceIndex
  // + History-Push + onPageAdvanced (after_page-Webhooks).
  const handleNext = useCallback(() => {
    if (editMode) return;
    if (isLastQuestion) {
      autoFinish();
      return;
    }
    const dest = resolveAdvanceIndex(answers);
    if (dest === "end") {
      autoFinish();
      return;
    }
    const advancingPageId = currentQuestion?.pageId;
    stepHistoryRef.current.push(currentStep);
    hasNavigatedRef.current = true;
    setSlideDirection(1);
    setCurrentStep(dest);
    pushStepToHistory(dest);
    if (advancingPageId) {
      onPageAdvanced?.(advancingPageId, { answers, contact: {} });
    }
  }, [editMode, isLastQuestion, autoFinish, currentQuestion, onPageAdvanced, answers, resolveAdvanceIndex, currentStep, pushStepToHistory]);

  // Multi-Choice: togglet value in der comma-separierten Antwort-Liste.
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

  // Tastatur-Bedienung (nur live/test): A–Z bzw. 1–9 wählen Optionen (single advanced, multi
  // togglet); Enter bestätigt OK/Weiter — außer Fokus liegt in einem Feld/Button.
  useEffect(() => {
    if (editMode || isSubmitted) return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const inField =
        !!el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

      if (e.key === "Enter") {
        if (inField || el?.tagName === "BUTTON") return;
        if (!showWeiterButton || isWeiterDisabled) return;
        e.preventDefault();
        handleNext();
        return;
      }

      if (inField) return;
      const q = currentQuestion;
      if (!q || q.kind === "custom" || q.kind === "welcome") return;
      if (q.questionType !== "single_choice" && q.questionType !== "multi_choice") return;
      let idx = -1;
      if (/^[a-zA-Z]$/.test(e.key)) idx = e.key.toUpperCase().charCodeAt(0) - 65;
      else if (/^[1-9]$/.test(e.key)) idx = Number(e.key) - 1;
      const option = idx >= 0 ? q.options[idx] : undefined;
      if (!option) return;
      e.preventDefault();
      if (q.questionType === "multi_choice") handleToggleMultiple(q.id, option.value);
      else handleSelect(q.id, option.value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    editMode,
    isSubmitted,
    currentQuestion,
    showWeiterButton,
    isWeiterDisabled,
    handleNext,
    handleSelect,
    handleToggleMultiple,
  ]);

  // Redirect nach Submit: ~1500ms Success-Anzeige (damit Tracking-Pixel feuern), dann
  // window.location.replace. Nicht in editMode/Preview (sonst springt der Editor weg).
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

  // Editor-Test-Modus: meldet den aktuellen Schritt an den Editor. Live: onStepChange undefined → No-Op.
  useEffect(() => {
    if (!onStepChange) return;
    if (isSubmitted) {
      onStepChange("success", 0);
    } else {
      onStepChange("question", currentStep);
    }
  }, [currentStep, isSubmitted, onStepChange]);

  // Slider-/Datum-Defaults beim Step-Wechsel einmalig in answers committen — sonst gilt ein
  // unverändert akzeptierter Default nicht als Antwort. Gleiche Fallback-Kette wie die Anzeige
  // (Wert == Anzeige). Nicht in editMode/isSubmitted.
  useEffect(() => {
    if (editMode || isSubmitted || !currentQuestion) return;
    const todayIso = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const updates: Record<string, string> = {};
    if (
      currentQuestion.kind !== "custom" &&
      currentQuestion.kind !== "welcome" &&
      currentQuestion.questionType === "slider"
    ) {
      const cfg = currentQuestion.config as SliderConfig;
      if ((answers[currentQuestion.id] ?? "") === "") {
        updates[currentQuestion.id] = String(cfg.default ?? cfg.min ?? 0);
      }
    }
    if (
      currentQuestion.kind !== "custom" &&
      currentQuestion.kind !== "welcome" &&
      currentQuestion.questionType === "date"
    ) {
      const cfg = currentQuestion.config as DateConfig;
      if ((answers[currentQuestion.id] ?? "") === "") {
        // ISO-Strings vergleichen lexikographisch korrekt — kein Date-Parsing nötig.
        let v = cfg.default || todayIso();
        if (cfg.min && v < cfg.min) v = cfg.min;
        if (cfg.max && v > cfg.max) v = cfg.max;
        updates[currentQuestion.id] = v;
      }
    }
    if (currentQuestion.kind === "custom") {
      for (const f of currentQuestion.customFields ?? []) {
        if (!f.visible) continue;
        if ((answers[f.key] ?? "") !== "") continue;
        if (f.type === "slider") {
          const min = f.sliderMin ?? 0;
          const max = f.sliderMax ?? 100;
          updates[f.key] = String(f.sliderDefault ?? Math.floor((min + max) / 2));
        } else if (f.type === "date") {
          updates[f.key] = todayIso();
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      setAnswers((prev) => ({ ...prev, ...updates }));
    }
    // Deps bewusst nur [currentStep]: answers in den Deps würde den Effect bei jedem Tastendruck
    // neu laufen lassen (unnötig, Guard ist idempotent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, editMode, isSubmitted]);

  // Partial-Submissions: onAnswersChange 600ms debounced nach jeder answers-Änderung.
  // No-Op in editMode/ohne Callback/submitted (dort läuft /api/submit).
  useEffect(() => {
    if (!onAnswersChange || editMode || isSubmitted) return;
    const timer = window.setTimeout(() => {
      onAnswersChange({ answers, contact: {} });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [answers, onAnswersChange, editMode, isSubmitted]);

  // Date-Picker-Chunk vorladen, wenn der Funnel ein Datumsfeld hat — sonst lädt er erst beim
  // Step-Wechsel auf die Datums-Folie, mitten in der Slide-Animation (Ruckler).
  useEffect(() => {
    const hasDateField = questions.some(
      (q) => q.questionType === "date" || (q.customFields ?? []).some((f) => f.type === "date"),
    );
    if (!hasDateField) return;
    // 800ms nach Mount: nach dem Initial-Render, aber vor dem ersten Step-Wechsel.
    const t = window.setTimeout(() => {
      import("./funnel/DateInlinePicker").catch(() => {});
    }, 800);
    return () => window.clearTimeout(t);
  }, [questions]);

  // Sendet die Widget-Höhe per postMessage an den Parent (ResizeObserver feuert bei Step-
  // Wechsel + nach Font-Load). Nur im iFrame aktiv (window.parent !== window).
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
          backgroundColor: theme.pageBackgroundColor,
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
          {/* Checkmark + Erfolgs-Nachricht */}
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
            {/* Antwort-Text optional — leer = nicht rendern. */}
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

            {/* Antworten-Übersicht — nur wenn aktiviert (Default aus). */}
            {funnel.showAnswersOverview && (
            <div
              className="rounded-lg text-left text-sm p-4"
              style={{ backgroundColor: theme.inputBgColor, borderLeft: `4px solid ${theme.primaryColor}` }}
            >
              <EditableText
                as="p"
                editMode={editMode}
                fieldRef="answers_overview_label"
                initial={funnel.answersOverviewLabel}
                placeholder="Überschrift der Antworten-Box…"
                onCommit={onTextChange}
                className="font-semibold mb-3"
                style={{ color: theme.textColor, ...editCursor, ...hl("answers_overview_label") }}
              />
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
  // Render — Frage-Schritte
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      onClickCapture={onFieldClick ? handlePreviewClick : undefined}
      style={{
        backgroundColor: theme.pageBackgroundColor,
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
        {/* Progress-Bar oben (per Design-Schalter abschaltbar). */}
        {funnel.showProgressBar && (
          <div className="h-0.5 w-full" style={{ backgroundColor: `color-mix(in srgb, ${theme.textColor} 8%, transparent)` }}>
            <div
              className="h-full transition-[width] duration-300"
              style={{ width: `${progress}%`, backgroundColor: theme.primaryColor }}
            />
          </div>
        )}
        <div className="p-4 @md:p-8 overflow-hidden">
          {/* Honeypot — für Menschen unsichtbar, von Bots gefüllt → server-side verworfen. */}
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
          {/* key-Remount + CSS-Enter-Animation (richtungsabhängig); erst ab der ersten Navigation. */}
          <div
            key={`q-${currentStep}`}
            className={
              hasNavigatedRef.current
                ? slideDirection > 0
                  ? "funnel-step-enter-fwd"
                  : "funnel-step-enter-back"
                : undefined
            }
          >

              <div>
                {/* Welcome-Step hat keinen Step-Counter; Badge per Design-Schalter abschaltbar
                    — die Zeile rendert dann nur für den Zurück-Pfeil (Single-Choice ab Schritt 2). */}
                {!isWelcomeStep && (funnel.showStepBadge || (!editMode && !showWeiterButton && currentStep > 0)) && (
                  // Mittig-Layout: Zurück-Pfeil ankert absolut links, nur das Badge auf der Mittelachse.
                  // h-5 hält die Zeilenhöhe stabil, auch wenn nur der Pfeil rendert.
                  <div className={`relative mb-3 flex h-5 items-center gap-2 font-mono text-xs ${isCenteredLayout ? "justify-center" : ""}`} style={{ color: theme.primaryColor }}>
                    {!editMode && !showWeiterButton && currentStep > 0 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        aria-label="Zurück"
                        title="Zurück"
                        className={`inline-flex h-5 w-5 items-center justify-center transition-colors ${isCenteredLayout ? "absolute left-0 top-0" : ""}`}
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
                    {funnel.showStepBadge && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[11px] font-semibold" style={{ backgroundColor: theme.primaryColor, color: "#ffffff" }}>
                        {/* nur Fragen/Cards zählen — Welcome nicht mitnummerieren. */}
                        {visibleQuestions.slice(0, currentStep + 1).filter((q) => q.kind !== "welcome").length}
                      </span>
                    )}
                  </div>
                )}

                <div className="group/title mb-6 @lg:mb-8">
                  <EditableText
                    as="h1"
                    editMode={editMode}
                    fieldRef="question_title"
                    initial={currentQuestion.title || (onFieldClick && !editMode ? "Ihre Frage?" : "")}
                    placeholder="Frage-Titel eingeben…"
                    onCommit={onTextChange}
                    className={`font-light leading-snug text-balance ${funnel.titleAlignment === "center" ? "text-center" : "text-left"}`}
                    style={{
                      // Fluid Typography via cqw (% der @container-Card-Breite): smooth 24px→36px, kein Breakpoint-Sprung.
                      fontSize: "clamp(1.5rem, 5.5cqw, 2.25rem)",
                      color: currentQuestion.title ? theme.textColor : theme.textColorMuted,
                      fontStyle: currentQuestion.title ? "normal" : "italic",
                      ...editCursor,
                      ...hl("question_title"),
                    }}
                  />
                  {/* Untertitel ohne Content = Hover-Ghost-Slot im editMode (opacity 0→60% bei Hover,
                      100% bei Fokus) — Klick-Ziel ohne im Ruhezustand zu rauschen. */}
                  {(currentQuestion.subtitle || previewHighlight === "question_subtitle" || editMode) && (
                    <EditableText
                      as="p"
                      editMode={editMode}
                      fieldRef="question_subtitle"
                      initial={currentQuestion.subtitle ?? ""}
                      placeholder="Untertitel (optional)"
                      onCommit={onTextChange}
                      className={`mt-2 font-light leading-relaxed ${funnel.titleAlignment === "center" ? "text-center" : "text-left"} ${
                        editMode && !currentQuestion.subtitle
                          ? "opacity-0 transition-opacity focus-within:opacity-100 group-hover/title:opacity-60"
                          : ""
                      }`}
                      style={{
                        fontSize: "clamp(0.875rem, 2.5cqw, 1.125rem)",
                        color: theme.textColorMuted,
                        ...editCursor,
                        ...hl("question_subtitle"),
                      }}
                    />
                  )}
                </div>

                {/* Custom-Karte: N Felder als vertikaler Stack, Werte in answers (keyed by field.key). */}
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
                      // Canvas-Klick-Selektion pro Karten-Feld. Identität = _clientId ?? key
                      // (kollisionssicher bei doppelten/leeren Keys). Live-Widget: inert.
                      const cardFieldRef = `card_field_${field._clientId ?? field.key}`;

                      // --- Radio (z.B. Anrede) ---
                      if (field.type === "radio" && field.options) {
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
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

                      // Multi-Choice (mehrere Werte comma-separiert)
                      if (field.type === "multi_choice" && field.options) {
                        const selected = (fieldValue || "").split(",").map((s) => s.trim()).filter(Boolean);
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
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

                      // Slider
                      if (field.type === "slider") {
                        const min = field.sliderMin ?? 0;
                        const max = field.sliderMax ?? 100;
                        const step = field.sliderStep ?? 1;
                        const fallback = field.sliderDefault ?? Math.floor((min + max) / 2);
                        const current = fieldValue ? Number(fieldValue) : fallback;
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
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
                              // gleiche .funnel-slider-Optik wie der Frage-Slider
                              className="funnel-slider"
                              style={{
                                "--slider-fill": `${Math.min(100, Math.max(0, ((current - min) / Math.max(1, max - min)) * 100))}%`,
                              } as React.CSSProperties}
                            />
                            <div className="mt-1 flex justify-between text-[11px] font-light" style={{ color: theme.textColorMuted }}>
                              <span>{min}{field.sliderUnit ? ` ${field.sliderUnit}` : ""}</span>
                              <span>{max}{field.sliderUnit ? ` ${field.sliderUnit}` : ""}</span>
                            </div>
                          </div>
                        );
                      }

                      // Rating
                      if (field.type === "rating") {
                        const maxStars = Math.max(1, Math.min(10, field.ratingMaxStars ?? 5));
                        const currentVal = Number(fieldValue) || 0;
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
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

                      // Scale (NPS-Style)
                      if (field.type === "scale") {
                        const min = field.scaleMin ?? 0;
                        const max = field.scaleMax ?? 10;
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
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

                      // Long-Text (Textarea)
                      if (field.type === "long_text") {
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
                            {customFieldLabel(field)}
                            <div className="relative">
                              <textarea
                                placeholder={field.placeholder ?? ""}
                                value={fieldValue}
                                rows={1}
                                ref={autoGrowTextarea}
                                onInput={(e) => autoGrowTextarea(e.currentTarget)}
                                onChange={(e) =>
                                  setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                                }
                                className="w-full bg-transparent border-b text-base @md:text-lg py-2 pr-7 outline-none transition-colors resize-none overflow-hidden font-light"
                                style={{ borderColor: theme.underlineColor, color: theme.textColor }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; markTouched(field.key); }}
                              />
                              {fieldErrorHint(field, fieldValue, "top")}
                            </div>
                          </div>
                        );
                      }

                      // Number (ohne native Spinner)
                      if (field.type === "number") {
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
                            {customFieldLabel(field)}
                            <div className="relative">
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder={field.placeholder ?? ""}
                                value={fieldValue}
                                onChange={(e) =>
                                  setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                                }
                                className="w-full bg-transparent border-b text-base @md:text-lg py-2 pr-7 outline-none transition-colors font-light [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                style={{ borderColor: theme.underlineColor, color: theme.textColor }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; markTouched(field.key); }}
                              />
                              {fieldErrorHint(field, fieldValue)}
                            </div>
                          </div>
                        );
                      }

                      // Date — Inline-Kalender, folgt dem „Mittig"-Layout.
                      if (field.type === "date") {
                        // Kein Feld-Label überm Kalender — selbsterklärend, Kontext liefert der Karten-Titel.
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
                            <div className={isCenteredLayout ? "flex justify-center" : undefined}>
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
                          </div>
                        );
                      }

                      // Checkbox
                      if (field.type === "checkbox") {
                        const isChecked = fieldValue === "true";
                        return (
                          <label
                            key={field.key}
                            data-edit-field={cardFieldRef}
                            className="flex items-center gap-3 cursor-pointer px-3 py-3 border transition-colors"
                            style={{
                              borderColor: isChecked ? theme.primaryColor : theme.borderColor,
                              backgroundColor: isChecked
                                ? `color-mix(in srgb, ${theme.primaryColor} 12%, transparent)`
                                : theme.inputBgColor,
                              borderRadius: theme.borderRadius,
                              ...hl(cardFieldRef),
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

                      // Dropdown
                      if (field.type === "dropdown" && field.options) {
                        return (
                          <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
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
                      // Name-Typen rendern wie text, aber mit sinnvollen Default-Platzhaltern.
                      const inputType =
                        field.type === "email" ? "email" :
                        field.type === "tel"   ? "tel"   :
                        "text";
                      const defaultPlaceholder =
                        field.type === "first_name" ? "Vorname" :
                        field.type === "last_name"  ? "Nachname" :
                        field.type === "full_name"  ? "Vor- und Nachname" :
                        field.type === "email"      ? "name@beispiel.de" :
                        field.type === "tel"        ? "0151 23456789" :
                        field.type === "plz"        ? "z. B. 10115" :
                        "";
                      return (
                        <div key={field.key} data-edit-field={cardFieldRef} style={{ ...editCursor, ...hl(cardFieldRef) }}>
                          {customFieldLabel(field)}
                          <div className="relative">
                            <input
                              type={inputType}
                              placeholder={field.placeholder || defaultPlaceholder}
                              value={fieldValue}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                              className="w-full bg-transparent border-b text-base @md:text-lg py-2 pr-7 outline-none transition-colors font-light"
                              style={{
                                borderColor: theme.underlineColor,
                                color: theme.textColor,
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; markTouched(field.key); }}
                            />
                            {fieldErrorHint(field, fieldValue)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Canvas-„+" auf nicht-leeren Karten — Feld direkt in die Karte hinzufügen. */}
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
                  // Aufgabe 76: Bild-Optionen. imageMode = single_choice/multi_choice mit Markierung
                  // "Bild" (optionMarker === 'image'). cardLayout (= imageMode im Live/Test-Render) →
                  // responsives Karten-Grid; editMode bleibt die sortierbare Reihen-Liste
                  // (Drag-Reorder via verticalListSortingStrategy).
                  const imageMode =
                    (currentQuestion.questionType === "single_choice" ||
                      currentQuestion.questionType === "multi_choice") &&
                    currentQuestion.optionMarker === "image";
                  const cardLayout = imageMode && !editMode;
                  // Aufgabe 76: 'cover' = Foto (randlos füllend), 'contain' = Symbol/Icon (mit Rand). Default 'contain'.
                  const imageFit = currentQuestion.imageFit === "cover" ? "cover" : "contain";
                  // Aufgabe 77: Tint der Bibliotheks-Icons — funnel-weiter Farbmodus aus dem Design-Panel.
                  const iconTint = theme.iconColor === "brand" ? theme.primaryColor : theme.textColor;

                  const renderOptionContent = (
                    option: typeof currentQuestion.options[0],
                    idx: number,
                    isSelected: boolean,
                    // editMode: der Letter-Chip dient zusätzlich als Drag-Handle (Listener vom Wrapper).
                    dragListeners?: DraggableSyntheticListeners,
                  ) => {
                    // Aufgabe 76: Bild-Karte — Bild-Box (oben im Grid / links als Thumbnail in der
                    // Reihen-Liste) + Label, KEIN Letter-Chip. Auswahl = Brand-Rahmen der Karte.
                    if (imageMode) {
                      return (
                        <>
                          <span
                            {...(dragListeners ?? {})}
                            className={`relative flex shrink-0 items-center justify-center overflow-hidden border${cardLayout ? " h-14 w-14 @md:h-auto @md:w-full @md:aspect-square" : " h-12 w-12"}${dragListeners ? " cursor-grab active:cursor-grabbing" : ""}`}
                            style={{
                              borderRadius: theme.borderRadius,
                              borderColor: isSelected ? theme.primaryColor : theme.underlineColor,
                              backgroundColor: theme.backgroundColor,
                            }}
                          >
                            {option.iconKey ? (
                              // Aufgabe 77: Bibliotheks-Icon (inline, tintbar) — gewinnt über imageUrl.
                              // Ignoriert imageFit: Icons sind immer Symbol-Darstellung mit Innenabstand.
                              <OptionIcon
                                iconKey={option.iconKey}
                                tintColor={iconTint}
                                className="h-full w-full p-1.5"
                              />
                            ) : option.imageUrl ? (
                              <img
                                src={option.imageUrl}
                                alt=""
                                loading="lazy"
                                className={`h-full w-full ${imageFit === "cover" ? "object-cover" : "object-contain p-1.5"}`}
                              />
                            ) : null}
                            {/* Aufgabe 76: bei Mehrfachauswahl dezenter Haken auf gewählten Karten —
                                signalisiert „mehrere möglich". Einfachauswahl zeigt Auswahl nur per Rahmen. */}
                            {isMultiple && isSelected && (
                              <span
                                className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full"
                                style={{ backgroundColor: theme.primaryColor }}
                              >
                                <Check size={11} strokeWidth={3} color="#ffffff" />
                              </span>
                            )}
                          </span>
                          <EditableText
                            as="span"
                            editMode={editMode}
                            fieldRef={`option_${idx}`}
                            initial={option.label}
                            placeholder="Option-Text"
                            onCommit={onTextChange}
                            className={`min-w-0 flex-1 wrap-break-word text-sm @md:text-base font-light leading-snug${cardLayout ? " @md:w-full @md:flex-none @md:text-center" : ""}`}
                            style={{ color: theme.textColor }}
                          />
                        </>
                      );
                    }
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
                    // Marker-Stil 'checkbox': Haken-Box für alle Choice-Typen (bei multi_choice ersetzt
                    // sie die Zusatz-Box, keine Doppel-Box). editMode: Box ist das Drag-Handle.
                    const isCheckboxMarker = currentQuestion.optionMarker === "checkbox";
                    const multiCheckbox = (isMultiple || isCheckboxMarker) ? (
                      <span
                        {...(isCheckboxMarker ? (dragListeners ?? {}) : {})}
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors${isCheckboxMarker && dragListeners ? " cursor-grab active:cursor-grabbing" : ""}`}
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
                  const optionWrapperClass = cardLayout
                    ? "group/option relative flex items-center @md:flex-col @md:items-stretch @md:text-center w-full text-left gap-3 @md:gap-2 p-2.5 overflow-hidden cursor-pointer outline-none border transition-colors"
                    : "group/option relative flex items-center w-full text-left gap-3 px-3 py-2.5 cursor-pointer outline-none border transition-colors";
                  const handleOptionHover = (e: React.MouseEvent<HTMLElement>, isSelected: boolean) => {
                    if (isSelected || editMode) return;
                    e.currentTarget.style.backgroundColor = theme.tintColorHover;
                  };
                  const handleOptionLeave = (e: React.MouseEvent<HTMLElement>, isSelected: boolean) => {
                    if (isSelected || editMode) return;
                    e.currentTarget.style.backgroundColor = theme.tintColor;
                  };

                  return (
                    <div
                      className={
                        cardLayout
                          ? "mb-3 grid grid-cols-1 gap-2.5 @md:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]"
                          : "mb-3 flex flex-col gap-2.5"
                      }
                    >
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
                        // Brand-Fill bis zum Daumen (CSS-Var, siehe .funnel-slider in globals.css)
                        style={{
                          "--slider-fill": `${Math.min(100, Math.max(0, ((sliderVal - sliderConfig.min) / Math.max(1, sliderConfig.max - sliderConfig.min)) * 100))}%`,
                        } as React.CSSProperties}
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
                      rows={1}
                      ref={autoGrowTextarea}
                      onInput={(e) => autoGrowTextarea(e.currentTarget)}
                      data-edit-field="text_input"
                      className="w-full bg-transparent border-b text-lg @md:text-xl py-2 outline-none transition-colors resize-none overflow-hidden font-light"
                      style={{
                        borderColor:     theme.underlineColor,
                        color:           theme.textColor,
                        ...hl("text_input", "text_placeholder", "text_required"),
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = theme.primaryColor; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = theme.underlineColor; }}
                    />
                    {/* Hinweis: Enter springt weiter, Shift+Enter bricht um (Unterschied zu Kurz-Text). */}
                    <p className="mt-1.5 text-xs font-light" style={{ color: theme.textColorMuted }}>
                      Shift ⇧ + Enter ↵ für eine neue Zeile
                    </p>
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

                {/* date — lazy Inline-Kalender; kompaktes Element, folgt dem „Mittig"-Layout. */}
                {currentQuestion.questionType === "date" && (() => {
                  const dateCfg = currentQuestion.config as DateConfig;
                  const value = answers[currentQuestion.id] ?? dateCfg.default ?? "";
                  return (
                    <div
                      data-edit-field="text_input"
                      className={isCenteredLayout ? "flex justify-center" : undefined}
                      style={{ ...hl("text_input") }}
                    >
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

                {/* number — Underline-only, ohne native Spinner (Typeform-Look). Die Einheit
                    klebt direkt an der Zahl: wo field-sizing unterstützt wird, ist das Input
                    nur so breit wie sein Inhalt; ältere Browser fallen auf volle Breite zurück.
                    <label> als Wrapper: Klick irgendwo auf der Zeile fokussiert das Feld. */}
                {currentQuestion.questionType === "number" && (() => {
                  const numCfg = currentQuestion.config as NumberConfig;
                  const value = answers[currentQuestion.id] ?? (numCfg.default != null ? String(numCfg.default) : "");
                  return (
                    <label className="mb-3 flex cursor-text items-baseline gap-2 border-b transition-colors" style={{ borderColor: theme.underlineColor }}>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={numCfg.placeholder ?? ""}
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
                        className="flex-1 bg-transparent text-xl @md:text-2xl py-3 outline-none font-light [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none supports-[field-sizing:content]:flex-none supports-[field-sizing:content]:field-sizing-content supports-[field-sizing:content]:min-w-[3ch] supports-[field-sizing:content]:max-w-full"
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
                    </label>
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

                {/* rating — 1-N Sterne mit Hover-Preview */}
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
                      centered={isCenteredLayout}
                    />
                  );
                })()}

                {/* scale — 0-N Buttons (NPS-Style) mit optionalen Labels */}
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
                      centered={isCenteredLayout}
                      primaryColor={theme.primaryColor}
                      tintColor={theme.tintColor}
                      tintColorHover={theme.tintColorHover}
                      textColor={theme.textColor}
                      mutedColor={theme.textColorMuted}
                      borderRadius={theme.borderRadius}
                    />
                  );
                })()}

                {/* statement — Info-Block ohne Input (Render = nichts). */}

                {/* checkbox — Single-Boolean (z.B. DSGVO/Newsletter), Typeform-Light-Style */}
                {currentQuestion.questionType === "checkbox" && (() => {
                  const cbCfg = currentQuestion.config as CheckboxConfig;
                  const isChecked = answers[currentQuestion.id] === "true";
                  return (
                    <label
                      onClick={(e) => { if (editMode) e.preventDefault(); }}
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
                      <EditableText
                        as="span"
                        editMode={editMode}
                        fieldRef="checkbox_label"
                        initial={cbCfg.label || "Ich stimme zu"}
                        placeholder="Checkbox-Text…"
                        onCommit={onTextChange}
                        className="text-sm @md:text-base leading-snug font-light"
                        style={{ color: theme.textColor, ...hl("checkbox_label") }}
                      />
                    </label>
                  );
                })()}
              </div>

            {/* Bottom-Action-Bar: NUR wenn OK gezeigt wird (Pairing-Pattern).
                Single-Choice (auto-advance) zeigt unten keinen Solo-Back-Button mehr —
                der wirkte "verloren". Stattdessen rendert oben ein Text-Link „← Zurück".
                So bleibt Navigation universal, ohne orphan-Buttons. */}
            {showWeiterButton && (
              <div className={`mt-6 flex items-center gap-2 ${isCenteredLayout ? "justify-center" : ""}`}>
                {currentStep > 0 && (
                  <BackButton onClick={handleBack} theme={theme} editMode={editMode} />
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!editMode && isWeiterDisabled}
                  className="inline-flex items-center px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = theme.primaryColorHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.primaryColor; }}
                >
                  {isWelcomeStep ? (
                    <EditableText
                      as="span"
                      editMode={editMode}
                      fieldRef="welcome_button_label"
                      initial={(currentQuestion?.config as { buttonLabel?: string })?.buttonLabel || "Los geht's →"}
                      placeholder="Button-Text…"
                      onCommit={onTextChange}
                    />
                  ) : isLastQuestion ? "Absenden" : "OK"}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
