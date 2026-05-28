import type { EditorQuestion } from "@/types";

/**
 * Vorlagen = vorkonfigurierte Sets aus 1..N Question-Pages, die per Klick eingefügt werden.
 * Im Funnel sind das jeweils mehrere Schritte (Typeform-Stil: eine Frage pro Bildschirm).
 * Daher: build() liefert ein Array von EditorQuestions, die jeweils ihre eigene Page werden.
 */

export interface Vorlage {
  key: string;
  label: string;
  description: string;
  icon: string;
  pillClass: string;
  /** Liefert die zu addenden Fragen. Fresh _id pro Aufruf. */
  build: () => EditorQuestion[];
}

function makeId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeOption(label: string) {
  return { _id: makeId(), label, value: "" };
}

/**
 * Default-Wertesatz für eine EditorQuestion — alle type-spezifischen Felder leer, der Aufrufer
 * überschreibt das Notwendige (questionType, title, options falls choice).
 */
function blankQuestion(): EditorQuestion {
  return {
    _id: makeId(),
    questionKey: "",
    questionType: "short_text",
    title: "",
    subtitle: "",
    visible: true,
    required: true,
    placeholder: "",
    maxLength: "",
    sliderMin: "",
    sliderMax: "",
    sliderStep: "",
    sliderUnit: "",
    sliderDefault: "",
    options: [],
    dateMin: "",
    dateMax: "",
    dateDefault: "",
    numberMin: "",
    numberMax: "",
    numberStep: "",
    numberDefault: "",
    numberUnit: "",
    checkboxLabel: "",
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Vorlagen
   ────────────────────────────────────────────────────────────────────────── */

const KONTAKT: Vorlage = {
  key: "kontakt",
  label: "Kontakt",
  description: "Name, E-Mail und Telefon — drei Schritte",
  icon: "👤",
  pillClass:
    "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800",
  build: () => {
    const name = blankQuestion();
    name.questionType = "short_text";
    name.title = "Wie heißt du?";
    name.placeholder = "Vor- und Nachname";

    const email = blankQuestion();
    email.questionType = "short_text";
    email.title = "Deine E-Mail-Adresse?";
    email.placeholder = "z. B. name@firma.de";

    const tel = blankQuestion();
    tel.questionType = "short_text";
    tel.title = "Unter welcher Nummer können wir dich erreichen?";
    tel.placeholder = "+49 …";

    return [name, email, tel];
  },
};

const ADRESSE: Vorlage = {
  key: "adresse",
  label: "Adresse",
  description: "Straße, PLZ, Ort und Land — vier Schritte",
  icon: "📍",
  pillClass:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  build: () => {
    const street = blankQuestion();
    street.questionType = "short_text";
    street.title = "Straße und Hausnummer?";
    street.placeholder = "Musterstraße 12";

    // Auf Question-Pages gibt's kein eigenes `plz`-Type (das ist Submit-only).
    // PLZ läuft hier über short_text mit maxLength=5 als praktischer Begrenzung.
    const zip = blankQuestion();
    zip.questionType = "short_text";
    zip.title = "Wie lautet deine Postleitzahl?";
    zip.placeholder = "12345";
    zip.maxLength = "5";

    const city = blankQuestion();
    city.questionType = "short_text";
    city.title = "In welcher Stadt?";
    city.placeholder = "Berlin";

    const country = blankQuestion();
    country.questionType = "dropdown";
    country.title = "In welchem Land?";
    country.options = [makeOption("Deutschland"), makeOption("Österreich"), makeOption("Schweiz")];

    return [street, zip, city, country];
  },
};

const JA_NEIN: Vorlage = {
  key: "ja_nein",
  label: "Ja / Nein",
  description: "Eine binäre Auswahlfrage",
  icon: "✓✕",
  pillClass:
    "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  build: () => {
    const q = blankQuestion();
    q.questionType = "single_choice";
    q.title = "Stelle deine Frage";
    q.options = [makeOption("Ja"), makeOption("Nein")];
    return [q];
  },
};

export const VORLAGEN: Vorlage[] = [KONTAKT, ADRESSE, JA_NEIN];
