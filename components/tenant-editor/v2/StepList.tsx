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
import { questionMeta, SUBMIT_META, SUCCESS_META } from "./fieldMeta";
import type { SelectedStep } from "./types";
import { isSameStep } from "./types";
import { AddElementModal } from "./AddElementModal";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  onSelect: (step: SelectedStep) => void;
  onReorder: (nextQuestions: EditorQuestion[]) => void;
  onAddQuestion: (type: QuestionType) => void;
}

export function StepList({ state, selected, onSelect, onReorder, onAddQuestion }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);

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
            <div className="flex flex-col gap-1.5">
              {state.questions.map((q, idx) => {
                const step: SelectedStep = { kind: "question", questionIndex: idx };
                return (
                  <SortableQuestionItem
                    key={q._id}
                    question={q}
                    number={idx + 1}
                    selected={isSameStep(selected, step)}
                    onClick={() => onSelect(step)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-400"
        >
          <Plus size={14} />
          Frage hinzufügen
        </button>
      </div>

      <AddElementModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSelect={(type) => onAddQuestion(type)}
      />

      <div className="mt-2 flex flex-col gap-1.5 border-t border-gray-200 px-3 py-4 dark:border-gray-800">
        <SectionHeading>Abschluss</SectionHeading>

        <StepPill
          number={state.questions.length + 1}
          title={state.funnelTitle || "Kontaktformular"}
          meta={SUBMIT_META}
          selected={selected.kind === "submit"}
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

function SortableQuestionItem({
  question,
  number,
  selected,
  onClick,
}: {
  question: EditorQuestion;
  number: number;
  selected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: question._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <StepPill
        number={number}
        title={question.title}
        meta={questionMeta(question.questionType)}
        selected={selected}
        hidden={question.visible === false}
        draggable
        dragHandleProps={{
          ref: setActivatorNodeRef,
          ...listeners,
        }}
        onClick={onClick}
      />
    </div>
  );
}
