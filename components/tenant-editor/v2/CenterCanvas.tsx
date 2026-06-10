"use client";

import { useState } from "react";
import { ExternalLink, Monitor, Smartphone, Play, Pencil, EyeOff, ListPlus, TriangleAlert, Info, X } from "lucide-react";
import { motion } from "framer-motion";
import { Funnel } from "@/components/funnel";
import { buildTheme, buildFunnelConfig, buildQuestions } from "@/lib/editorUtils";
import type { EditorState } from "@/types";
import type { SelectedStep } from "./types";
import { EmptyState } from "./ui/Panel";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  companyName: string;
  isTestMode: boolean;
  onToggleTestMode: () => void;
  // C.1c WYSIWYG-Edit
  selectedFieldRef: string;
  onSelectField: (fieldRef: string) => void;
  onTextChange: (fieldRef: string, newText: string) => void;
  // C.1c Canvas-Aktionen für Choice-Options
  onAddOption: () => void;
  onReorderOptions: (fromIdx: number, toIdx: number) => void;
  onDuplicateOption: (idx: number) => void;
  onDeleteOption: (idx: number) => void;
  // Polish: leere Custom-Karte zeigt Inline-"+"-Button → bubble nach EditorShell
  onAddCustomFieldRequest?: () => void;
  // Aufgabe 56: Slug fuer den "Live"-Button (nur Edit-Modus — neue Funnels haben noch keinen).
  liveSlug?: string;
  // Aufgabe 57D: Kontaktierbarkeits-Warnung quittierbar (persistiert pro Funnel).
  hideContactWarning: boolean;
  onToggleContactWarning: (hidden: boolean) => void;
}

export function CenterCanvas({
  state,
  selected,
  companyName,
  isTestMode,
  onToggleTestMode,
  selectedFieldRef,
  onSelectField,
  onTextChange,
  onAddOption,
  onReorderOptions,
  onDuplicateOption,
  onDeleteOption,
  onAddCustomFieldRequest,
  liveSlug,
  hideContactWarning,
  onToggleContactWarning,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);

  // Builder zeigt auch leere/unfertige Optionen (im Live-Widget werden sie weiter gefiltert).
  // Damit der User direkt nach "Option hinzufügen" die neue Zeile im Canvas sieht und einklicken kann.
  // Builder zeigt auch hidden + leere Optionen. Test/Live filtert normal.
  const questions = buildQuestions(state.questions, { keepEmpty: !isTestMode, keepHidden: !isTestMode });
  const theme = buildTheme(state);
  const funnel = buildFunnelConfig(state);

  // Aufgabe 55: Bühne = Seitenhintergrund des Funnels (WYSIWYG). 'transparent'/leer →
  // Editor-Default-Bühne mit Punktraster (unten). Hex/benannte Farben werden 1:1 gesetzt.
  const rawPageBg = (state.pageBackgroundColor ?? "").trim();
  const stageBg = rawPageBg && rawPageBg !== "transparent" ? rawPageBg : null;

  // Aufgabe 56: Kontaktierbarkeits-Check — die "Stavros-Falle" vom 2026-06-10
  // (Leads erscheinen im Posteingang, sind aber nicht kontaktierbar).
  // Aufgabe 57D: zwei Stufen statt einer Vollwarnung:
  //   "hard" = gar kein sichtbares E-Mail-/Telefon-Feld → amber Warnung
  //   "soft" = Feld vorhanden, aber keins Pflicht → dezenter Hinweis
  //   null   = sichtbares Pflichtfeld existiert → nichts
  const visibleContactFields = state.questions
    .filter((q) => q.kind === "custom" && q.visible !== false)
    .flatMap((q) =>
      (q.customFields ?? []).filter(
        (f) => (f.type === "email" || f.type === "tel") && f.visible,
      ),
    );
  const contactWarningTier: "hard" | "soft" | null = visibleContactFields.some((f) => f.required)
    ? null
    : visibleContactFields.length > 0
      ? "soft"
      : "hard";

  // initialStep berechnen — mapped die Selection auf den Widget-Step.
  // Widget-Steps: 0..N-1 = Fragen/Karten, danach intern Success (Submit am Funnel-Ende).
  let initialStep = 0;
  let initialSubmitted = false;
  let placeholder: "no_questions" | null = null;
  // Polish: hidden-Page wird nicht mehr als Placeholder gerendert. Stattdessen rendert das
  // Widget die Karte normal und CenterCanvas wraps mit Opacity + Eye-Off-Badge-Overlay.
  let isCurrentStepHidden = false;

  if (selected.kind === "question") {
    const sourceQ = state.questions[selected.questionIndex];
    if (!sourceQ) {
      placeholder = "no_questions";
    } else {
      isCurrentStepHidden = sourceQ.visible === false;
      // Im Builder enthält questions auch die hidden Pages (keepHidden), also bleibt der
      // sidebar-Index 1:1 der visible-Index im Funnel.
      initialStep = isTestMode
        ? (() => {
            let vIdx = -1;
            for (let i = 0; i <= selected.questionIndex && i < state.questions.length; i++) {
              if (state.questions[i].visible !== false) vIdx++;
            }
            return Math.max(0, vIdx);
          })()
        : selected.questionIndex;
    }
  } else if (selected.kind === "success") {
    initialSubmitted = true;
  }

  return (
    <div className="relative flex h-full flex-col bg-gray-100 dark:bg-background">
      {/* Aufgabe 50: Test-Toggle + Geräte-Umschalter schweben über der Bühne — nur Schatten,
          kein umschließender Kasten. */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTestMode}
            title={isTestMode ? "Zurück zum Editor" : "Funnel wie ein End-Kunde testen"}
            className={
              isTestMode
                ? "inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5 transition-colors hover:bg-amber-600"
                : "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5 transition-colors hover:bg-primary-hover"
            }
          >
            {isTestMode ? <Pencil size={14} /> : <Play size={14} fill="currentColor" />}
            {isTestMode ? "Zurück zum Editor" : "Funnel testen"}
          </button>

          {/* Aufgabe 56: Live-Preview direkt an der Buehne — oeffnet den echten Funnel
              (gespeicherter Stand) in neuem Tab, zaehlt keinen Aufruf (?preview=1). */}
          {liveSlug && (
            <a
              href={`/${liveSlug}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              title="Live ansehen (gespeicherter Stand — zählt keinen Aufruf)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-lg ring-1 ring-black/5 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ExternalLink size={13} />
              Live
            </a>
          )}

          <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setIsMobile(false)}
              title="Desktop-Ansicht"
              aria-label="Desktop-Ansicht"
              className={
                !isMobile
                  ? "flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-900 transition-colors dark:bg-gray-800 dark:text-white"
                  : "flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
              }
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsMobile(true)}
              title="Mobile-Ansicht"
              aria-label="Mobile-Ansicht"
              className={
                isMobile
                  ? "flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-900 transition-colors dark:bg-gray-800 dark:text-white"
                  : "flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
              }
            >
              <Smartphone size={14} />
            </button>
          </div>

          {/* Aufgabe 57D: quittierte Kontaktierbarkeits-Warnung → dezenter Erinnerungs-Marker.
              Klick blendet das Banner wieder ein (Toggle, persistiert pro Funnel). */}
          {!isTestMode && contactWarningTier && hideContactWarning && (
            <button
              type="button"
              onClick={() => onToggleContactWarning(false)}
              title={
                contactWarningTier === "hard"
                  ? "Kein E-Mail-/Telefon-Feld im Funnel — Leads sind nicht kontaktierbar. Klick zeigt den Hinweis wieder an."
                  : "E-Mail/Telefon ist optional — nicht jeder Lead wird kontaktierbar. Klick zeigt den Hinweis wieder an."
              }
              aria-label="Kontaktierbarkeits-Hinweis wieder anzeigen"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-amber-500 shadow-lg ring-1 ring-black/5 transition-colors hover:bg-amber-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <TriangleAlert size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Aufgabe 55 — Bühnen-Inszenierung:
          • Karte vertikal zentriert (my-auto im Flex-Scroll-Container — degradiert sauber zu
            Scroll, wenn die Karte höher als der Viewport ist).
          • Stage-Hintergrund = pageBackgroundColor des Funnels (echtes WYSIWYG: der Endkunde
            sieht genau diese Fläche um das Widget). Bei transparent/leer: Editor-Default mit
            subtilem Punktraster statt toter Fläche.
          • Click-into-empty deselected weiterhin (leere Fläche gehört dem Scroll-Container). */}
      <div
        className={`flex flex-1 flex-col overflow-y-auto p-6 pt-24 lg:p-10 lg:pt-24 ${
          stageBg
            ? ""
            : "bg-[radial-gradient(circle,rgba(17,24,39,0.06)_1px,transparent_1px)] bg-size-[18px_18px] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)]"
        }`}
        style={stageBg ? { backgroundColor: stageBg } : undefined}
        onClick={(e) => {
          // Nur deselect wenn auf den Outer-Container geklickt wurde (kein bubble-Target im Widget)
          if (e.target === e.currentTarget) {
            onSelectField("");
          }
        }}
      >
        {!isTestMode && contactWarningTier && !hideContactWarning && (
          <div
            className="mx-auto mb-4 w-full shrink-0"
            style={{ maxWidth: isMobile ? "375px" : state.maxWidth || "720px" }}
          >
            <div
              className={
                contactWarningTier === "hard"
                  ? "flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 shadow-sm dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
                  : "flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs leading-relaxed text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              }
            >
              {contactWarningTier === "hard" ? (
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              ) : (
                <Info size={14} className="mt-0.5 shrink-0" />
              )}
              <span className="flex-1">
                {contactWarningTier === "hard" ? (
                  <>
                    <strong>Kein E-Mail-/Telefon-Feld im Funnel.</strong>{" "}
                    Leads erscheinen im Posteingang, sind aber nicht kontaktierbar. Füge z.&nbsp;B.
                    eine Kontaktdaten-Karte hinzu („+ Frage hinzufügen").
                  </>
                ) : (
                  <>
                    <strong>E-Mail/Telefon ist optional.</strong>{" "}
                    Nur Leads, die das Feld ausfüllen, sind kontaktierbar.
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => onToggleContactWarning(true)}
                title="Hinweis für diesen Funnel ausblenden"
                aria-label="Hinweis für diesen Funnel ausblenden"
                className="-m-1 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <div
          className="mx-auto my-auto w-full transition-[max-width] duration-300"
          style={{ maxWidth: isMobile ? "375px" : state.maxWidth || "720px" }}
        >
          {placeholder === "no_questions" ? (
            <NoQuestionsPlaceholder />
          ) : (
            <motion.div
              // Aufgabe 55: sanfter Auftritt beim Step-Wechsel (Selection-Klick in der StepList).
              // Im Test-Modus stabiler Key → keine Re-Animation während der Test-Session.
              key={
                isTestMode
                  ? "test-session"
                  : `${selected.kind}-${selected.kind === "question" ? selected.questionIndex : 0}`
              }
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative"
            >
              {/* Aufgabe 55: weicher Ambient-Glow hinter der Karte — nur im Dark Mode und nur
                  auf der Default-Bühne (vermittelt zwischen dunkler Stage und weißer Karte). */}
              {!stageBg && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-10 hidden rounded-[3rem] bg-white/4 blur-3xl dark:block"
                />
              )}
              {/* Polish: Hidden-Page wird normal gerendert, aber ausgegraut + Eye-Off-Badge oben rechts.
                  Tenant sieht weiter den Inhalt der Frage, weiß aber dass sie im Live invisible ist. */}
              {isCurrentStepHidden && (
                <>
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gray-200/40 dark:bg-black/40" />
                  <div className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300">
                    <EyeOff size={12} />
                    Ausgeblendet
                  </div>
                </>
              )}
              <div className={`relative ${isCurrentStepHidden ? "opacity-50" : ""}`}>
                <Funnel
                  theme={theme}
                  funnel={funnel}
                  questions={questions}
                  initialStep={initialStep}
                  initialSubmitted={initialSubmitted}
                  previewHighlight={isTestMode ? "" : selectedFieldRef}
                  onFieldClick={isTestMode ? undefined : (field) => onSelectField(field)}
                  editMode={!isTestMode}
                  onTextChange={onTextChange}
                  onAddOption={isTestMode ? undefined : onAddOption}
                  onReorderOptions={isTestMode ? undefined : onReorderOptions}
                  onDuplicateOption={isTestMode ? undefined : onDuplicateOption}
                  onDeleteOption={isTestMode ? undefined : onDeleteOption}
                  onAddCustomFieldRequest={isTestMode ? undefined : onAddCustomFieldRequest}
                  onSubmit={() => {}}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoQuestionsPlaceholder() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <EmptyState
        icon={<ListPlus size={22} />}
        title="Noch keine Frage konfiguriert"
        description="Füge links eine Frage hinzu, um die Vorschau zu sehen."
      />
    </div>
  );
}

