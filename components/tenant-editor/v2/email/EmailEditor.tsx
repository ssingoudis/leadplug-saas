"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, Variable as VariableIcon, Blocks, ChevronDown,
} from "lucide-react";
import { VariableNode } from "./VariableNode";
import { MagicSectionNode } from "./MagicSectionNode";
import { CtaButtonNode } from "./CtaButtonNode";
import { AVAILABLE_TOKENS } from "@/lib/emailTemplates";
import type { FunnelVariables, VarGroup } from "./funnelVariables";

// =============================================================================
// Aufgabe 41 — TipTap-basierter E-Mail-Editor
//
// Zwei Modi:
//   • body (default): Full Toolbar + Variable + Baustein
//   • subject (singleLine): kein Markup, schlanke Toolbar (nur +Variable inline)
//
// Dropdowns rendern via React-Portal in document.body, damit sie nicht von
// scroll-containern abgeschnitten werden.
// =============================================================================

interface Props {
  value: string;
  onChange: (html: string) => void;
  singleLine?: boolean;
  placeholder?: string;
  // Aufgabe 53: dynamische Funnel-Variablen (Picker-Gruppen + Chip-Labels). Fehlt sie, fällt
  // der Editor auf die statischen Lead-Kontakt-/Zeit-Tokens zurück.
  variables?: FunnelVariables;
}

// Aufgabe 53: Fallback-Gruppen, falls keine Funnel-Variablen übergeben werden.
const FALLBACK_GROUPS: VarGroup[] = [
  { title: "Lead-Kontakt", items: AVAILABLE_TOKENS.contact.map((t) => ({ token: t.token, label: t.label, sample: "" })) },
  { title: "Datum / Zeit", items: AVAILABLE_TOKENS.meta.map((t) => ({ token: t.token, label: t.label, sample: "" })) },
];

export function EmailEditor({ value, onChange, singleLine = false, placeholder, variables }: Props) {
  const variableLabels = variables?.labels ?? {};
  const variableGroups = variables?.groups ?? FALLBACK_GROUPS;
  const editor = useEditor({
    extensions: singleLine
      ? [
          StarterKit.configure({
            heading: false,
            bulletList: false,
            orderedList: false,
            listItem: false,
            blockquote: false,
            codeBlock: false,
            horizontalRule: false,
          }),
          Placeholder.configure({ placeholder: placeholder ?? "" }),
          VariableNode.configure({ extraLabels: variableLabels }),
        ]
      : [
          StarterKit.configure({
            heading: { levels: [2, 3] },
          }),
          Link.configure({
            openOnClick: false,
            autolink: true,
            // Aufgabe 53: Links im Editor sichtbar machen (blau + unterstrichen, Link-Standard).
            HTMLAttributes: { rel: "noopener noreferrer", target: "_blank", class: "text-primary underline" },
          }),
          Placeholder.configure({ placeholder: placeholder ?? "" }),
          VariableNode.configure({ extraLabels: variableLabels }),
          MagicSectionNode,
          CtaButtonNode,
        ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: singleLine
          ? "tiptap-singleline w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none min-h-[36px]"
          : "tiptap-body px-3 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none min-h-[280px] max-h-[480px] overflow-y-auto",
      },
      handleKeyDown: singleLine
        ? (_view, event) => {
            if (event.key === "Enter") { event.preventDefault(); return true; }
            return false;
          }
        : undefined,
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const lastValue = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value !== lastValue.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
      lastValue.current = value;
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-400">
        Lade Editor…
      </div>
    );
  }

  if (singleLine) {
    // Aufgabe 53: Betreff bekommt jetzt auch einen Variablen-Picker (z.B. „Hallo {{Vorname}}").
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden">
        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-2 py-1">
          <InsertVariableDropdown editor={editor} groups={variableGroups} />
        </div>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-visible">
      <BodyToolbar editor={editor} groups={variableGroups} />
      <EditorContent editor={editor} />
    </div>
  );
}

// ===========================================================================
// Body-Toolbar (Markup + Variable + Baustein)
// ===========================================================================

function BodyToolbar({ editor, groups }: { editor: Editor; groups: VarGroup[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-2 py-1.5">
      <ToolButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Fett">
        <Bold size={14} />
      </ToolButton>
      <ToolButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Kursiv">
        <Italic size={14} />
      </ToolButton>
      <Divider />
      <ToolButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Überschrift">
        <Heading2 size={14} />
      </ToolButton>
      <ToolButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Unterüberschrift">
        <Heading3 size={14} />
      </ToolButton>
      <Divider />
      <ToolButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste">
        <List size={14} />
      </ToolButton>
      <ToolButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Nummerierte Liste">
        <ListOrdered size={14} />
      </ToolButton>
      <Divider />
      <LinkButton editor={editor} />
      <Divider />
      <InsertVariableDropdown editor={editor} groups={groups} />
      <InsertMagicSectionDropdown editor={editor} />
    </div>
  );
}

function ToolButton({
  active, onClick, title, children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 ${active ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-700" />;
}

// ===========================================================================
// Portal-Dropdown — vermeidet Cropping in scroll-containern
// ===========================================================================

function PortalDropdown({
  open,
  triggerRef,
  onClose,
  children,
  align = "left",
  width = 256,
}: {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  align?: "left" | "right";
  width?: number;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initial-Position berechnen mit useLayoutEffect — feuert vor Paint
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const update = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const left = align === "right" ? r.right - width : r.left;
      setPos({ top: r.bottom + 4, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, triggerRef, align, width]);

  // Outside-Click schließen
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose, triggerRef]);

  if (!open || !pos || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={dropdownRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, width, zIndex: 60 }}
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl max-h-[60vh] overflow-y-auto"
    >
      {children}
    </div>,
    document.body,
  );
}

// ===========================================================================
// Link-Popover — Aufgabe 53: ersetzt die drei window.prompt()-Dialoge durch ein
// gestyltes Inline-Popover (URL-Feld + optional Link-Text + Anwenden/Entfernen).
// ===========================================================================

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  // Beim Öffnen festgehalten: editieren wir einen bestehenden Link? Gab es eine Textauswahl?
  const [editing, setEditing] = useState(false);
  const [hadSelection, setHadSelection] = useState(false);
  const isActive = editor.isActive("link");

  function openPopover() {
    setEditing(editor.isActive("link"));
    setHadSelection(!editor.state.selection.empty);
    setUrl(editor.getAttributes("link").href ?? "");
    setText("");
    setOpen(true);
    requestAnimationFrame(() => urlRef.current?.focus());
  }

  function normalizeUrl(raw: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v;
    return `https://${v}`;
  }

  function apply() {
    const href = normalizeUrl(url);
    if (!href) return;
    if (editing) {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    } else if (hadSelection) {
      editor.chain().focus().setLink({ href }).run();
    } else {
      const label = text.trim() || href;
      editor.chain().focus().insertContent({ type: "text", text: label, marks: [{ type: "link", attrs: { href } }] }).run();
    }
    setOpen(false);
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPopover}
        title="Link einfügen / bearbeiten"
        className={`inline-flex h-7 w-7 items-center justify-center rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 ${isActive ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white" : ""}`}
      >
        <LinkIcon size={14} />
      </button>
      <PortalDropdown open={open} triggerRef={triggerRef} onClose={() => setOpen(false)} width={300}>
        <div className="space-y-2.5 p-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Link-Adresse</label>
            <input
              ref={urlRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); apply(); }
                if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
              }}
              placeholder="example.com oder https://…"
              className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none"
            />
          </div>
          {!editing && !hadSelection && (
            <div className="space-y-1">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Link-Text</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
                placeholder="z.B. Hier klicken (leer = URL)"
                className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={apply}
              disabled={!url.trim()}
              className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-40"
            >
              {editing ? "Aktualisieren" : "Einfügen"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={remove}
                className="rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Entfernen
              </button>
            )}
          </div>
        </div>
      </PortalDropdown>
    </>
  );
}

// ===========================================================================
// Variable-Dropdown
// ===========================================================================

function InsertVariableDropdown({ editor, groups }: { editor: Editor; groups: VarGroup[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
      >
        <VariableIcon size={13} />
        Variable
        <ChevronDown size={12} />
      </button>
      <PortalDropdown open={open} triggerRef={triggerRef} onClose={() => setOpen(false)} align="right" width={360}>
        <div className="max-h-80 overflow-y-auto p-2 space-y-2">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{group.title}</p>
              {group.items.map(({ token, label, sample, unlabeled }) => (
                <button
                  key={token}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().insertVariable(token).run();
                    setOpen(false);
                  }}
                  className="flex w-full items-baseline justify-between gap-3 rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="min-w-0 truncate font-medium text-gray-900 dark:text-white">
                    {label}
                    {unlabeled && <span className="ml-1 font-normal text-amber-600 dark:text-amber-500">· unbenannt</span>}
                  </span>
                  {sample && <span className="shrink-0 truncate text-[11px] text-gray-400 dark:text-gray-500">{sample}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PortalDropdown>
    </>
  );
}

// ===========================================================================
// MagicSection-Dropdown
// ===========================================================================

function InsertMagicSectionDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
      >
        <Blocks size={13} />
        Baustein
        <ChevronDown size={12} />
      </button>
      <PortalDropdown open={open} triggerRef={triggerRef} onClose={() => setOpen(false)} align="left" width={300}>
        <div className="p-2 space-y-1">
          {/* Anpassbarer Link-Button — generisch, deckt alle Button-Use-Cases ab
              (Termin buchen, Angebot ansehen, Dashboard öffnen, Webseite, …) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().insertCtaButton().run();
              setOpen(false);
            }}
            className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="block font-medium text-gray-900 dark:text-white">🔗 Link-Button</span>
            <span className="block text-[11px] text-gray-500">Anpassbarer Button mit Text + URL — z.B. Termin buchen, Angebot ansehen, Dashboard öffnen</span>
          </button>

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

          {/* Vordefinierte Bausteine */}
          {AVAILABLE_TOKENS.magic.map(({ token, label, description }) => (
            <button
              key={token}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().insertMagicSection(token).run();
                setOpen(false);
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="block font-medium text-gray-900 dark:text-white">{label}</span>
              <span className="block text-[11px] text-gray-500">{description}</span>
            </button>
          ))}
        </div>
      </PortalDropdown>
    </>
  );
}
