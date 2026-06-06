"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import type { EditorState, EditorQuestion, QuestionType, ContactFieldConfig } from "@/types";
import { StepPill } from "./StepPill";
import { questionMeta, SUBMIT_META, SUCCESS_META, CUSTOM_META, WELCOME_META } from "./fieldMeta";
import type { SelectedStep } from "./types";
import { isSameStep } from "./types";
import { AddElementModal } from "./AddElementModal";
import { EditorButton } from "./ui/Controls";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  onSelect: (step: SelectedStep) => void;
  onReorder: (nextQuestions: EditorQuestion[]) => void;
  onAddQuestion: (type: QuestionType, atIndex?: number) => void;
  // Aufgabe 50: einfaches Feld → in die gewählte Karte (allowIntoSelected) oder neue Karte an atIndex.
  onAddCardField: (type: ContactFieldConfig["type"], atIndex: number, allowIntoSelected: boolean) => void;
  // Aufgabe 38: Karte mit mehreren Feldern
  onAddCustomPage: (atIndex?: number) => void;
  // Aufgabe 39: Adresse-Quick-Card + Welcome-Screen
  onAddAddressCard: (atIndex?: number) => void;
  // Aufgabe 50: Kontaktdaten-Quick-Card
  onAddContactCard: (atIndex?: number) => void;
  onAddWelcome: (atIndex?: number) => void;
  // Aufgabe 40: Webhook-Badges auf Step-Pills
  webhookCountsByPageId?: Record<string, number>;
  onSwitchToWebhooksTab?: () => void;
}

export function StepList({
  state,
  selected,
  onSelect,
  onReorder,
  onAddQuestion,
  onAddCardField,
  onAddCustomPage,
  onAddAddressCard,
  onAddContactCard,
  onAddWelcome,
  webhookCountsByPageId = {},
  onSwitchToWebhooksTab,
}: Props) {
  // Aufgabe 50: Add-Ziel. `index` = Einfüge-Position. `allowIntoSelected` = darf ein Karten-Feld
  // in die aktuell gewählte Karte wandern (true beim Footer-„Hinzufügen", false bei Insert-Edges,
  // die explizit einen neuen Schritt an einer Position meinen).
  const [addTarget, setAddTarget] = useState<{ index: number; allowIntoSelected: boolean } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = state.questions.findIndex((q) => q._id === active.id);
    const newIndex = state.questions.findIndex((q) => q._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(state.questions, oldIndex, newIndex));
  }

  // Aufgabe 50: Welcome-Step bekommt eine eigene „Start"-Sektion (symmetrisch zum „Abschluss").
  // Bleibt im Datenmodell an Index 0 — hier nur visuell aus dem „Fragen"-Flow herausgelöst und
  // aus dem Drag-Reorder ausgeschlossen (Welcome muss immer zuerst stehen).
  const welcomeIndex = state.questions.findIndex((q) => q.kind === "welcome");
  const hasWelcome = welcomeIndex >= 0;
  const flowQuestions = state.questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => q.kind !== "welcome");
  const flowIds = flowQuestions.map(({ q }) => q._id);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Aufgabe 50: Liste + Footer-Add. Kein eigener Titel-Header (die Sektionen labeln schon). */}
      <div className="flex-1 overflow-y-auto">
      {hasWelcome && (
        <div className="flex flex-col gap-1.5 px-3 pt-4">
          <SectionHeading>Start</SectionHeading>
          <StepPill
            number={null}
            title={state.questions[welcomeIndex].title || "Welcome-Screen"}
            meta={WELCOME_META}
            selected={isSameStep(selected, { kind: "question", questionIndex: welcomeIndex })}
            hidden={state.questions[welcomeIndex].visible === false}
            onClick={() => onSelect({ kind: "question", questionIndex: welcomeIndex })}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5 px-3 py-4">
        <SectionHeading>Fragen</SectionHeading>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={flowIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col">
              {/* Edge oberhalb der ersten Frage — fügt nach einem evtl. Welcome ein (nie davor) */}
              {flowQuestions.length > 0 && (
                <InsertEdge onClick={() => setAddTarget({ index: flowQuestions[0].idx, allowIntoSelected: false })} />
              )}
              {flowQuestions.map(({ q, idx }, pos) => {
                const step: SelectedStep = { kind: "question", questionIndex: idx };
                const webhookCount = q.dbId ? (webhookCountsByPageId[q.dbId] ?? 0) : 0;
                return (
                  <div key={q._id} className="flex flex-col">
                    <SortableQuestionItem
                      question={q}
                      number={pos + 1}
                      selected={isSameStep(selected, step)}
                      onClick={() => onSelect(step)}
                      webhookCount={webhookCount}
                      onWebhookBadgeClick={onSwitchToWebhooksTab}
                    />
                    {/* Edge nach jeder Frage — inkl. der letzten (fügt dann ans Ende der Fragen ein) */}
                    <InsertEdge onClick={() => setAddTarget({ index: idx + 1, allowIntoSelected: false })} />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <AddElementModal
        open={addTarget !== null}
        onClose={() => setAddTarget(null)}
        hideWelcome={hasWelcome}
        onSelectType={(type) => {
          if (addTarget) onAddQuestion(type, addTarget.index);
        }}
        onSelectCardField={(type) => {
          if (addTarget) onAddCardField(type, addTarget.index, addTarget.allowIntoSelected);
        }}
        onSelectCustomPage={() => {
          if (addTarget) onAddCustomPage(addTarget.index);
        }}
        onSelectAddressCard={() => {
          if (addTarget) onAddAddressCard(addTarget.index);
        }}
        onSelectContactCard={() => {
          if (addTarget) onAddContactCard(addTarget.index);
        }}
        onSelectWelcome={() => {
          if (addTarget) onAddWelcome(addTarget.index);
        }}
      />

      <div className="flex flex-col gap-1.5 border-t border-gray-200 px-3 py-4 dark:border-gray-800">
        <SectionHeading>Abschluss</SectionHeading>

        {/* Aufgabe 51: Kontaktformular-Pill nur noch bei Alt-Funnels (skip=false). Neue Funnels
            erfassen Leads via Kontaktdaten-Card; „Abschluss" = nur noch der End-Screen. */}
        {!state.skipSubmitStep && (
          <StepPill
            number={null}
            title={state.funnelTitle || "Kontaktformular"}
            meta={SUBMIT_META}
            selected={selected.kind === "submit"}
            onClick={() => onSelect({ kind: "submit" })}
          />
        )}
        <StepPill
          number={null}
          title={state.successMessage || "Erfolgsseite"}
          meta={SUCCESS_META}
          selected={selected.kind === "success"}
          onClick={() => onSelect({ kind: "success" })}
        />
      </div>
      </div>

      {/* Footer-Add — gleiches Muster wie E-Mails/Webhooks (Aufgabe 50) */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <EditorButton
          variant="primary"
          onClick={() => setAddTarget({ index: state.questions.length, allowIntoSelected: true })}
          className="w-full"
        >
          <Plus size={15} strokeWidth={2.5} />
          Frage hinzufügen
        </EditorButton>
      </div>
    </aside>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </h2>
  );
}

/**
 * Hover-Zone zwischen zwei Step-Pills. Default unsichtbar (12px Höhe als Spacer);
 * bei Hover poppen Linie + Plus-Button auf. Klick öffnet das AddElementModal mit Insert-Position.
 */
function InsertEdge({ onClick }: { onClick: () => void }) {
  return (
    <div className="group relative h-3 flex items-center">
      <div className="absolute inset-0 flex items-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <div className="flex w-full items-center gap-1.5 px-1">
          <span className="h-px flex-1 bg-primary/40" />
          <button
            type="button"
            onClick={onClick}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow transition-transform hover:scale-110"
            aria-label="Frage an dieser Position einfügen"
            title="Frage hier einfügen"
          >
            <Plus size={11} strokeWidth={2.5} />
          </button>
          <span className="h-px flex-1 bg-primary/40" />
        </div>
      </div>
    </div>
  );
}

function SortableQuestionItem({
  question,
  number,
  selected,
  onClick,
  webhookCount,
  onWebhookBadgeClick,
}: {
  question: EditorQuestion;
  number: number;
  selected: boolean;
  onClick: () => void;
  webhookCount?: number;
  onWebhookBadgeClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: question._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  // Aufgabe 38 + 39: kind-basierte Meta-Selection. Welcome-Pages haben eine separate Pill-Farbe.
  const meta =
    question.kind === "welcome" ? WELCOME_META :
    question.kind === "custom" ? CUSTOM_META :
    questionMeta(question.questionType);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <StepPill
        number={number}
        title={question.title}
        meta={meta}
        selected={selected}
        hidden={question.visible === false}
        draggable
        dragHandleProps={{
          ref: setActivatorNodeRef,
          ...listeners,
        }}
        onClick={onClick}
        webhookCount={webhookCount}
        onWebhookBadgeClick={onWebhookBadgeClick}
      />
    </div>
  );
}
