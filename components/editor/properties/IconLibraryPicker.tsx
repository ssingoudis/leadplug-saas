"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { FUNNEL_ICONS, EDITOR_ICON_TINT } from "@/lib/funnel/icons";
import { OptionIcon } from "@/components/funnel/OptionIcon";
import { EditorModal } from "../ui/EditorModal";
import { TextInput } from "../ui/Controls";

// =============================================================================
// Aufgabe 77 — Icon-Bibliothek-Picker für Bild-Optionen.
//
// Modal nach dem AddContactFieldPicker-Muster (open/onClose/onSelect): Suche +
// Kategorie-Chips + Kachel-Grid. Vorschau über dieselbe Inline-Render-Mechanik
// wie das Widget (OptionIcon); Kachel-Fläche ist bewusst weiß — die Icons sind
// für helle Hintergründe gezeichnet (var(--funnel-bg)-Fallback = #fff).
// =============================================================================

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (iconKey: string) => void;
}

export function IconLibraryPicker({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  // Bei jedem Öffnen frisch starten — alte Suche/Filter sollen nicht kleben.
  useEffect(() => {
    if (open) {
      setQuery("");
      setCategory(null);
    }
  }, [open]);

  const categories = useMemo(
    () => [...new Set(Object.values(FUNNEL_ICONS).map((e) => e.category))],
    [],
  );

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(FUNNEL_ICONS).filter(([key, e]) => {
      if (category && e.category !== category) return false;
      if (!q) return true;
      return e.label.toLowerCase().includes(q) || e.keywords.includes(q) || key.includes(q);
    });
  }, [query, category]);

  const chipClass = (active: boolean) =>
    active
      ? "rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
      : "rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-primary dark:border-gray-700 dark:text-gray-400";

  return (
    <EditorModal open={open} onClose={onClose} scope="Option" title="Icon wählen" maxWidth="max-w-2xl">
      <div className="flex flex-col gap-3">
        <TextInput
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen… z. B. Dach, Haus, Heizung"
        />

        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setCategory(null)} className={chipClass(category === null)}>
            Alle
          </button>
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={chipClass(category === c)}>
              {c}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-gray-400 dark:text-gray-500">
            <SearchX size={20} />
            <p className="text-sm">Kein Icon gefunden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {entries.map(([key, entry]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelect(key);
                  onClose();
                }}
                title={entry.label}
                className="group flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 p-2 transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:hover:border-primary"
              >
                <span className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-white p-1.5">
                  <OptionIcon iconKey={key} tintColor={EDITOR_ICON_TINT} className="block h-full w-full" />
                </span>
                <span className="w-full truncate text-center text-xs font-medium text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
                  {entry.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </EditorModal>
  );
}
