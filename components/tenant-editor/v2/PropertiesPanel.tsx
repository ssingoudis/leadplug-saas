"use client";

import { useEffect, useState } from "react";
import { Trash2, ChevronDown, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { EditorState, EditorQuestion, ContactFieldConfig, QuestionType } from "@/types";
import type { SelectedStep } from "./types";
import {
  questionMeta,
  SUBMIT_META,
  SUCCESS_META,
  contactFieldTypeLabel,
  QUESTION_TYPE_OPTIONS,
} from "./fieldMeta";
import { FieldRow } from "./properties/FieldRow";
import { FieldProperties } from "./properties/FieldProperties";
import { AddContactFieldPicker } from "./properties/AddContactFieldPicker";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  onPatch: (patch: Partial<EditorState>) => void;
  onPatchQuestion: (index: number, patch: Partial<EditorQuestion>) => void;
  onDeleteQuestion: (index: number) => void;
  // Submit-Page contact field operations
  onPatchContactField: (key: string, patch: Partial<ContactFieldConfig>) => void;
  onAddContactField: (type: ContactFieldConfig["type"]) => void;
  onDeleteContactField: (key: string) => void;
  onReorderContactFields: (next: ContactFieldConfig[]) => void;
}

export function PropertiesPanel({
  state,
  selected,
  onPatch,
  onPatchQuestion,
  onDeleteQuestion,
  onPatchContactField,
  onAddContactField,
  onDeleteContactField,
  onReorderContactFields,
}: Props) {
  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {selected.kind === "question" ? (
        <QuestionProps
          state={state}
          index={selected.questionIndex}
          onPatchQuestion={onPatchQuestion}
          onDelete={() => onDeleteQuestion(selected.questionIndex)}
        />
      ) : selected.kind === "submit" ? (
        <SubmitProps
          state={state}
          onPatch={onPatch}
          onPatchContactField={onPatchContactField}
          onAddContactField={onAddContactField}
          onDeleteContactField={onDeleteContactField}
          onReorderContactFields={onReorderContactFields}
        />
      ) : (
        <SuccessProps state={state} onPatch={onPatch} />
      )}
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Question — Page-Level + immer-expandiertes Field
   ───────────────────────────────────────────────────────────────────────────── */

interface QuestionPropsArgs {
  state: EditorState;
  index: number;
  onPatchQuestion: (index: number, patch: Partial<EditorQuestion>) => void;
  onDelete: () => void;
}

function QuestionProps({ state, index, onPatchQuestion, onDelete }: QuestionPropsArgs) {
  const q = state.questions[index];
  if (!q) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Keine Frage ausgewählt.</div>;
  }
  const meta = questionMeta(q.questionType);

  return (
    <div className="flex flex-col">
      <Header kindLabel={meta.label} kindIcon={meta.icon} pillClass={meta.pillClass} />

      <Section title="Seite">
        <Field label="Fragetyp">
          <TypeSelect
            value={q.questionType}
            onChange={(t) => onPatchQuestion(index, { questionType: t })}
          />
        </Field>
        <Field label="Titel">
          <TextInput
            value={q.title}
            onChange={(v) => onPatchQuestion(index, { title: v })}
            placeholder="z. B. Welche Heizung haben Sie?"
          />
        </Field>
        <Field label="Untertitel (optional)">
          <TextInput
            value={q.subtitle}
            onChange={(v) => onPatchQuestion(index, { subtitle: v })}
            placeholder="z. B. Bitte wähle eine Option."
          />
        </Field>
        <Toggle
          label="Sichtbar im Funnel"
          enabled={q.visible !== false}
          onToggle={(next) => onPatchQuestion(index, { visible: next })}
        />
      </Section>

      <Section title="Feld dieser Seite">
        <FieldRow
          icon={meta.icon}
          pillClass={meta.pillClass}
          label="Frage"
          typeLabel={meta.label}
          expandable={false}
          expanded={true}
          onToggle={() => {}}
        >
          <FieldProperties
            kind="question"
            question={q}
            onPatch={(patch) => onPatchQuestion(index, patch)}
          />
        </FieldRow>
      </Section>

      <Section>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                "Diese Frage wirklich löschen? Diese Aktion kann nur durch Verwerfen ungespeicherter Änderungen rückgängig gemacht werden.",
              )
            ) {
              onDelete();
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} />
          Seite löschen
        </button>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Submit (Kontaktformular) — Page-Level + Multi-Field-Liste
   ───────────────────────────────────────────────────────────────────────────── */

function SubmitProps({
  state,
  onPatch,
  onPatchContactField,
  onAddContactField,
  onDeleteContactField,
  onReorderContactFields,
}: {
  state: EditorState;
  onPatch: (patch: Partial<EditorState>) => void;
  onPatchContactField: (key: string, patch: Partial<ContactFieldConfig>) => void;
  onAddContactField: (type: ContactFieldConfig["type"]) => void;
  onDeleteContactField: (key: string) => void;
  onReorderContactFields: (next: ContactFieldConfig[]) => void;
}) {
  // Welcher Kontakt-Feld-Key ist momentan expandiert? Lokaler UI-State, kein EditorState-Touch.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);

  // Reset wenn ein expandiertes Field gelöscht wurde
  useEffect(() => {
    if (expandedKey && !state.contactFields.some((f) => f.key === expandedKey)) {
      setExpandedKey(null);
    }
  }, [expandedKey, state.contactFields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = state.contactFields.findIndex((f) => f.key === active.id);
    const newIdx = state.contactFields.findIndex((f) => f.key === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorderContactFields(arrayMove(state.contactFields, oldIdx, newIdx));
  }

  return (
    <div className="flex flex-col">
      <Header kindLabel={SUBMIT_META.label} kindIcon={SUBMIT_META.icon} pillClass={SUBMIT_META.pillClass} />

      <Section title="Seite">
        <Field label="Überschrift">
          <TextInput
            value={state.funnelTitle}
            onChange={(v) => onPatch({ funnelTitle: v })}
            placeholder="z. B. Letzter Schritt!"
          />
        </Field>
        <Field label="Untertitel">
          <TextInput
            value={state.contactFormSubtitle}
            onChange={(v) => onPatch({ contactFormSubtitle: v })}
            placeholder="z. B. Wir melden uns innerhalb von 24h."
          />
        </Field>
        <Field label="Button-Text">
          <TextInput
            value={state.submitButtonLabel}
            onChange={(v) => onPatch({ submitButtonLabel: v })}
            placeholder="z. B. Jetzt anfragen"
          />
        </Field>
      </Section>

      <Section title="Felder dieser Seite">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={state.contactFields.map((f) => f.key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              {state.contactFields.map((f) => (
                <SortableContactFieldRow
                  key={f.key}
                  field={f}
                  expanded={expandedKey === f.key}
                  onToggle={() => setExpandedKey((prev) => (prev === f.key ? null : f.key))}
                  onPatch={(patch) => onPatchContactField(f.key, patch)}
                  onDelete={() => onDeleteContactField(f.key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={() => setShowAddPicker(true)}
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-400"
        >
          <Plus size={14} />
          Feld hinzufügen
        </button>

        <AddContactFieldPicker
          open={showAddPicker}
          onClose={() => setShowAddPicker(false)}
          onSelect={(type) => onAddContactField(type)}
        />
      </Section>

      <Section>
        <p className="px-1 text-xs text-gray-400 dark:text-gray-500">
          Das Kontaktformular ist Pflicht und kann nicht gelöscht werden.
        </p>
      </Section>
    </div>
  );
}

function SortableContactFieldRow({
  field,
  expanded,
  onToggle,
  onPatch,
  onDelete,
}: {
  field: ContactFieldConfig;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<ContactFieldConfig>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  const typeLabel = contactFieldTypeLabel(field.type);
  const icon =
    field.type === "radio"
      ? "◉"
      : field.type === "email"
        ? "@"
        : field.type === "tel"
          ? "☎"
          : field.type === "plz"
            ? "⌗"
            : "T";
  const pillClass =
    field.type === "radio"
      ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
      : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <FieldRow
        icon={icon}
        pillClass={pillClass}
        label={field.label || field.key}
        typeLabel={typeLabel}
        expanded={expanded}
        onToggle={onToggle}
        dragHandleProps={{ ref: setActivatorNodeRef, ...listeners }}
        onDelete={onDelete}
      >
        <FieldProperties kind="contact" contactField={field} onPatch={onPatch} />
      </FieldRow>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Success — unverändert
   ───────────────────────────────────────────────────────────────────────────── */

function SuccessProps({
  state,
  onPatch,
}: {
  state: EditorState;
  onPatch: (patch: Partial<EditorState>) => void;
}) {
  return (
    <div className="flex flex-col">
      <Header kindLabel={SUCCESS_META.label} kindIcon={SUCCESS_META.icon} pillClass={SUCCESS_META.pillClass} />

      <Section title="Seite">
        <Field label="Erfolgs-Überschrift">
          <TextInput
            value={state.successMessage}
            onChange={(v) => onPatch({ successMessage: v })}
            placeholder="z. B. Vielen Dank für deine Anfrage!"
          />
        </Field>
        <Field label="Antwort-Text">
          <TextInput
            value={state.responseMessage}
            onChange={(v) => onPatch({ responseMessage: v })}
            placeholder="z. B. Wir melden uns in den nächsten 24 Stunden."
          />
        </Field>
        <Field label='Label "Antwort-Übersicht"'>
          <TextInput
            value={state.answersOverviewLabel}
            onChange={(v) => onPatch({ answersOverviewLabel: v })}
            placeholder="z. B. Deine Angaben"
          />
        </Field>
      </Section>

      <Section>
        <p className="px-1 text-xs text-gray-400 dark:text-gray-500">
          Die Erfolgsseite ist Pflicht und kann nicht gelöscht werden.
        </p>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Shared building blocks
   ───────────────────────────────────────────────────────────────────────────── */

function Header({
  kindLabel,
  kindIcon,
  pillClass,
}: {
  kindLabel: string;
  kindIcon: string;
  pillClass: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold ${pillClass}`}
      >
        {kindIcon}
      </span>
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Seitentyp
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{kindLabel}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 px-5 py-4 last:border-b-0 dark:border-gray-800/60">
      {title && (
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h3>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
    />
  );
}

function Toggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className={
          enabled
            ? "relative inline-flex h-5 w-9 items-center rounded-full bg-primary transition-colors"
            : "relative inline-flex h-5 w-9 items-center rounded-full bg-gray-300 transition-colors dark:bg-gray-600"
        }
      >
        <span
          className={
            enabled
              ? "inline-block h-4 w-4 translate-x-4 transform rounded-full bg-white shadow transition"
              : "inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white shadow transition"
          }
        />
      </button>
    </div>
  );
}

function TypeSelect({
  value,
  onChange,
}: {
  value: QuestionType;
  onChange: (t: QuestionType) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as QuestionType)}
        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      >
        {QUESTION_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
      />
    </div>
  );
}
