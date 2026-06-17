"use client";

import type { ReactNode } from "react";
import { Contact, MapPin, type LucideIcon } from "lucide-react";
import type { QuestionType, ContactFieldConfig } from "@/types";
import { questionMeta, CUSTOM_META, WELCOME_META, contactFieldMeta } from "./fieldMeta";
import { EditorModal } from "./ui/EditorModal";

type ContactFieldType = ContactFieldConfig["type"];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Eigenständiger Schritt (eigene Frageseite) mit genau diesem Type. */
  onSelectType: (type: QuestionType) => void;
  /** Aufgabe 50: einfaches Feld → in die gewählte Karte (oder eine neue Karte). */
  onSelectCardField: (type: ContactFieldType) => void;
  /** Leere Multi-Field-Karte. */
  onSelectCustomPage: () => void;
  /** Adresse-Quick-Card (Karte vorausgefüllt mit Straße/Hausnr/PLZ/Ort). */
  onSelectAddressCard: () => void;
  /** Aufgabe 50: Kontaktdaten-Quick-Card (Name + E-Mail + Telefon). */
  onSelectContactCard: () => void;
  /** Welcome-Screen (Intro-Step am Anfang). */
  onSelectWelcome: () => void;
  /** Aufgabe 50: Welcome-Quick-Add ausblenden, wenn schon ein Welcome existiert. */
  hideWelcome?: boolean;
}

// Aufgabe 50/74: einfache Datenfelder, die in eine Karte wandern (Reihenfolge beabsichtigt).
// Icon/Label/Farbe kommen zentral aus fieldMeta (Kategorie „feld").
const CARD_FIELD_TYPES: ContactFieldType[] = [
  "full_name", "email", "tel", "plz", "text", "long_text", "number", "date", "checkbox",
];

// Aufgabe 50: Typen, die EINEN eigenständigen Schritt bilden (kein Extra-Feld möglich).
const STANDALONE_STEPS: QuestionType[] = [
  "single_choice",
  "multi_choice",
  "dropdown",
  "slider",
  "rating",
  "scale",
  "statement",
];

export function AddElementModal({
  open,
  onClose,
  onSelectType,
  onSelectCardField,
  onSelectCustomPage,
  onSelectAddressCard,
  onSelectContactCard,
  onSelectWelcome,
  hideWelcome = false,
}: Props) {
  return (
    <EditorModal
      open={open}
      onClose={onClose}
      title="Element hinzufügen"
      maxWidth="max-w-2xl"
    >
      {/* Frage — eigenständige, immersive Schritte (ein Element pro Bildschirm) */}
      <Section title="Frage" hint="Füllt einen eigenen Bildschirm — eine Frage, volle Aufmerksamkeit.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STANDALONE_STEPS.map((type) => {
            const meta = questionMeta(type);
            return (
              <SmallCard
                key={type}
                Icon={meta.Icon}
                pillClass={meta.pillClass}
                label={meta.label}
                onClick={() => { onSelectType(type); onClose(); }}
              />
            );
          })}
        </div>
      </Section>

      {/* Karten — fertige Vorlagen oder leere Karte (breite Karten, eigene Sektion) */}
      <Section title="Karten" hint="Mehrere Felder auf einer Seite — Vorlage wählen oder leer starten.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <BigCard
            Icon={Contact}
            pillClass={CUSTOM_META.pillClass}
            title="Kontaktdaten"
            desc="Karte mit Name + E-Mail + Telefon."
            onClick={() => { onSelectContactCard(); onClose(); }}
          />
          <BigCard
            Icon={MapPin}
            pillClass={CUSTOM_META.pillClass}
            title="Adresse"
            desc="Karte mit Straße + Hausnr + PLZ + Ort."
            onClick={() => { onSelectAddressCard(); onClose(); }}
          />
          <BigCard
            Icon={CUSTOM_META.Icon}
            pillClass={CUSTOM_META.pillClass}
            title="Eigene Karte"
            desc="Leere Karte für beliebige Felder."
            onClick={() => { onSelectCustomPage(); onClose(); }}
          />
        </div>
      </Section>

      {/* Einzelne Felder — schmale Karten, eigene Sektion */}
      <Section title="Einzelne Felder" hint="Ein einzelnes Feld für die gewählte Karte — oder eine neue.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CARD_FIELD_TYPES.map((type) => {
            const meta = contactFieldMeta(type);
            return (
              <SmallCard
                key={type}
                Icon={meta.Icon}
                pillClass={meta.pillClass}
                label={meta.label}
                onClick={() => { onSelectCardField(type); onClose(); }}
              />
            );
          })}
        </div>
      </Section>

      {/* Start — optionaler Welcome-Screen */}
      {!hideWelcome && (
        <Section title="Start" hint="Optionale Begrüßung am Anfang.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <BigCard
              Icon={WELCOME_META.Icon}
              pillClass={WELCOME_META.pillClass}
              title="Begrüßung"
              desc="Erster Bildschirm mit Titel + Button."
              onClick={() => { onSelectWelcome(); onClose(); }}
            />
          </div>
        </Section>
      )}
    </EditorModal>
  );
}

/* ───────────────────────────── building blocks ───────────────────────────── */

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        {hint && <p className="mt-0.5 text-xs leading-snug text-gray-400 dark:text-gray-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function BigCard({
  Icon,
  pillClass,
  title,
  desc,
  onClick,
}: {
  Icon: LucideIcon;
  pillClass: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
    >
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${pillClass}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        <span className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">{desc}</span>
      </div>
    </button>
  );
}

function SmallCard({
  Icon,
  pillClass,
  label,
  onClick,
}: {
  Icon: LucideIcon;
  pillClass: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
    >
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${pillClass}`}>
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
        {label}
      </span>
    </button>
  );
}
