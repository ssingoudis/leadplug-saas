import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { GripVertical, Copy, Trash2 } from "lucide-react";

// editMode-Wrapper um eine Choice-Option: Drag-Handle + Duplicate/Delete-Buttons
// (hover-sichtbar) + @dnd-kit-Reorder. data-edit-field am Wrapper für Click-Select.

interface SortableEditOptionProps {
  id: string;
  idx: number;
  wrapperClassName: string;
  wrapperStyle: React.CSSProperties;
  onDuplicate?: (idx: number) => void;
  onDelete?: (idx: number) => void;
  // children als Render-Funktion bekommt die Drag-Listener (z.B. damit der Letter-Chip
  // selbst als Drag-Handle dienen kann).
  children: React.ReactNode | ((dragListeners: DraggableSyntheticListeners) => React.ReactNode);
}

export function SortableEditOption({
  id,
  idx,
  wrapperClassName,
  wrapperStyle,
  onDuplicate,
  onDelete,
  children,
}: SortableEditOptionProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      role="button"
      tabIndex={-1}
      data-edit-field={`option_${idx}`}
      className={wrapperClassName}
      style={{ ...wrapperStyle, ...sortableStyle }}
    >
      {/* Drag-Handle — auf Hover sichtbar, links vor dem Indicator */}
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        aria-label="Reihenfolge ändern"
        title="Reihenfolge ändern"
        className="-ml-1 flex h-6 w-4 shrink-0 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover/option:opacity-60 active:cursor-grabbing"
        style={{ color: "currentColor" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </span>

      {typeof children === "function" ? children(listeners) : children}

      {/* Aktions-Buttons rechts — auf Hover sichtbar */}
      <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/option:opacity-100">
        {onDuplicate && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(idx); }}
            aria-label="Option duplizieren"
            title="Duplizieren"
            className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-black/10"
          >
            <Copy size={12} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
            aria-label="Option löschen"
            title="Löschen"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={12} />
          </button>
        )}
      </span>
    </div>
  );
}
