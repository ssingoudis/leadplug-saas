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
}

export function EmailEditor({ value, onChange, singleLine = false, placeholder }: Props) {
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
          VariableNode,
        ]
      : [
          StarterKit.configure({
            heading: { levels: [2, 3] },
          }),
          Link.configure({
            openOnClick: false,
            autolink: true,
            HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
          }),
          Placeholder.configure({ placeholder: placeholder ?? "" }),
          VariableNode,
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
    // Subject: kein Variable-Dropdown — Betreffzeile bleibt bewusst simpel
    // (existierende {{vars}} aus Backfill werden weiterhin als Chips gerendert,
    // aber neu einfügen geht nur im Body).
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-visible">
      <BodyToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

// ===========================================================================
// Body-Toolbar (Markup + Variable + Baustein)
// ===========================================================================

function BodyToolbar({ editor }: { editor: Editor }) {
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
      <ToolButton
        active={editor.isActive("link")}
        onClick={() => {
          const isActive = editor.isActive("link");
          const { from, to, empty } = editor.state.selection;
          const previousUrl = editor.getAttributes("link").href ?? "";

          if (isActive) {
            // Existierenden Link editieren oder entfernen
            const url = window.prompt("Link-URL bearbeiten (leer = Link entfernen)", previousUrl);
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            } else {
              editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }
            return;
          }

          if (empty) {
            // Keine Selection → Text + URL abfragen und einfügen
            const text = window.prompt("Link-Text (z.B. \"Hier klicken\"):", "");
            if (text === null || !text.trim()) return;
            const url = window.prompt("Link-URL (https://…):", "https://");
            if (url === null || !url.trim()) return;
            editor
              .chain()
              .focus()
              .insertContentAt(from, [
                { type: "text", text: text.trim(), marks: [{ type: "link", attrs: { href: url.trim() } }] },
              ])
              .run();
            return;
          }

          // Selection vorhanden → URL abfragen und auf den selektierten Text als Link anwenden
          const url = window.prompt("Link-URL für markierten Text (https://…):", "https://");
          if (url === null || !url.trim()) return;
          editor.chain().focus().setTextSelection({ from, to }).setLink({ href: url.trim() }).run();
        }}
        title="Link (markierten Text verlinken oder neuen Link einfügen)"
      >
        <LinkIcon size={14} />
      </ToolButton>
      <Divider />
      <InsertVariableDropdown editor={editor} />
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
// Variable-Dropdown
// ===========================================================================

function InsertVariableDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Bewusst nur Lead-Daten + Zeitstempel im Picker. Funnel-Daten (Firmenname, Firmen-Email,
  // etc.) sind nicht dynamisch — der Tenant kann die direkt in den Text tippen. Variablen
  // sollen für Daten reserviert sein, die *pro Lead* anders aussehen.
  // (resolveVar() versteht weiterhin {{funnel.*}} damit Backfill-Mails funktionieren.)
  const groups: Array<[string, ReadonlyArray<{ token: string; label: string }>]> = [
    ["Daten vom Lead", AVAILABLE_TOKENS.contact],
    ["Datum / Zeit", AVAILABLE_TOKENS.meta],
  ];

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
      <PortalDropdown open={open} triggerRef={triggerRef} onClose={() => setOpen(false)} align="right">
        <div className="p-2 space-y-2">
          {groups.map(([title, items]) => (
            <div key={title}>
              <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{title}</p>
              {items.map(({ token, label }) => (
                <button
                  key={token}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().insertVariable(token).run();
                    setOpen(false);
                  }}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{label}</span>
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
