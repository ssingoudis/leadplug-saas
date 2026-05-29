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
import type { EditorState, EditorQuestion, QuestionType } from "@/types";
import { StepPill } from "./StepPill";
import { questionMeta, SUBMIT_META, SUCCESS_META, CUSTOM_META, WELCOME_META } from "./fieldMeta";
import type { SelectedStep } from "./types";
import { isSameStep } from "./types";
import { AddElementModal } from "./AddElementModal";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  onSelect: (step: SelectedStep) => void;
  onReorder: (nextQuestions: EditorQuestion[]) => void;
  onAddQuestion: (type: QuestionType, atIndex?: number) => void;
  // Aufgabe 38: Karte mit mehreren Feldern
  onAddCustomPage: (atIndex?: number) => void;
  // Aufgabe 39: Adresse-Quick-Card + Welcome-Screen
  onAddAddressCard: (atIndex?: number) => void;
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
  onAddCustomPage,
  onAddAddressCard,
  onAddWelcome,
  webhookCountsByPageId = {},
  onSwitchToWebhooksTab,
}: Props) {
  // null = Modal zu, number = Modal offen und neue Frage wird an dieser Position eingefügt.
  // questions.length = an's Ende anfügen (= aktuelles Default-Verhalten).
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

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

  const questionIds = state.questions.map((q) => q._id);

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#0a0e14]">
      <div className="flex flex-col gap-1.5 px-3 py-4">
        <SectionHeading>Fragen</SectionHeading>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col">
              {/* Edge oberhalb der ersten Frage — Einfügen an Position 0 */}
              {state.questions.length > 0 && (
                <InsertEdge onClick={() => setInsertIndex(0)} />
              )}
              {state.questions.map((q, idx) => {
                const step: SelectedStep = { kind: "question", questionIndex: idx };
                const webhookCount = q.dbId ? (webhookCountsByPageId[q.dbId] ?? 0) : 0;
                return (
                  <div key={q._id} className="flex flex-col">
                    <SortableQuestionItem
                      question={q}
                      number={idx + 1}
                      selected={isSameStep(selected, step)}
                      onClick={() => onSelect(step)}
                      webhookCount={webhookCount}
                      onWebhookBadgeClick={onSwitchToWebhooksTab}
                    />
                    {/* Edge nach jeder Frage (außer der letzten — da übernimmt der Add-Button unten) */}
                    {idx < state.questions.length - 1 && (
                      <InsertEdge onClick={() => setInsertIndex(idx + 1)} />
                    )}
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={() => setInsertIndex(state.questions.length)}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-400"
        >
          <Plus size={14} />
          Frage hinzufügen
        </button>
      </div>

      <AddElementModal
        open={insertIndex !== null}
        onClose={() => setInsertIndex(null)}
        onSelectType={(type) => {
          if (insertIndex !== null) onAddQuestion(type, insertIndex);
        }}
        onSelectCustomPage={() => {
          if (insertIndex !== null) onAddCustomPage(insertIndex);
        }}
        onSelectAddressCard={() => {
          if (insertIndex !== null) onAddAddressCard(insertIndex);
        }}
        onSelectWelcome={() => {
          if (insertIndex !== null) onAddWelcome(insertIndex);
        }}
      />

      <div className="mt-2 flex flex-col gap-1.5 border-t border-gray-200 px-3 py-4 dark:border-gray-800">
        <SectionHeading>Abschluss</SectionHeading>

        <StepPill
          number={state.questions.length + 1}
          title={
            state.skipSubmitStep
              ? `${state.funnelTitle || "Kontaktformular"} (übersprungen)`
              : state.funnelTitle || "Kontaktformular"
          }
          meta={SUBMIT_META}
          selected={selected.kind === "submit"}
          hidden={state.skipSubmitStep}
          onClick={() => onSelect({ kind: "submit" })}
        />
        <StepPill
          number={state.questions.length + 2}
          title={state.successMessage || "Erfolgsseite"}
          meta={SUCCESS_META}
          selected={selected.kind === "success"}
          onClick={() => onSelect({ kind: "success" })}
        />
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
