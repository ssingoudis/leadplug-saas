import { useRef } from "react";
import { cn } from "@/lib/utils";

// Schaltet zwischen Anzeige (editMode=false) und contentEditable (editMode=true,
// Builder-Canvas). Uncontrolled — Commit nur auf Blur/Enter, Esc revertet via Remount-Key.

type EditableTextTag = "h1" | "h2" | "p" | "span" | "div";

interface EditableTextProps {
  as?: EditableTextTag;
  editMode: boolean;
  fieldRef: string;
  initial: string;
  placeholder: string;
  onCommit?: (fieldRef: string, newText: string) => void;
  multiline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function EditableText({
  as = "span",
  editMode,
  fieldRef,
  initial,
  placeholder,
  onCommit,
  multiline = false,
  className,
  style,
}: EditableTextProps) {
  const skipNextCommit = useRef(false);

  if (!editMode) {
    // Read-only: Tag + data-edit-field + style. Empty-State-Placeholder kommt per style vom Caller.
    const Tag = as;
    return (
      <Tag data-edit-field={fieldRef} className={className} style={style}>
        {initial}
      </Tag>
    );
  }

  // contentEditable. key={fieldRef}_{initial} remountet bei externer Text-Änderung
  // (z.B. Edit in der Options-Liste) → contenteditable zieht nach.
  const Tag = as;
  return (
    <Tag
      key={`${fieldRef}_${initial}`}
      data-edit-field={fieldRef}
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      className={cn("funnel-editable", className)}
      // I-Beam-Cursor; nach dem Spread, um den Parent-Pointer zu übersteuern.
      style={{ ...style, cursor: "text" }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        if (skipNextCommit.current) {
          skipNextCommit.current = false;
          return;
        }
        const text = e.currentTarget.innerText.replace(/ /g, " ").trim();
        if (text !== initial) {
          onCommit?.(fieldRef, text);
        }
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          skipNextCommit.current = true;
          // Revert: setze innerText zurück auf initial, dann blur
          (e.currentTarget as HTMLElement).innerText = initial;
          e.currentTarget.blur();
        }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        // Plain-Text-Paste gegen Rich-HTML. execCommand ist deprecated, aber das einzige
        // Pattern mit Cursor-Erhalt — bleibt bis Browser-Support endet.
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        if (typeof document !== "undefined" && document.execCommand) {
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          document.execCommand("insertText", false, text);
        }
      }}
    >
      {initial}
    </Tag>
  );
}
