"use client";

import { useState } from "react";
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
  SUCCESS_META,
  CUSTOM_META,
  WELCOME_META,
  contactFieldTypeLabel,
  QUESTION_TYPE_OPTIONS,
} from "./fieldMeta";
import { FieldRow } from "./properties/FieldRow";
import { FieldProperties } from "./properties/FieldProperties";
import { AddContactFieldPicker } from "./properties/AddContactFieldPicker";
import { PanelShell, PanelHeader, Section, Field } from "./ui/Panel";
import { ConfirmModal } from "./ui/ConfirmModal";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  onPatch: (patch: Partial<EditorState>) => void;
  onPatchQuestion: (index: number, patch: Partial<EditorQuestion>) => void;
  onDeleteQuestion: (index: number) => void;
  // Aufgabe 38: Custom-Multi-Field-Page Field-Operationen (pro page index + clientId)
  onPatchCustomField: (pageIndex: number, clientId: string, patch: Partial<ContactFieldConfig>) => void;
  onAddCustomField: (pageIndex: number, type: ContactFieldConfig["type"]) => void;
  onDeleteCustomField: (pageIndex: number, clientId: string) => void;
  onReorderCustomFields: (pageIndex: number, next: ContactFieldConfig[]) => void;
}

export function PropertiesPanel({
  state,
  selected,
  onPatch,
  onPatchQuestion,
  onDeleteQuestion,
  onPatchCustomField,
  onAddCustomField,
  onDeleteCustomField,
  onReorderCustomFields,
}: Props) {
  // Aufgabe 38 + 39: Step-Kind aus state.questions[].kind ableiten
  const currentStep = selected.kind === "question" ? state.questions[selected.questionIndex] : null;
  const isCustomPage = currentStep?.kind === "custom";
  const isWelcomePage = currentStep?.kind === "welcome";

  return (
    <PanelShell>
      {selected.kind === "question" && isWelcomePage ? (
        <WelcomeProps
          state={state}
          index={selected.questionIndex}
          onPatchQuestion={onPatchQuestion}
          onDelete={() => onDeleteQuestion(selected.questionIndex)}
        />
      ) : selected.kind === "question" && isCustomPage ? (
        <CustomPageProps
          state={state}
          index={selected.questionIndex}
          onPatchQuestion={onPatchQuestion}
          onDelete={() => onDeleteQuestion(selected.questionIndex)}
          onPatchCustomField={(clientId, patch) => onPatchCustomField(selected.questionIndex, clientId, patch)}
          onAddCustomField={(type) => onAddCustomField(selected.questionIndex, type)}
          onDeleteCustomField={(clientId) => onDeleteCustomField(selected.questionIndex, clientId)}
          onReorderCustomFields={(next) => onReorderCustomFields(selected.questionIndex, next)}
        />
      ) : selected.kind === "question" ? (
        <QuestionProps
          state={state}
          index={selected.questionIndex}
          onPatchQuestion={onPatchQuestion}
          onDelete={() => onDeleteQuestion(selected.questionIndex)}
        />
      ) : (
        <SuccessProps state={state} onPatch={onPatch} />
      )}
    </PanelShell>
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
  const [confirmDelete, setConfirmDelete] = useState(false);
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

      {/* Aufgabe 50: flacher — kein „Feld dieser Seite"-Wrapper mehr. Eine Frage-Seite hat genau
          ein Feld, die Verschachtelung war unnötig. Field-Properties direkt unter einer flachen Section. */}
      <Section title="Frage">
        <FieldProperties
          kind="question"
          question={q}
          onPatch={(patch) => onPatchQuestion(index, patch)}
        />
      </Section>

      <Section>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} />
          Seite löschen
        </button>
      </Section>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        title="Frage löschen?"
        message="Diese Aktion kann nur durch Verwerfen ungespeicherter Änderungen rückgängig gemacht werden."
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Aufgabe 38: CustomPageProps — Karte mit mehreren Feldern
   Re-uses SubmitProps pattern (Section "Seite" mit Titel/Subtitle + Section "Felder" mit
   Drag-Reorder + AddContactFieldPicker). Unterschied: kein Submit-Toggle, kein Button-Text,
   und Page ist löschbar (nicht Pflicht wie das Kontaktformular).
   ───────────────────────────────────────────────────────────────────────────── */

function CustomPageProps({
  state,
  index,
  onPatchQuestion,
  onDelete,
  onPatchCustomField,
  onAddCustomField,
  onDeleteCustomField,
  onReorderCustomFields,
}: {
  state: EditorState;
  index: number;
  onPatchQuestion: (index: number, patch: Partial<EditorQuestion>) => void;
  onDelete: () => void;
  onPatchCustomField: (clientId: string, patch: Partial<ContactFieldConfig>) => void;
  onAddCustomField: (type: ContactFieldConfig["type"]) => void;
  onDeleteCustomField: (clientId: string) => void;
  onReorderCustomFields: (next: ContactFieldConfig[]) => void;
}) {
  const page = state.questions[index];
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Aufgabe 40 Polish: expanded-State trackt jetzt _clientId statt key (stabil bei key-Edit).
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!page || page.kind !== "custom") {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Keine Karte ausgewählt.</div>;
  }
  const fields = page.customFields ?? [];

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => (f._clientId ?? f.key) === active.id);
    const newIdx = fields.findIndex((f) => (f._clientId ?? f.key) === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorderCustomFields(arrayMove(fields, oldIdx, newIdx));
  }

  return (
    <div className="flex flex-col">
      <Header kindLabel={CUSTOM_META.label} kindIcon={CUSTOM_META.icon} pillClass={CUSTOM_META.pillClass} />

      <Section title="Seite">
        <Field label="Überschrift">
          <TextInput
            value={page.title}
            onChange={(v) => onPatchQuestion(index, { title: v })}
            placeholder="z. B. Adresse eingeben"
          />
        </Field>
        <Field label="Untertitel (optional)">
          <TextInput
            value={page.subtitle}
            onChange={(v) => onPatchQuestion(index, { subtitle: v })}
            placeholder="z. B. Wir benötigen deine Anschrift für ein Angebot."
          />
        </Field>
        <Toggle
          label="Sichtbar im Funnel"
          enabled={page.visible !== false}
          onToggle={(next) => onPatchQuestion(index, { visible: next })}
        />
      </Section>

      <Section title="Felder dieser Karte">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={fields.map((f) => f._clientId ?? f.key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              {fields.map((f) => {
                const cid = f._clientId ?? f.key;
                return (
                  <SortableContactFieldRow
                    key={cid}
                    field={f}
                    expanded={expandedClientId === cid}
                    onToggle={() => setExpandedClientId((prev) => (prev === cid ? null : cid))}
                    onPatch={(patch) => onPatchCustomField(cid, patch)}
                    onDelete={() => onDeleteCustomField(cid)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {fields.length === 0 && (
          <p className="px-1 py-2 text-xs text-gray-400 dark:text-gray-500">
            Noch keine Felder. Mit „Feld hinzufügen" anlegen.
          </p>
        )}

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
          onSelect={(type) => onAddCustomField(type)}
        />
      </Section>

      <Section>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} />
          Karte löschen
        </button>
      </Section>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        title="Karte löschen?"
        message="Diese Aktion kann nur durch Verwerfen ungespeicherter Änderungen rückgängig gemacht werden."
      />
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
  // Aufgabe 40 Polish: useSortable id ist stable _clientId, nicht field.key — sonst remount bei
  // Live-Key-Sync mitten im Tippen.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: field._clientId ?? field.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  const typeLabel = contactFieldTypeLabel(field.type);
  // Aufgabe 39 Polish: erweitert um long_text/number/date/checkbox/dropdown
  const iconByType: Record<ContactFieldConfig["type"], string> = {
    text: "T",
    long_text: "¶",
    email: "@",
    tel: "☎",
    plz: "⌗",
    radio: "◉",
    dropdown: "▽",
    number: "#",
    date: "▦",
    checkbox: "☑",
    slider: "≡",
    multi_choice: "☑",
    rating: "★",
    scale: "⊢",
    // Aufgabe 40 Polish
    first_name: "👤",
    last_name: "👤",
    full_name: "👤",
  };
  const icon = iconByType[field.type] ?? "T";
  const TEXT_PILL = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
  const CHOICE_PILL = "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800";
  const NUMERIC_PILL = "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
  const RATING_PILL = "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
  const pillByType: Record<ContactFieldConfig["type"], string> = {
    text: TEXT_PILL, long_text: TEXT_PILL, email: TEXT_PILL, tel: TEXT_PILL, plz: TEXT_PILL,
    radio: CHOICE_PILL, dropdown: CHOICE_PILL, multi_choice: CHOICE_PILL,
    number: NUMERIC_PILL, date: NUMERIC_PILL, checkbox: NUMERIC_PILL, slider: NUMERIC_PILL,
    rating: RATING_PILL, scale: RATING_PILL,
    // Aufgabe 40 Polish — Name-Fields wie TEXT
    first_name: TEXT_PILL, last_name: TEXT_PILL, full_name: TEXT_PILL,
  };
  const pillClass = pillByType[field.type] ?? TEXT_PILL;

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
        visible={field.visible}
        onToggleVisible={() => onPatch({ visible: !field.visible })}
      >
        <FieldProperties kind="contact" contactField={field} onPatch={onPatch} />
      </FieldRow>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Aufgabe 39: WelcomeProps — Optionaler Intro-Step am Anfang
   ───────────────────────────────────────────────────────────────────────────── */

function WelcomeProps({
  state,
  index,
  onPatchQuestion,
  onDelete,
}: {
  state: EditorState;
  index: number;
  onPatchQuestion: (index: number, patch: Partial<EditorQuestion>) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const page = state.questions[index];
  if (!page || page.kind !== "welcome") {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Kein Welcome-Step ausgewählt.</div>;
  }
  return (
    <div className="flex flex-col">
      <Header kindLabel={WELCOME_META.label} kindIcon={WELCOME_META.icon} pillClass={WELCOME_META.pillClass} />

      <Section title="Seite">
        <Field label="Überschrift">
          <TextInput
            value={page.title}
            onChange={(v) => onPatchQuestion(index, { title: v })}
            placeholder="z. B. Willkommen!"
          />
        </Field>
        <Field label="Untertitel (optional)">
          <TextInput
            value={page.subtitle}
            onChange={(v) => onPatchQuestion(index, { subtitle: v })}
            placeholder="z. B. In den nächsten 2 Minuten…"
          />
        </Field>
        <Field label="Button-Text">
          <TextInput
            value={page.welcomeButtonLabel ?? "Los geht's →"}
            onChange={(v) => onPatchQuestion(index, { welcomeButtonLabel: v })}
            placeholder="z. B. Los geht's →"
          />
        </Field>
        <Toggle
          label="Sichtbar im Funnel"
          enabled={page.visible !== false}
          onToggle={(next) => onPatchQuestion(index, { visible: next })}
        />
      </Section>

      <Section>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 size={14} />
          Welcome-Screen löschen
        </button>
      </Section>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        title="Welcome-Screen löschen?"
        message="Der Intro-Screen wird entfernt. Diese Aktion kann nur durch Verwerfen ungespeicherter Änderungen rückgängig gemacht werden."
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Success / End-Screen — Aufgabe 39: Modus-Toggle (Content / Redirect)
   ───────────────────────────────────────────────────────────────────────────── */

function SuccessProps({
  state,
  onPatch,
}: {
  state: EditorState;
  onPatch: (patch: Partial<EditorState>) => void;
}) {
  const isRedirectMode = (state.redirectUrl ?? "").trim().length > 0;

  return (
    <div className="flex flex-col">
      <Header kindLabel={SUCCESS_META.label} kindIcon={SUCCESS_META.icon} pillClass={SUCCESS_META.pillClass} />

      <Section title="Modus">
        <Toggle
          label="Nach Submit auf URL weiterleiten"
          enabled={isRedirectMode}
          onToggle={(next) => onPatch({ redirectUrl: next ? "https://" : "" })}
        />
        {isRedirectMode && (
          <Field label="Redirect-URL">
            <TextInput
              value={state.redirectUrl}
              onChange={(v) => onPatch({ redirectUrl: v })}
              placeholder="https://deine-seite.de/danke"
            />
          </Field>
        )}
        <p className="px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {isRedirectMode
            ? "Widget zeigt die Erfolgsseite kurz an (~1.5s, damit Tracking-Pixel feuern) und leitet danach auf die URL um."
            : "Widget zeigt die Erfolgsseite mit den Texten unten."}
        </p>
      </Section>

      <Section title="Seite">
        <Field label="Erfolgs-Überschrift">
          <TextInput
            value={state.successMessage}
            onChange={(v) => onPatch({ successMessage: v })}
            placeholder="z. B. Vielen Dank für deine Anfrage!"
          />
        </Field>
        {/* Aufgabe 51: Antwort-Text ist optional. Standard ist vorausgefüllt; leer lassen =
            zweite Zeile wird im Widget nicht angezeigt (kein erzwungener Default beim Rendern). */}
        <Field label="Antwort-Text (optional)">
          <TextInput
            value={state.responseMessage}
            onChange={(v) => onPatch({ responseMessage: v })}
            placeholder="z. B. Wir melden uns in den nächsten 24 Stunden."
          />
        </Field>
        <p className="px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Leer lassen, wenn du keine zweite Zeile willst — dann wird sie nicht angezeigt.
        </p>
      </Section>

      <Section title="Antworten-Übersicht">
        <Toggle
          label="Antworten-Übersicht zeigen"
          enabled={state.showAnswersOverview}
          onToggle={(next) => onPatch({ showAnswersOverview: next })}
        />
        {state.showAnswersOverview && (
          <Field label="Überschrift">
            <TextInput
              value={state.answersOverviewLabel}
              onChange={(v) => onPatch({ answersOverviewLabel: v })}
              placeholder="z. B. Deine Angaben im Überblick:"
            />
          </Field>
        )}
        <p className="px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Aus = cleaner Dank-Screen ohne Antworten. An = der Lead sieht seine Angaben nochmal.
        </p>
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

// Aufgabe 45: delegiert an den geteilten PanelHeader (Section/Field kommen aus ui/Panel).
function Header({
  kindLabel,
  kindIcon,
  pillClass,
}: {
  kindLabel: string;
  kindIcon: string;
  pillClass: string;
}) {
  return <PanelHeader badge={kindIcon} badgeClass={pillClass} scope="Seitentyp" title={kindLabel} />;
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:disabled:bg-gray-800/40 dark:disabled:text-gray-500"
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
              ? "inline-block h-4 w-4 translate-x-4.5 transform rounded-full bg-white shadow transition"
              : "inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white shadow transition"
          }
        />
      </button>
    </div>
  );
}

// Aufgabe 55: Typ-Wahl als Icon-Galerie-Popover statt nacktem <select> — nutzt dieselben
// Typ-Chips (Icon + Pill-Farbe) wie StepList/FieldRow, damit der Tenant die Typen visuell
// wiedererkennt. Verhalten identisch: Auswahl ruft onChange(questionType).
function TypeSelect({
  value,
  onChange,
}: {
  value: QuestionType;
  onChange: (t: QuestionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = questionMeta(value);
  const options = QUESTION_TYPE_OPTIONS
    // Aufgabe 40 Polish: Name-Field-Types nicht als eigenständige Question-Type
    // anbieten — die gehören nur in Multi-Field-Karten.
    .filter((o) => o.value !== "first_name" && o.value !== "last_name" && o.value !== "full_name");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none transition hover:border-gray-400 focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600"
      >
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${current.pillClass}`}
        >
          {current.icon}
        </span>
        <span className="flex-1 text-left">{current.label}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform dark:text-gray-500 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Outside-Click-Fänger */}
          <button
            type="button"
            aria-label="Typ-Auswahl schließen"
            tabIndex={-1}
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute left-0 right-0 z-30 mt-1 grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            {options.map((o) => {
              const m = questionMeta(o.value);
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${m.pillClass}`}
                  >
                    {m.icon}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
