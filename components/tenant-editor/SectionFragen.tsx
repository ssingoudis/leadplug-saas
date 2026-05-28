"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  ChevronUp,
  GripVertical,
  List,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uid, toKey, toSlug } from "@/lib/editorUtils";
import type { EditorQuestion, EditorOption, EditorState, QuestionType } from "@/types";

interface Props {
  questions: EditorQuestion[];
  onChange: (questions: EditorQuestion[]) => void;
  onFocus: (field: string, questionVisibleIndex?: number) => void;
  commandFocus: {
    field: string;
    questionVisibleIndex?: number;
    ts: number;
  } | null;
}

// Felder, die zu einer konkreten Frage-Karte gehören (vs. globale Felder).
function isQuestionField(field: string): boolean {
  return (
    field === "question_title" ||
    field === "question_subtitle" ||
    field.startsWith("option_") ||
    field.startsWith("slider_") ||
    field.startsWith("text_") ||
    field.startsWith("date_") ||
    field.startsWith("number_") ||
    field.startsWith("checkbox_")
  );
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Einfachauswahl",
  multi_choice: "Mehrfachauswahl",
  short_text: "Kurztext",
  long_text: "Langtext",
  slider: "Schieberegler",
  date: "Datum",
  number: "Zahl",
  dropdown: "Dropdown",
  checkbox: "Checkbox",
};

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition";

const selectClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
      {children}
    </p>
  );
}

function newOption(label = ""): EditorOption {
  const id = uid();
  // value = Slug aus Label wenn vorhanden, sonst _id als eindeutiger Startwert.
  return { _id: id, label, value: label ? toSlug(label) : id };
}

// Drei vorausgefüllte Beispiel-Optionen — User überschreibt nur den Text statt vor einem leeren Feld zu stehen.
function defaultChoiceOptions(): EditorOption[] {
  return [newOption("Option 1"), newOption("Option 2"), newOption("Option 3")];
}

function newQuestion(): EditorQuestion {
  return {
    _id: uid(),
    questionKey: "",
    questionType: "single_choice",
    title: "",
    subtitle: "",
    visible: true,
    required: true,
    placeholder: "",
    maxLength: "",
    sliderMin: "0",
    sliderMax: "100",
    sliderStep: "1",
    sliderUnit: "",
    sliderDefault: "50",
    options: defaultChoiceOptions(),
    dateMin: "",
    dateMax: "",
    dateDefault: "",
    numberMin: "",
    numberMax: "",
    numberStep: "1",
    numberDefault: "",
    numberUnit: "",
    checkboxLabel: "Ja, ich stimme zu",
  };
}

function updateQuestion(
  questions: EditorQuestion[],
  id: string,
  patch: Partial<EditorQuestion>,
): EditorQuestion[] {
  return questions.map((q) => (q._id === id ? { ...q, ...patch } : q));
}

function updateOption(
  options: EditorOption[],
  id: string,
  patch: Partial<EditorOption>,
): EditorOption[] {
  return options.map((o) => (o._id === id ? { ...o, ...patch } : o));
}

interface QuestionCardProps {
  question: EditorQuestion;
  index: number;
  total: number;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<EditorQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onFocus: (field: string) => void;
}

function QuestionCard({
  question,
  index,
  total,
  isOpen,
  onToggle,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onFocus,
}: QuestionCardProps) {
  const isChoice =
    question.questionType === "single_choice" ||
    question.questionType === "multi_choice" ||
    question.questionType === "dropdown";
  const isText =
    question.questionType === "short_text" ||
    question.questionType === "long_text";
  const isSlider = question.questionType === "slider";
  const isDate = question.questionType === "date";
  const isNumber = question.questionType === "number";
  const isCheckbox = question.questionType === "checkbox";

  // Bulk-Import: Textarea, eine Option pro Zeile.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  function parseBulk(): EditorOption[] {
    return bulkText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => newOption(label));
  }

  function bulkAppend() {
    const parsed = parseBulk();
    if (parsed.length === 0) return;
    onUpdate({ options: [...question.options, ...parsed] });
    setBulkText("");
    setBulkOpen(false);
  }

  function bulkReplace() {
    const parsed = parseBulk();
    if (parsed.length === 0) return;
    onUpdate({ options: parsed });
    setBulkText("");
    setBulkOpen(false);
  }

  function handleTitleChange(title: string) {
    const patch: Partial<EditorQuestion> = { title };
    // questionKey nur auto-setzen wenn noch nicht manuell gesetzt (leer oder altes auto)
    if (!question.questionKey || question.questionKey === toKey(question.title)) {
      patch.questionKey = toKey(title);
    }
    onUpdate(patch);
  }

  function handleOptionLabelChange(opt: EditorOption, label: string) {
    const wasAuto = opt.value === "" || opt.value === opt._id || opt.value === toSlug(opt.label);
    if (!wasAuto) {
      onUpdate({ options: updateOption(question.options, opt._id, { label }) });
      return;
    }
    // Eindeutigen Slug generieren: Fallback auf _id-Suffix wenn Label leer
    const base = toSlug(label) || opt._id.slice(-6);
    const siblings = question.options.filter((o) => o._id !== opt._id).map((o) => o.value);
    let value = base;
    let n = 2;
    while (siblings.includes(value)) value = `${base}-${n++}`;
    onUpdate({ options: updateOption(question.options, opt._id, { label, value }) });
  }

  function addOption() {
    onUpdate({ options: [...question.options, newOption()] });
  }

  function removeOption(id: string) {
    onUpdate({ options: question.options.filter((o) => o._id !== id) });
  }

  function handleTypeChange(type: QuestionType) {
    const patch: Partial<EditorQuestion> = { questionType: type };
    if (
      (type === "single_choice" || type === "multi_choice" || type === "dropdown") &&
      question.options.length === 0
    ) {
      patch.options = defaultChoiceOptions();
    }
    onUpdate(patch);
  }

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center bg-white dark:bg-gray-900">
        <div className="flex flex-col gap-0.5 pl-2 py-3 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-0.5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left min-w-0"
        >
          <GripVertical size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                Frage {index + 1}
              </span>
              <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs font-medium text-primary shrink-0">
                {QUESTION_TYPE_LABELS[question.questionType]}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate leading-snug mt-0.5">
              {question.title || (
                <span className="text-gray-400 dark:text-gray-500 italic">Kein Titel</span>
              )}
            </p>
          </div>
          <ChevronDown
            size={14}
            className={cn(
              "text-gray-400 transition-transform duration-200 shrink-0",
              isOpen && "rotate-180",
            )}
          />
        </button>

        <button
          type="button"
          onClick={onDuplicate}
          title="Frage duplizieren"
          className="p-3 text-gray-300 dark:text-gray-600 hover:text-primary transition-colors shrink-0"
        >
          <Copy size={15} />
        </button>

        <button
          type="button"
          onClick={onRemove}
          title="Frage löschen"
          className="p-3 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Card Body — onFocus per event delegation: data-field bestimmt den Highlight-Key */}
      {isOpen && (
        <div
          className="px-4 pb-4 pt-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 space-y-4"
          onFocus={(e) => {
            const field = (e.target as HTMLElement).dataset.field ?? "question_title";
            onFocus(field);
          }}
        >
          {/* Fragetyp */}
          <div>
            <Label>Fragetyp</Label>
            <select
              value={question.questionType}
              onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
              data-field="question_title"
              className={selectClass}
            >
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Titel */}
          <div>
            <Label>Frage</Label>
            <input
              type="text"
              value={question.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              data-field="question_title"
              placeholder="Was möchten Sie wissen?"
              className={inputClass}
            />
          </div>

          {/* Untertitel */}
          <div>
            <Label>Untertitel (optional)</Label>
            <input
              type="text"
              value={question.subtitle}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
              data-field="question_subtitle"
              placeholder="Ergänzende Erklärung zur Frage"
              className={inputClass}
            />
          </div>

          {/* Choice-Optionen */}
          {isChoice && (
            <div>
              <Label>Antwortoptionen</Label>
              <div className="space-y-2">
                {question.options.map((opt, idx) => (
                  <div key={opt._id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => handleOptionLabelChange(opt, e.target.value)}
                      data-field={`option_${idx}`}
                      placeholder={`Option ${idx + 1}`}
                      className={cn(inputClass, "flex-1")}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(opt._id)}
                      disabled={question.options.length <= 1}
                      className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/40 hover:border-primary text-primary text-xs font-semibold transition-colors"
                >
                  <Plus size={13} />
                  Option hinzufügen
                </button>
                <button
                  type="button"
                  onClick={() => setBulkOpen((b) => !b)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-gray-300 text-xs font-semibold transition-colors"
                >
                  <List size={13} />
                  Mehrere auf einmal
                </button>
              </div>

              {bulkOpen && (
                <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Eine Option pro Zeile. Leere Zeilen werden ignoriert.
                  </p>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={5}
                    placeholder={"Antwort 1\nAntwort 2\nAntwort 3"}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition resize-y font-mono"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={bulkAppend}
                      disabled={!bulkText.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anhängen
                    </button>
                    <button
                      type="button"
                      onClick={bulkReplace}
                      disabled={!bulkText.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Ersetzen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkOpen(false);
                        setBulkText("");
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Slider-Config */}
          {isSlider && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Minimum</Label>
                <input
                  type="number"
                  value={question.sliderMin}
                  onChange={(e) => onUpdate({ sliderMin: e.target.value })}
                  data-field="slider_min"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Maximum</Label>
                <input
                  type="number"
                  value={question.sliderMax}
                  onChange={(e) => onUpdate({ sliderMax: e.target.value })}
                  data-field="slider_max"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Schrittweite</Label>
                <input
                  type="number"
                  value={question.sliderStep}
                  onChange={(e) => onUpdate({ sliderStep: e.target.value })}
                  data-field="slider_step"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Einheit (z.B. m²)</Label>
                <input
                  type="text"
                  value={question.sliderUnit}
                  onChange={(e) => onUpdate({ sliderUnit: e.target.value })}
                  data-field="slider_unit"
                  placeholder="m²"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Standardwert</Label>
                <input
                  type="number"
                  value={question.sliderDefault}
                  onChange={(e) => onUpdate({ sliderDefault: e.target.value })}
                  data-field="slider_default"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Date-Config (HTML5 native input type=date — keine Custom-Picker-UX) */}
          {isDate && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Minimum (optional)</Label>
                  <input
                    type="date"
                    value={question.dateMin}
                    onChange={(e) => onUpdate({ dateMin: e.target.value })}
                    data-field="date_min"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label>Maximum (optional)</Label>
                  <input
                    type="date"
                    value={question.dateMax}
                    onChange={(e) => onUpdate({ dateMax: e.target.value })}
                    data-field="date_max"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Standardwert (optional)</Label>
                  <input
                    type="date"
                    value={question.dateDefault}
                    onChange={(e) => onUpdate({ dateDefault: e.target.value })}
                    data-field="date_default"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`req-${question._id}`}
                  checked={question.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  data-field="date_required"
                  className="rounded"
                />
                <label
                  htmlFor={`req-${question._id}`}
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Pflichtfeld
                </label>
              </div>
            </div>
          )}

          {/* Number-Config */}
          {isNumber && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Minimum (optional)</Label>
                  <input
                    type="number"
                    value={question.numberMin}
                    onChange={(e) => onUpdate({ numberMin: e.target.value })}
                    data-field="number_min"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label>Maximum (optional)</Label>
                  <input
                    type="number"
                    value={question.numberMax}
                    onChange={(e) => onUpdate({ numberMax: e.target.value })}
                    data-field="number_max"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label>Schrittweite</Label>
                  <input
                    type="number"
                    value={question.numberStep}
                    onChange={(e) => onUpdate({ numberStep: e.target.value })}
                    data-field="number_step"
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label>Einheit (optional, z.B. kWh)</Label>
                  <input
                    type="text"
                    value={question.numberUnit}
                    onChange={(e) => onUpdate({ numberUnit: e.target.value })}
                    data-field="number_unit"
                    placeholder="kWh"
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Standardwert (optional)</Label>
                  <input
                    type="number"
                    value={question.numberDefault}
                    onChange={(e) => onUpdate({ numberDefault: e.target.value })}
                    data-field="number_default"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`req-${question._id}`}
                  checked={question.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  data-field="number_required"
                  className="rounded"
                />
                <label
                  htmlFor={`req-${question._id}`}
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Pflichtfeld
                </label>
              </div>
            </div>
          )}

          {/* Checkbox-Config (Single-Checkbox für DSGVO/Newsletter) */}
          {isCheckbox && (
            <div className="space-y-3">
              <div>
                <Label>Label rechts neben der Checkbox</Label>
                <input
                  type="text"
                  value={question.checkboxLabel}
                  onChange={(e) => onUpdate({ checkboxLabel: e.target.value })}
                  data-field="checkbox_label"
                  placeholder="Ja, ich stimme zu"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`req-${question._id}`}
                  checked={question.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  data-field="checkbox_required"
                  className="rounded"
                />
                <label
                  htmlFor={`req-${question._id}`}
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Pflichtfeld (muss vom User aktiviert werden)
                </label>
              </div>
            </div>
          )}

          {/* Text-Config (auch für email/tel) */}
          {isText && (
            <div className="space-y-3">
              <div>
                <Label>Platzhalter-Text</Label>
                <input
                  type="text"
                  value={question.placeholder}
                  onChange={(e) => onUpdate({ placeholder: e.target.value })}
                  data-field="text_placeholder"
                  placeholder="Hier eingeben..."
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`req-${question._id}`}
                  checked={question.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                  data-field="text_required"
                  className="rounded"
                />
                <label
                  htmlFor={`req-${question._id}`}
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Pflichtfeld
                </label>
              </div>
            </div>
          )}

          {/* Sichtbarkeit */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
            <input
              type="checkbox"
              id={`vis-${question._id}`}
              checked={question.visible}
              onChange={(e) => onUpdate({ visible: e.target.checked })}
              className="rounded"
            />
            <label
              htmlFor={`vis-${question._id}`}
              className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Frage anzeigen
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export function SectionFragen({ questions, onChange, onFocus, commandFocus }: Props) {
  const [openId, setOpenId] = useState<string | null>(
    questions[0]?._id ?? null,
  );

  // Sichtbarer Index jeder Frage (für Preview-Navigation).
  // Berechnung hochgezogen, damit der commandFocus-Effekt ihn nutzen kann.
  let vc = 0;
  const visibleIndices = questions.map((q) => (q.visible !== false ? vc++ : -1));

  // Klick im Preview auf ein Frage-Element → richtige Karte aufklappen.
  useEffect(() => {
    if (!commandFocus) return;
    if (!isQuestionField(commandFocus.field)) return;
    const target = commandFocus.questionVisibleIndex ?? 0;
    const sidebarIdx = visibleIndices.indexOf(target);
    if (sidebarIdx === -1) return;
    const q = questions[sidebarIdx];
    if (q && openId !== q._id) setOpenId(q._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandFocus]);

  function addQuestion() {
    const q = newQuestion();
    onChange([...questions, q]);
    setOpenId(q._id);
  }

  function removeQuestion(id: string) {
    const next = questions.filter((q) => q._id !== id);
    onChange(next);
    if (openId === id) setOpenId(next[0]?._id ?? null);
  }

  function duplicateQuestion(id: string) {
    const idx = questions.findIndex((q) => q._id === id);
    if (idx === -1) return;
    const orig = questions[idx];
    const dup: EditorQuestion = {
      ...orig,
      _id: uid(),
      dbId: undefined, // neue Frage → kein DB-Eintrag
      questionKey: "", // wird aus Titel beim Speichern neu generiert
      title: orig.title ? `${orig.title} (Kopie)` : "",
      options: orig.options.map((o) => ({ ...o, _id: uid() })),
    };
    const next = [...questions.slice(0, idx + 1), dup, ...questions.slice(idx + 1)];
    onChange(next);
    setOpenId(dup._id);
  }

  function updateQ(id: string, patch: Partial<EditorQuestion>) {
    onChange(updateQuestion(questions, id, patch));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...questions];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }

  function moveDown(idx: number) {
    if (idx === questions.length - 1) return;
    const next = [...questions];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          Noch keine Fragen. Füge deine erste Frage hinzu.
        </p>
      )}

      {questions.map((q, idx) => (
        <QuestionCard
          key={q._id}
          question={q}
          index={idx}
          total={questions.length}
          isOpen={openId === q._id}
          onToggle={() => setOpenId(openId === q._id ? null : q._id)}
          onUpdate={(patch) => updateQ(q._id, patch)}
          onRemove={() => removeQuestion(q._id)}
          onDuplicate={() => duplicateQuestion(q._id)}
          onMoveUp={() => moveUp(idx)}
          onMoveDown={() => moveDown(idx)}
          onFocus={(field) => {
            const vi = visibleIndices[idx];
            onFocus(field, vi >= 0 ? vi : undefined);
          }}
        />
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-400 dark:text-gray-500 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors"
      >
        <Plus size={16} />
        Frage hinzufügen
      </button>
    </div>
  );
}
