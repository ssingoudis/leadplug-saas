import type { EditorQuestion } from "@/types";

// =============================================================================
// Aufgabe 53 — Dynamische, strukturierte Mail-Variablen
//
// Baut die Variablen-Liste für den Mail-Editor aus den TATSÄCHLICHEN Funnel-Feldern.
// Struktur (siehe Stavros-Feedback 2026-06-06):
//   1. "Lead-Kontakt"     — kuratierte Identität (Name/E-Mail/Telefon), NUR die, die der
//                            Funnel auch erfasst. Robuste, interpretierte Werte fürs Anschreiben.
//   2. "Weitere Felder"   — alle ÜBRIGEN Felder (die nicht schon oben als Lead-Kontakt stehen),
//                            gelabelt mit ihrem Feld-Label. Keine Doppelung.
//   3. "Datum / Zeit"     — Zeitstempel.
//
// Jeder Eintrag trägt einen Beispiel-Wert (`sample`) zur Orientierung. Felder ohne sauberes
// Label werden als `unlabeled` markiert (statt versteckt — der Wert ist sonst nicht nutzbar).
//
// `labels` (token → Anzeige-Label) geht an den VariableNode, damit Chips lesbar sind.
// =============================================================================

export interface VarItem {
  token: string;
  label: string;
  sample: string;       // Beispiel-Wert (gefadet im Picker)
  unlabeled?: boolean;  // true = Feld hat kein sauberes Label
}

export interface VarGroup {
  title: string;
  items: VarItem[];
}

export interface FunnelVariables {
  groups: VarGroup[];
  labels: Record<string, string>;
}

// Normalisiertes Feld-Deskriptor (aus Question-Page ODER Custom-Karte).
interface FieldDesc {
  key: string;
  label: string;       // leer = unbenannt
  type: string;        // QuestionType ODER ContactFieldConfig.type
  optionLabels: string[];
}

// Plausibler Beispiel-Wert je Feldtyp (deckt Question- + ContactField-Types ab).
function sampleForType(type: string, optionLabels: string[]): string {
  switch (type) {
    case "email":         return "max@beispiel.de";
    case "tel":           return "+49 170 1234567";
    case "plz":           return "12345";
    case "single_choice":
    case "multi_choice":
    case "dropdown":
    case "radio":         return optionLabels[0] || "Auswahl";
    case "checkbox":      return "Ja";
    case "date":          return new Date().toLocaleDateString("de-DE");
    case "number":
    case "slider":        return "42";
    case "rating":        return "4";
    case "scale":         return "8";
    case "first_name":    return "Max";
    case "last_name":     return "Mustermann";
    case "full_name":     return "Max Mustermann";
    default:              return "Beispiel"; // short_text, long_text
  }
}

const CONTACT_SAMPLES: Record<string, string> = {
  "contact.name":    "Max Mustermann",
  "contact.email":   "max@beispiel.de",
  "contact.telefon": "+49 170 1234567",
};

export function buildFunnelVariables(questions: EditorQuestion[]): FunnelVariables {
  // 1. Alle Datenfelder einsammeln (Welcome/Statement haben keine Antwort).
  const fields: FieldDesc[] = [];
  for (const q of questions) {
    if (q.kind === "welcome") continue;
    if (q.questionType === "statement") continue;
    if (q.kind === "custom") {
      for (const f of q.customFields ?? []) {
        if (f.visible === false) continue;
        fields.push({
          key: (f.key ?? "").trim(),
          label: (f.label ?? "").trim(),
          type: f.type,
          optionLabels: Array.isArray(f.options) ? f.options : [],
        });
      }
    } else {
      fields.push({
        // Token-Key = field_key (questionKey), muss mit dem echten Versand übereinstimmen.
        key: (q.questionKey || q._id || "").trim(),
        label: (q.title ?? "").trim(),
        type: q.questionType,
        optionLabels: q.options.map((o) => o.label).filter(Boolean),
      });
    }
  }

  // 2. Welche Kontakt-Typen erfasst der Funnel? (für die gefilterte Lead-Kontakt-Gruppe)
  const hasEmail = fields.some((f) => f.type === "email");
  const hasTel   = fields.some((f) => f.type === "tel");
  const hasName  = fields.some((f) => f.type === "full_name" || f.type === "first_name" || f.type === "last_name");

  const groups: VarGroup[] = [];

  // Gruppe 1: Lead-Kontakt — nur was vorhanden ist.
  const contactItems: VarItem[] = [];
  if (hasName)  contactItems.push({ token: "contact.name",    label: "Name",    sample: CONTACT_SAMPLES["contact.name"] });
  if (hasEmail) contactItems.push({ token: "contact.email",   label: "E-Mail",  sample: CONTACT_SAMPLES["contact.email"] });
  if (hasTel)   contactItems.push({ token: "contact.telefon", label: "Telefon", sample: CONTACT_SAMPLES["contact.telefon"] });
  if (contactItems.length > 0) groups.push({ title: "Lead-Kontakt", items: contactItems });

  // Gruppe 2: Weitere Felder — alle übrigen (email/tel/full_name sind schon oben abgedeckt).
  // first_name/last_name bleiben hier: Vorname/Nachname sind eigenständig nutzbar (≠ voller Name).
  const COVERED = new Set(["email", "tel", "full_name"]);
  const fieldItems: VarItem[] = [];
  const seen = new Set<string>();
  for (const f of fields) {
    if (!f.key || seen.has(f.key)) continue;
    if (COVERED.has(f.type)) continue;
    seen.add(f.key);
    const unlabeled = f.label.length === 0;
    fieldItems.push({
      token: `answer.${f.key}`,
      label: unlabeled ? f.key : f.label,
      sample: sampleForType(f.type, f.optionLabels),
      unlabeled,
    });
  }
  if (fieldItems.length > 0) groups.push({ title: "Weitere Felder", items: fieldItems });

  // Gruppe 3: Datum / Zeit.
  groups.push({
    title: "Datum / Zeit",
    items: [{ token: "submitted_at", label: "Zeitstempel", sample: new Date().toLocaleDateString("de-DE") }],
  });

  // Chip-Labels (token → Label) für den VariableNode.
  const labels: Record<string, string> = {};
  for (const g of groups) for (const it of g.items) labels[it.token] = it.label;

  return { groups, labels };
}
