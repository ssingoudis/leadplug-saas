"use client";

import { useState } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uid, toKey, toSlug } from "@/lib/editorUtils";
import { IconPicker } from "@/app/admin/new/IconPicker";
import type { EditorQuestion, EditorOption, EditorState, QuestionType } from "@/types";

interface Props {
  questions: EditorQuestion[];
  onChange: (questions: EditorQuestion[]) => void;
  onFocus: (field: string, questionVisibleIndex?: number) => void;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Einfachauswahl",
  multiple_choice: "Mehrfachauswahl",
  short_text: "Kurztext",
  long_text: "Langtext",
  slider: "Schieberegler",
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

function newOption(): EditorOption {
  const id = uid();
  // value = _id als eindeutiger Startwert; wird beim ersten Eintippen durch den Slug ersetzt
  return { _id: id, label: "", value: id, iconKey: "", iconUrl: "" };
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
    options: [newOption(), newOption()],
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
  onMoveUp,
  onMoveDown,
  onFocus,
}: QuestionCardProps) {
  const isChoice =
    question.questionType === "single_choice" ||
    question.questionType === "multiple_choice";
  const isText =
    question.questionType === "short_text" ||
    question.questionType === "long_text";
  const isSlider = question.questionType === "slider";

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

  function handleOptionIconChange(optId: string, iconKey: string) {
    onUpdate({ options: updateOption(question.options, optId, { iconKey }) });
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
      (type === "single_choice" || type === "multiple_choice") &&
      question.options.length === 0
    ) {
      patch.options = [newOption(), newOption()];
    }
    onUpdate(patch);
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
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
          onClick={onRemove}
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
                    <IconPicker
                      value={opt.iconKey}
                      onChange={(key) => handleOptionIconChange(opt._id, key)}
                    />
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
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                <Plus size={13} />
                Option hinzufügen
              </button>
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
                  data-field="question_title"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Maximum</Label>
                <input
                  type="number"
                  value={question.sliderMax}
                  onChange={(e) => onUpdate({ sliderMax: e.target.value })}
                  data-field="question_title"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Schrittweite</Label>
                <input
                  type="number"
                  value={question.sliderStep}
                  onChange={(e) => onUpdate({ sliderStep: e.target.value })}
                  data-field="question_title"
                  className={inputClass}
                />
              </div>
              <div>
                <Label>Einheit (z.B. m²)</Label>
                <input
                  type="text"
                  value={question.sliderUnit}
                  onChange={(e) => onUpdate({ sliderUnit: e.target.value })}
                  data-field="question_title"
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
                  data-field="question_title"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Text-Config */}
          {isText && (
            <div className="space-y-3">
              <div>
                <Label>Platzhalter-Text</Label>
                <input
                  type="text"
                  value={question.placeholder}
                  onChange={(e) => onUpdate({ placeholder: e.target.value })}
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

export function SectionFragen({ questions, onChange, onFocus }: Props) {
  const [openId, setOpenId] = useState<string | null>(
    questions[0]?._id ?? null,
  );

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

  // Sichtbarer Index jeder Frage (für Preview-Navigation).
  let vc = 0;
  const visibleIndices = questions.map((q) => q.visible !== false ? vc++ : -1);

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
