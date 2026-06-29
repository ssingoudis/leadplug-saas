"use client";

import { GripVertical, Trash2, Plus, Image as ImageIcon, SquareCheck } from "lucide-react";
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
import type { EditorOption, OptionMarker } from "@/types";
import { optionMarkerFor } from "@/lib/funnel/markdown";
import { useSelectedFieldRef, selRing } from "./selection";

interface Props {
  value: EditorOption[];
  onChange: (next: EditorOption[]) => void;
  // Aufgabe 76: zeigt pro Option ein optionales „Bild-URL"-Feld (nur single_choice).
  allowImages?: boolean;
  // Aufgabe 76: aktueller Options-Marker — Panel-Chip spiegelt ihn (A/B/C · 1/2/3 · Haken …).
  marker?: OptionMarker;
}

function makeId(): string {
  return `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function OptionsEditor({ value, onChange, allowImages, marker }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = value.findIndex((o) => o._id === active.id);
    const newIdx = value.findIndex((o) => o._id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(value, oldIdx, newIdx));
  }

  function patchOption(id: string, patch: Partial<EditorOption>) {
    onChange(value.map((o) => (o._id === id ? { ...o, ...patch } : o)));
  }

  function removeOption(id: string) {
    onChange(value.filter((o) => o._id !== id));
  }

  function addOption() {
    onChange([
      ...value,
      { _id: makeId(), label: "", value: "" },
    ]);
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map((o) => o._id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {value.map((opt, idx) => (
              <SortableOptionRow
                key={opt._id}
                option={opt}
                index={idx}
                onPatch={(patch) => patchOption(opt._id, patch)}
                onRemove={() => removeOption(opt._id)}
                canRemove={value.length > 1}
                allowImages={allowImages}
                marker={marker}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addOption}
        className="mt-1 inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary"
      >
        <Plus size={13} />
        Option hinzufügen
      </button>
    </div>
  );
}

function SortableOptionRow({
  option,
  index,
  onPatch,
  onRemove,
  canRemove,
  allowImages,
  marker,
}: {
  option: EditorOption;
  index: number;
  onPatch: (patch: Partial<EditorOption>) => void;
  onRemove: () => void;
  canRemove: boolean;
  allowImages?: boolean;
  marker?: OptionMarker;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: option._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  // Aufgabe 57C: Canvas-Klick auf Option N markiert das Options-Textfeld (Ref "option_<idx>").
  // Ring NUR auf dem Eingabefeld (Stavros-Review) — nicht auf Chip/Griff/Mülleimer;
  // data-sel-target bleibt am Row-Wrapper als Scroll-Anker.
  const isCanvasSelected = useSelectedFieldRef() === `option_${index}`;

  // Aufgabe 76: Panel-Chip spiegelt den gewählten Marker (A/B/C · 1/2/3 · Haken), konsistent
  // zum Canvas; 'ohne'/'Bild' rendern keinen Chip (Reorder läuft über den Griff links).
  const markerText = optionMarkerFor(marker ?? "letters", index);
  const markerChip =
    markerText !== null ? (
      <span
        {...listeners}
        aria-hidden="true"
        className="inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-md bg-gray-100 font-mono text-[11px] font-semibold text-gray-500 transition-colors active:cursor-grabbing dark:bg-gray-800 dark:text-gray-400"
        title="Reihenfolge ändern"
      >
        {markerText}
      </span>
    ) : marker === "checkbox" ? (
      <span
        {...listeners}
        aria-hidden="true"
        className="inline-flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-md bg-gray-100 text-gray-500 transition-colors active:cursor-grabbing dark:bg-gray-800 dark:text-gray-400"
        title="Reihenfolge ändern"
      >
        <SquareCheck size={13} className="mx-auto" />
      </span>
    ) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-sel-target={`option_${index}`}
      className="flex flex-col gap-1"
    >
      <div className="flex items-center gap-1.5">
        <span
          ref={setActivatorNodeRef}
          {...listeners}
          className="flex w-5 cursor-grab items-center justify-center text-gray-300 transition-colors hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
          aria-label="Reihenfolge ändern"
        >
          <GripVertical size={14} />
        </span>

        {/* Aufgabe 76: Marker-Chip (A/B/C · 1/2/3 · Haken) — spiegelt „Markierung der Optionen",
            zugleich Drag-Handle. 'ohne'/'Bild' rendern keinen Chip (Reorder über den Griff links). */}
        {markerChip}

        <input
          type="text"
          value={option.label}
          onChange={(e) => onPatch({ label: e.target.value })}
          placeholder={`Option ${index + 1}`}
          className={`flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${selRing(isCanvasSelected)}`}
        />

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          title={canRemove ? "Option entfernen" : "Mindestens eine Option erforderlich"}
          className="shrink-0 p-1.5 text-gray-400 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-500 dark:hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Aufgabe 76: optionale Bild-URL pro Option (nur single_choice). Eingerückt unter dem
          Letter-Chip; Vorschau-Thumbnail wenn gesetzt, sonst gestrichelter Platzhalter. */}
      {allowImages && (
        <div className="flex items-center gap-1.5 pl-6.5">
          {option.imageUrl ? (
            <img
              src={option.imageUrl}
              alt=""
              className="h-7 w-7 shrink-0 rounded-md border border-gray-200 object-contain dark:border-gray-700"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-300 dark:border-gray-600 dark:text-gray-600">
              <ImageIcon size={14} />
            </span>
          )}
          <input
            type="url"
            inputMode="url"
            value={option.imageUrl ?? ""}
            onChange={(e) => onPatch({ imageUrl: e.target.value || undefined })}
            placeholder="Bild-URL"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
          {/* Aufgabe 76: unsichtbarer Platzhalter in Mülleimer-Größe — bringt das URL-Feld auf
              dieselbe Breite/Rechtskante wie die Label-Zeile darüber (sonst läuft es weiter rechts raus). */}
          <span aria-hidden="true" className="shrink-0 p-1.5">
            <Trash2 size={13} className="opacity-0" />
          </span>
        </div>
      )}
    </div>
  );
}
