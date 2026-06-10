"use client";

import { useEffect, useState } from "react";
import { Trash2, ChevronDown, Plus, Split, TriangleAlert } from "lucide-react";
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
import type { EditorState, EditorQuestion, ContactFieldConfig, QuestionType, LogicRule } from "@/types";
import { toKey } from "@/lib/editorUtils";
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
import { SelectedFieldRefContext, SelMark } from "./properties/selection";
import { PanelShell, PanelHeader, Section, Field } from "./ui/Panel";
import { ConfirmModal } from "./ui/ConfirmModal";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  // Aufgabe 57C: Canvas-Selektion (data-edit-field-Ref aus funnel.tsx). Karten-Feld-Klicks
  // ("card_field_<id>") klappen rechts die passende Feld-Zeile auf.
  selectedFieldRef?: string;
  // Aufgabe 58: Logik-Regeln des Funnels (für die Kurzfassung in der „Logik"-Sektion)
  // + Öffner für den Regel-Editor (LogicRuleModal lebt im EditorShell).
  logicRules?: LogicRule[];
  onOpenLogicEditor?: (index: number) => void;
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
  selectedFieldRef,
  logicRules,
  onOpenLogicEditor,
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

  // Aufgabe 57C: markiertes Ziel-Element bei Selektions-Wechsel ins Sichtfeld scrollen.
  // data-sel-target setzen SelMark + die Karten-Feld-Rows. globalThis.CSS: das nackte
  // `CSS` ist hier der dnd-kit-Import (Shadowing).
  useEffect(() => {
    if (!selectedFieldRef) return;
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-sel-target="${globalThis.CSS.escape(selectedFieldRef)}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [selectedFieldRef]);

  return (
    <SelectedFieldRefContext.Provider value={selectedFieldRef ?? ""}>
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
          selectedFieldRef={selectedFieldRef}
          logicRules={logicRules}
          onOpenLogicEditor={onOpenLogicEditor}
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
          logicRules={logicRules}
          onOpenLogicEditor={onOpenLogicEditor}
          onPatchQuestion={onPatchQuestion}
          onDelete={() => onDeleteQuestion(selected.questionIndex)}
        />
      ) : (
        <SuccessProps state={state} onPatch={onPatch} />
      )}
    </PanelShell>
    </SelectedFieldRefContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Question — Page-Level + immer-expandiertes Field
   ───────────────────────────────────────────────────────────────────────────── */

interface QuestionPropsArgs {
  state: EditorState;
  index: number;
  logicRules?: LogicRule[];
  onOpenLogicEditor?: (index: number) => void;
  onPatchQuestion: (index: number, patch: Partial<EditorQuestion>) => void;
  onDelete: () => void;
}

function QuestionProps({ state, index, logicRules, onOpenLogicEditor, onPatchQuestion, onDelete }: QuestionPropsArgs) {
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
          <SelMark refKey="question_title">
            <TextInput
              value={q.title}
              onChange={(v) => onPatchQuestion(index, { title: v })}
              placeholder="z. B. Welche Heizung haben Sie?"
            />
          </SelMark>
        </Field>
        <Field label="Untertitel (optional)">
          <SelMark refKey="question_subtitle">
            <TextInput
              value={q.subtitle}
              onChange={(v) => onPatchQuestion(index, { subtitle: v })}
              placeholder="z. B. Bitte wähle eine Option."
            />
          </SelMark>
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

      <LogicSection
        q={q}
        index={index}
        questions={state.questions}
        rules={logicRules ?? []}
        onEdit={onOpenLogicEditor}
      />

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
  selectedFieldRef,
  logicRules,
  onOpenLogicEditor,
  onPatchQuestion,
  onDelete,
  onPatchCustomField,
  onAddCustomField,
  onDeleteCustomField,
  onReorderCustomFields,
}: {
  state: EditorState;
  index: number;
  selectedFieldRef?: string;
  logicRules?: LogicRule[];
  onOpenLogicEditor?: (index: number) => void;
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

  // Aufgabe 57C: Canvas-Klick auf ein Karten-Feld klappt die passende Feld-Zeile auf.
  // Der Ref-Suffix IST die Row-Identität (_clientId ?? key — selbes Konstrukt wie cid unten);
  // matcht nichts, klappt nichts auf. Bewusst NUR selectedFieldRef als Dependency: manuelles
  // Zuklappen bleibt möglich, solange die Selektion unverändert ist.
  // selectedCardFieldId zusätzlich abgeleitet (nicht nur im Effect): markiert die Row mit
  // einem Selektions-Ring, solange die Canvas-Selektion auf ihr steht.
  const selectedCardFieldId = selectedFieldRef?.startsWith("card_field_")
    ? selectedFieldRef.slice("card_field_".length)
    : null;
  useEffect(() => {
    if (!selectedFieldRef?.startsWith("card_field_")) return;
    setExpandedClientId(selectedFieldRef.slice("card_field_".length));
    // Scroll übernimmt der generische data-sel-target-Effect im PropertiesPanel.
  }, [selectedFieldRef]);

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
          <SelMark refKey="question_title">
            <TextInput
              value={page.title}
              onChange={(v) => onPatchQuestion(index, { title: v })}
              placeholder="z. B. Adresse eingeben"
            />
          </SelMark>
        </Field>
        <Field label="Untertitel (optional)">
          <SelMark refKey="question_subtitle">
            <TextInput
              value={page.subtitle}
              onChange={(v) => onPatchQuestion(index, { subtitle: v })}
              placeholder="z. B. Wir benötigen deine Anschrift für ein Angebot."
            />
          </SelMark>
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
                    highlighted={selectedCardFieldId === cid}
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

      <LogicSection
        q={page}
        index={index}
        questions={state.questions}
        rules={logicRules ?? []}
        onEdit={onOpenLogicEditor}
      />

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

/* ─────────────────────────────────────────────────────────────────────────────
   Aufgabe 58 — Logik-Kurzfassung pro Step. Zeigt die Regeln in Lesefassung
   („Wenn „B" → Schritt 5 · Alle anderen Fälle → Ende") + öffnet den Regel-Editor
   (LogicRuleModal, lebt im EditorShell). Ungespeicherte Steps (ohne dbId) können
   keine Regeln tragen — Hinweis statt Button.
   ───────────────────────────────────────────────────────────────────────────── */

function LogicSection({
  q,
  index,
  questions,
  rules,
  onEdit,
}: {
  q: EditorQuestion;
  index: number;
  questions: EditorQuestion[];
  rules: LogicRule[];
  onEdit?: (index: number) => void;
}) {
  if (!onEdit) return null;

  const ofPage = q.dbId
    ? rules.filter((r) => r.sourcePageId === q.dbId).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // Anzeige-Nummerierung wie in der StepList (Welcome zählt nicht mit).
  const numberByDbId = new Map<string, number>();
  let n = 0;
  for (const qq of questions) {
    if (qq.kind !== "welcome") n++;
    if (qq.dbId) numberByDbId.set(qq.dbId, n);
  }

  function valueLabel(c: { value: string }): string {
    if (q.kind === "custom") return c.value; // Karten-Options sind plain strings = gespeicherte Werte
    const opt = q.options.find((o) => (o.value || toKey(o.label)) === c.value);
    return opt?.label ?? c.value;
  }

  // Kompakter Operator-Präfix für die Kurzfassung („Wenn ≥ „4" → Schritt 5").
  function opPrefix(op: LogicRule["conditions"][number]["op"]): string {
    switch (op) {
      case "neq":      return "nicht ";
      case "contains": return "enthält ";
      case "gte":      return "≥ ";
      case "lte":      return "≤ ";
      case "gt":       return "> ";
      case "lt":       return "< ";
      default:         return "";
    }
  }

  function targetLabel(r: LogicRule): { text: string; broken: boolean } {
    if (r.targetType === "end") return { text: "Ende", broken: false };
    const num = r.targetPageId ? numberByDbId.get(r.targetPageId) : undefined;
    if (num === undefined) return { text: "Ziel gelöscht → weiter", broken: true };
    return { text: `Schritt ${num}`, broken: false };
  }

  return (
    <Section title="Logik">
      {!q.dbId ? (
        <p className="px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Logik braucht gespeicherte Schritte — bitte zuerst speichern.
        </p>
      ) : (
        <>
          {ofPage.length === 0 ? (
            <p className="px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Keine Regeln — nach diesem Schritt geht es linear weiter.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {ofPage.map((r) => {
                const t = targetLabel(r);
                return (
                  <li
                    key={r.id}
                    className="flex items-start gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs leading-relaxed text-gray-700 dark:border-gray-700 dark:text-gray-300"
                  >
                    {t.broken ? (
                      <TriangleAlert size={12} className="mt-0.5 shrink-0 text-amber-500" />
                    ) : (
                      <Split size={12} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span className="min-w-0 flex-1">
                      {r.isFallback
                        ? "Alle anderen Fälle"
                        : `Wenn ${r.conditions.map((c) => `${opPrefix(c.op)}„${valueLabel(c)}"`).join(" und ")}`}
                      {" → "}
                      <span className={t.broken ? "text-amber-600 dark:text-amber-400" : "font-medium"}>
                        {t.text}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={() => onEdit(index)}
            className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-400"
          >
            <Split size={14} />
            Logik bearbeiten
          </button>
        </>
      )}
    </Section>
  );
}

function SortableContactFieldRow({
  field,
  expanded,
  highlighted,
  onToggle,
  onPatch,
  onDelete,
}: {
  field: ContactFieldConfig;
  expanded: boolean;
  // Aufgabe 57C: Canvas-Selektion zeigt auf dieses Feld → Selektions-Ring
  highlighted?: boolean;
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
    // data-sel-target: Scroll-Anker für die Canvas-Klick-Selektion (Aufgabe 57C)
    <div ref={setNodeRef} style={style} data-sel-target={`card_field_${field._clientId ?? field.key}`} {...attributes}>
      <FieldRow
        icon={icon}
        pillClass={pillClass}
        label={field.label || field.key}
        typeLabel={typeLabel}
        expanded={expanded}
        highlighted={highlighted}
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
          <SelMark refKey="question_title">
            <TextInput
              value={page.title}
              onChange={(v) => onPatchQuestion(index, { title: v })}
              placeholder="z. B. Willkommen!"
            />
          </SelMark>
        </Field>
        <Field label="Untertitel (optional)">
          <SelMark refKey="question_subtitle">
            <TextInput
              value={page.subtitle}
              onChange={(v) => onPatchQuestion(index, { subtitle: v })}
              placeholder="z. B. In den nächsten 2 Minuten…"
            />
          </SelMark>
        </Field>
        <Field label="Button-Text">
          <SelMark refKey="welcome_button_label">
            <TextInput
              value={page.welcomeButtonLabel ?? "Los geht's →"}
              onChange={(v) => onPatchQuestion(index, { welcomeButtonLabel: v })}
              placeholder="z. B. Los geht's →"
            />
          </SelMark>
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
          <SelMark refKey="success_message">
            <TextInput
              value={state.successMessage}
              onChange={(v) => onPatch({ successMessage: v })}
              placeholder="z. B. Vielen Dank für deine Anfrage!"
            />
          </SelMark>
        </Field>
        {/* Aufgabe 51: Antwort-Text ist optional. Standard ist vorausgefüllt; leer lassen =
            zweite Zeile wird im Widget nicht angezeigt (kein erzwungener Default beim Rendern). */}
        <Field label="Antwort-Text (optional)">
          <SelMark refKey="response_message">
            <TextInput
              value={state.responseMessage}
              onChange={(v) => onPatch({ responseMessage: v })}
              placeholder="z. B. Wir melden uns in den nächsten 24 Stunden."
            />
          </SelMark>
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
            <SelMark refKey="answers_overview_label">
              <TextInput
                value={state.answersOverviewLabel}
                onChange={(v) => onPatch({ answersOverviewLabel: v })}
                placeholder="z. B. Deine Angaben im Überblick:"
              />
            </SelMark>
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
