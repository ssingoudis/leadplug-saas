import type {
  EditorState,
  EditorQuestion,
  QuestionType,
  QuestionConfig,
  FunnelConfig,
  FunnelTheme,
  ContactFieldConfig,
} from "@/types";

// =============================================================================
// STRING HELPERS
// =============================================================================

export function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// =============================================================================
// Aufgabe 40 Polish — Field-Key-Auto-Gen + Validation
//
// Pattern wie Typeform/HubSpot/Stripe: jedes Field hat einen stabilen Key
// für CRM-Mapping. Key wird beim Anlegen auto-generiert (type-aware oder
// aus Titel), ist editierbar, validiert pro Page eindeutig.
// =============================================================================

/** Erlaubtes Format: lowercase a-z, 0-9, underscore. 1-64 Zeichen. */
export const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

/** Type-aware Default-Keys für ContactFields. Diese sind die "kanonischen" Keys
 *  die ein Tenant erwartet — z.B. ein "email"-Type-Field heißt `email`, nicht
 *  `wie_ist_deine_email`. Wenn diese keys aber kollidieren (mehrere email-Felder),
 *  ergänzt der Konflikt-Resolver Suffix `_2`, `_3`, …
 */
const TYPE_DEFAULT_KEYS: Record<string, string> = {
  email: "email",
  tel: "telefon",
  plz: "plz",
  first_name: "first_name",
  last_name: "last_name",
  full_name: "name",
};

/**
 * Generiert einen sinnvollen field_key aus Type + optional Label,
 * mit Konflikt-Auflösung gegen existierende Keys.
 *
 * Strategie:
 *   1. Wenn `type` in TYPE_DEFAULT_KEYS → nimm den (z.B. email → "email")
 *   2. Sonst: slugify aus Label
 *   3. Sonst: fallback "field"
 *   4. Bei Kollision: Suffix _2, _3, …
 */
export function generateFieldKey(
  type: string,
  label: string,
  existingKeys: ReadonlySet<string> | string[],
): string {
  const taken =
    existingKeys instanceof Set ? existingKeys : new Set(existingKeys);

  let base = TYPE_DEFAULT_KEYS[type] || toKey(label) || "field";
  // Schutz vor problematischen Slug-Ergebnissen (rein numerisch oder leer)
  if (!FIELD_KEY_PATTERN.test(base)) base = `field_${base}`.slice(0, 64);

  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}_${i}`.slice(0, 64);
    if (!taken.has(candidate)) return candidate;
  }
  // Fallback fast nicht erreichbar
  return `${base}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Validiert einen vom User editierten Key.
 *  Returns null wenn valide, sonst eine deutsche Fehlermeldung.
 *  Konflikt-Check (Eindeutigkeit pro Page) muss der Caller machen — wir kennen
 *  hier nicht den Page-Kontext.
 */
export function validateFieldKey(key: string): string | null {
  if (!key) return "Key darf nicht leer sein.";
  if (key.length > 64) return "Key ist zu lang (max 64 Zeichen).";
  if (!/^[a-z]/.test(key)) return "Key muss mit einem Kleinbuchstaben beginnen.";
  if (!FIELD_KEY_PATTERN.test(key)) {
    return "Nur Kleinbuchstaben, Zahlen und Unterstrich erlaubt.";
  }
  return null;
}

/** Stellt sicher dass ein Key in einer Liste eindeutig ist. Wenn nicht,
 *  Suffix _2, _3, … Falls schon eindeutig, gibt's den Key unverändert zurück. */
export function ensureUniqueKey(
  key: string,
  existingKeys: ReadonlySet<string> | string[],
): string {
  const taken =
    existingKeys instanceof Set ? existingKeys : new Set(existingKeys);
  if (!taken.has(key)) return key;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${key}_${i}`.slice(0, 64);
    if (!taken.has(candidate)) return candidate;
  }
  return `${key}_${Math.random().toString(36).slice(2, 6)}`;
}

// =============================================================================
// EDITOR STATE → FUNNEL PROPS (für PreviewPanel)
// =============================================================================

export function buildTheme(state: EditorState): Partial<FunnelTheme> {
  return {
    primaryColor: state.primaryColor,
    textColor: state.textColor,
    backgroundColor: state.backgroundColor,
    pageBackgroundColor: state.pageBackgroundColor,
    font: state.font,
    borderRadius: state.borderRadius,
    maxWidth: state.maxWidth,
  };
}

export function buildFunnelConfig(state: EditorState): FunnelConfig {
  return {
    title: state.funnelTitle || "Jetzt kostenloses Angebot anfordern",
    // Aufgabe 51: Titel nie leer (nacktes Häkchen reicht nicht) — interim Default-Fallback.
    // Antwort-Text bleibt optional: leer = zweite Zeile wird nicht angezeigt. (Sauberer Editor-Default → Plan.)
    successMessage: state.successMessage || "Vielen Dank für Ihre Anfrage!",
    responseMessage: state.responseMessage,
    contactFormSubtitle:
      state.contactFormSubtitle || "Wer soll das Angebot erhalten?",
    privacyPolicyUrl: state.privacyPolicyUrl || "#",
    privacyText:
      state.privacyText ||
      "Mit dem Absenden stimme ich zu, per E-Mail und Telefon kontaktiert zu werden.",
    answersOverviewLabel:
      state.answersOverviewLabel || "Ihre Angaben im Überblick:",
    showAnswersOverview: state.showAnswersOverview,
    showProgressBar: state.showProgressBar,
    showStepBadge: state.showStepBadge,
    titleAlignment: state.titleAlignment,
  };
}

// Types die options-Array brauchen (Choice-Cards + Dropdown).
const OPTION_BASED_TYPES = new Set<QuestionType>([
  "single_choice",
  "multi_choice",
  "dropdown",
]);

// Types die placeholder + required + maxLength als config nutzen.
const TEXTISH_TYPES = new Set<QuestionType>([
  "short_text",
  "long_text",
  // Aufgabe 40 Polish — Name-Field-Types verhalten sich wie Text auf Question-Pages
  "first_name",
  "last_name",
  "full_name",
]);

export function buildQuestions(
  questions: EditorQuestion[],
  opts: { keepEmpty?: boolean; keepHidden?: boolean } = {},
): QuestionConfig[] {
  return questions
    // Polish: im Builder (keepHidden) bleiben hidden-Pages drin damit das Canvas sie als
    // ausgegrautes Overlay anzeigen kann. Im Test/Live werden sie wie gewohnt rausgefiltert.
    .filter((q) => (opts.keepHidden ? true : q.visible !== false))
    .map((q) => {
      // Aufgabe 39: Welcome-Page durchreichen
      if (q.kind === "welcome") {
        return {
          id: q.questionKey || q._id,
          // Aufgabe 58: dbId als pageId durchreichen — der Editor-Test-Modus wertet
          // damit dieselben Logik-Regeln aus wie das Live-Widget (neue, ungespeicherte
          // Steps haben keine dbId → keine Regeln, linear weiter).
          pageId: q.dbId,
          title: q.title,
          subtitle: q.subtitle || undefined,
          questionType: "single_choice" as const,
          visible: q.visible,
          options: [],
          config: { buttonLabel: q.welcomeButtonLabel || "Starten" },
          kind: "welcome" as const,
        };
      }

      // Aufgabe 38: Custom-Pages durchreichen mit ihren customFields
      if (q.kind === "custom") {
        return {
          id: q.questionKey || q._id,
          pageId: q.dbId,
          title: q.title,
          subtitle: q.subtitle || undefined,
          questionType: "single_choice" as const,
          visible: q.visible,
          options: [],
          config: {},
          kind: "custom" as const,
          customFields: (q.customFields ?? []).filter((f) => f.visible),
        };
      }

      let opts$1: typeof q.options;
      if (OPTION_BASED_TYPES.has(q.questionType)) {
        opts$1 = opts.keepEmpty ? q.options : q.options.filter((o) => o.label.trim());
      } else {
        opts$1 = [];
      }
      // Eindeutige Values garantieren (sonst React-Key-Collision bei Duplikaten / leeren Options).
      const seen = new Map<string, number>();
      const mapped = opts$1.map((o, idx) => {
        const base = o.value || toKey(o.label) || `opt_${idx}`;
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        const value = count === 0 ? base : `${base}_${count + 1}`;
        return {
          label: o.label,
          value,
        };
      });
      return {
        id: q.questionKey || q._id,
        pageId: q.dbId,
        title: q.title,
        subtitle: q.subtitle || undefined,
        questionType: q.questionType,
        visible: q.visible,
        options: mapped,
        // Aufgabe 50: Marker-Stil (A/B/C · 1/2/3 · keiner) ins Widget durchreichen.
        optionMarker: q.optionMarker,
        config: buildQuestionConfig(q),
        kind: "question" as const,
      };
    });
}

// Pro Type die richtige config-jsonb für QuestionConfig + DB bauen.
function buildQuestionConfig(q: EditorQuestion): Record<string, unknown> {
  switch (q.questionType) {
    case "slider":
      return {
        min: Number(q.sliderMin) || 0,
        max: Number(q.sliderMax) || 100,
        step: Number(q.sliderStep) || 1,
        default: Number(q.sliderDefault) || 50,
        unit: q.sliderUnit || "",
      };
    case "short_text":
    case "long_text":
      return {
        ...(q.placeholder ? { placeholder: q.placeholder } : {}),
        ...(q.maxLength ? { maxLength: Number(q.maxLength) } : {}),
        required: q.required,
      };
    case "date":
      return {
        ...(q.dateMin ? { min: q.dateMin } : {}),
        ...(q.dateMax ? { max: q.dateMax } : {}),
        ...(q.dateDefault ? { default: q.dateDefault } : {}),
        required: q.required,
      };
    case "number":
      return {
        ...(q.numberMin ? { min: Number(q.numberMin) } : {}),
        ...(q.numberMax ? { max: Number(q.numberMax) } : {}),
        ...(q.numberStep ? { step: Number(q.numberStep) } : {}),
        ...(q.numberDefault ? { default: Number(q.numberDefault) } : {}),
        ...(q.numberUnit ? { unit: q.numberUnit } : {}),
        required: q.required,
      };
    case "checkbox":
      return {
        label: q.checkboxLabel || "",
        required: q.required,
      };
    // Aufgabe 39: Rating (1-N Sterne)
    case "rating":
      return {
        maxStars: Number(q.ratingMaxStars) || 5,
        required: q.required,
      };
    // Aufgabe 39: Scale (NPS-Style 0-N Buttons)
    case "scale":
      return {
        min: q.scaleMin != null && q.scaleMin !== "" ? Number(q.scaleMin) : 0,
        max: q.scaleMax != null && q.scaleMax !== "" ? Number(q.scaleMax) : 10,
        labelLeft: q.scaleLabelLeft || "",
        labelRight: q.scaleLabelRight || "",
        required: q.required,
      };
    // Aufgabe 39: Statement (kein Input — User klickt OK, keine Antwort gespeichert)
    case "statement":
      return {};
    case "single_choice":
    case "multi_choice":
    case "dropdown":
    default:
      return {};
  }
}

// =============================================================================
// EDITOR STATE → DB ROW SHAPES (für API Routes)
// =============================================================================

export function editorStateToFunnelRow(
  state: EditorState,
  tenantId: string,
  funnelSlug: string,
  fallbackNotificationEmail: string,
): Record<string, unknown> {
  return {
    slug: funnelSlug,
    tenant_id: tenantId,
    funnel_name: state.funnelName || null,
    contact_form_title: state.funnelTitle || null,
    success_message: state.successMessage || null,
    show_progress_bar: state.showProgressBar,
    show_step_badge: state.showStepBadge,
    title_alignment: state.titleAlignment,
    response_message: state.responseMessage || null,
    contact_form_subtitle: state.contactFormSubtitle || null,
    privacy_policy_url: state.privacyPolicyUrl || null,
    privacy_text: state.privacyText || null,
    answers_overview_label: state.answersOverviewLabel || null,
    show_answers_overview: state.showAnswersOverview,
    notification_email: state.notificationEmail?.trim() || fallbackNotificationEmail,
    email_sender_local: state.emailSenderLocal || null,
    primary_color: state.primaryColor || null,
    text_color: state.textColor || null,
    background_color: state.backgroundColor || null,
    page_background_color: state.pageBackgroundColor || null,
    font: state.font || null,
    border_radius: state.borderRadius || null,
    max_width: state.maxWidth || null,
    is_active: state.isActive,
    redirect_url: state.redirectUrl?.trim() || null,
  };
}

// Generiert einen zufälligen, eindeutigen 8-Zeichen-Slug (base36, a-z0-9).
// Lesbarkeit ist irrelevant — der Slug landet nur im Embed-Code, nie in der UI.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateRandomSlug(admin: any): Promise<string> {
  while (true) {
    const slug = Math.random().toString(36).slice(2, 10);
    const { count } = await admin
      .from("funnels")
      .select("slug", { count: "exact", head: true })
      .eq("slug", slug);
    if ((count ?? 0) === 0) return slug;
  }
}

// =============================================================================
// EDITOR STATE → PAGES + FIELDS (Insert-Payload für API Routes)
// =============================================================================

// Mapping ContactFieldConfig.type → field_type-Enum-Wert.
// "text" wird zu "short_text" weil das DB-Enum kein "text" hat (Roadmap-Konsolidierung).
// Aufgabe 39 Polish: long_text/number/date/checkbox/dropdown 1:1 ins DB-Enum.
const CONTACT_TYPE_TO_FIELD_TYPE: Record<ContactFieldConfig["type"], string> = {
  text: "short_text",
  email: "email",
  tel: "tel",
  plz: "plz",
  radio: "radio",
  long_text: "long_text",
  number: "number",
  date: "date",
  checkbox: "checkbox",
  dropdown: "dropdown",
  // Polish-Runde 2 — gleicher 1:1 Roundtrip wie die Question-Types
  slider: "slider",
  multi_choice: "multi_choice",
  rating: "rating",
  scale: "scale",
  // Aufgabe 40 Polish
  first_name: "first_name",
  last_name: "last_name",
  full_name: "full_name",
};

// Welche Types nutzen options[] (für radio/dropdown/multi_choice)?
const OPTION_BASED_CONTACT_TYPES = new Set<ContactFieldConfig["type"]>(["radio", "dropdown", "multi_choice"]);

// Baut pro ContactFieldConfig die config-jsonb. Für slider/rating/scale gibt's Type-spezifische
// Felder (analog QuestionConfig); für checkbox bleibt checkboxLabel; für andere leer.
function buildContactFieldConfig(cf: ContactFieldConfig): Record<string, unknown> {
  switch (cf.type) {
    case "checkbox":
      return cf.checkboxLabel ? { label: cf.checkboxLabel } : {};
    case "slider":
      return {
        ...(cf.sliderMin != null ? { min: cf.sliderMin } : { min: 0 }),
        ...(cf.sliderMax != null ? { max: cf.sliderMax } : { max: 100 }),
        ...(cf.sliderStep != null ? { step: cf.sliderStep } : { step: 1 }),
        ...(cf.sliderDefault != null ? { default: cf.sliderDefault } : { default: 50 }),
        ...(cf.sliderUnit ? { unit: cf.sliderUnit } : {}),
      };
    case "rating":
      return { maxStars: cf.ratingMaxStars ?? 5 };
    case "scale":
      return {
        min: cf.scaleMin ?? 0,
        max: cf.scaleMax ?? 10,
        ...(cf.scaleLabelLeft ? { labelLeft: cf.scaleLabelLeft } : {}),
        ...(cf.scaleLabelRight ? { labelRight: cf.scaleLabelRight } : {}),
      };
    default:
      return {};
  }
}

// Mapping QuestionType → field_type-Enum-Wert.
// Seit Aufgabe 31 sind alle QuestionType-Werte 1:1 valide field_type-Werte —
// die Funktion bleibt für Lesbarkeit (Aufrufer signalisieren ihre Absicht).
function questionTypeToFieldType(qt: QuestionType): string {
  return qt;
}

// Erzeugt eine kryptographisch sichere UUID (v4). Wird benötigt, um Page-IDs
// vorab zu generieren, damit Fields ihre page_id im selben Insert-Batch
// referenzieren können.
function newPageId(): string {
  // crypto.randomUUID() ist seit Node 19 + allen modernen Browsern verfügbar.
  // Server-side: über Next.js' globales `crypto`-Polyfill verfügbar (Node 20+).
  return crypto.randomUUID();
}

// Aufgabe 54: Form-Check für wiederverwendete dbIds (kommen aus der DB, aber der
// State läuft durch den Client — defensiv validieren bevor wir sie persistieren).
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PageInsertRow {
  id: string;
  funnel_id: string;
  page_type: "question" | "submit" | "success" | "custom" | "welcome";
  sort_order: number;
  config: Record<string, unknown>;
}

export interface FieldInsertRow {
  page_id: string;
  field_key: string;
  field_type: string;
  label: string;
  subtitle: string | null;
  placeholder: string | null;
  visible: boolean;
  required: boolean;
  sort_order: number;
  options: unknown;
  config: Record<string, unknown>;
}

// Baut die Insert-Payload für pages + fields aus dem EditorState.
// Struktur pro Funnel (Aufgabe 52D): N × question/custom/welcome-Pages → 1 × success-Page (leer).
// Submit-Page wird nicht mehr erzeugt (Kontaktformular abgeschafft).
export function editorStateToPagesAndFields(
  state: EditorState,
  funnelId: string,
): {
  pages: PageInsertRow[];
  fields: FieldInsertRow[];
  /** Aufgabe 54: Mapping EditorQuestion._id → persistierte Page-UUID. Der PUT gibt
   *  es an den Editor zurück, der die dbIds in seinen State mergt — neu angelegte
   *  Steps haben damit ab dem ersten Save eine stabile UUID (statt bis zum Reload
   *  bei jedem Save zu rotieren).
   *  Aufgabe 58: bei Question-Pages reist zusätzlich der FINALE field_key mit
   *  (questionKey) — bei leerem Editor-Key wird er hier server-seitig generiert,
   *  und der Editor muss ihn kennen (Logik-Bedingungen referenzieren ihn). */
  pageIdByClientId: Array<{ clientId: string; pageId: string; questionKey?: string }>;
} {
  const pages: PageInsertRow[] = [];
  const fields: FieldInsertRow[] = [];
  const pageIdByClientId: Array<{ clientId: string; pageId: string; questionKey?: string }> = [];

  // Aufgabe 40 Polish: Globale Key-Sammlung über alle Question-Pages
  // (Custom-Pages haben eigene per-Page-Eindeutigkeit via DB-Constraint).
  const allQuestionKeys = new Set<string>();

  // Aufgabe 54: Page-UUIDs bleiben über Saves stabil — bestehende Steps reichen ihre
  // dbId (aus dbToEditorState) wieder mit. Damit überleben after_page-Webhook-Bindings
  // (webhook_subscriptions.trigger_page_id, FK ON DELETE SET NULL) das Speichern;
  // vorher bekam jede Page bei jedem Save eine frische UUID → Bindings wurden genullt.
  // Frische UUIDs gibt es nur für neue Steps (kein dbId) und — defensiv — bei
  // ID-Dubletten im State. Persistiert wird via replace_funnel_content-RPC (Upsert).
  const seenPageIds = new Set<string>();

  // Steps (question + custom + welcome Pages interleaved nach Array-Reihenfolge)
  state.questions.forEach((q, idx) => {
    const pageId =
      q.dbId && UUID_PATTERN.test(q.dbId) && !seenPageIds.has(q.dbId)
        ? q.dbId
        : newPageId();
    seenPageIds.add(pageId);
    const mappingEntry: { clientId: string; pageId: string; questionKey?: string } = {
      clientId: q._id,
      pageId,
    };
    pageIdByClientId.push(mappingEntry);

    // Aufgabe 39: Welcome-Screen = Intro-Step mit eigenem Button-Label, kein Field
    if (q.kind === "welcome") {
      pages.push({
        id: pageId,
        funnel_id: funnelId,
        page_type: "welcome",
        sort_order: idx,
        config: {
          title: q.title || "",
          subtitle: q.subtitle || "",
          page_key: q.questionKey || "",
          button_label: q.welcomeButtonLabel || "Starten",
          // Aufgabe 59 Bugfix: Sichtbarkeit persistieren — Welcome/Custom haben kein
          // Field (Questions speichern visible am Field), das Flag lebt im page-config.
          visible: q.visible,
        },
      });
      return;
    }

    // Aufgabe 38: Custom-Page = Multi-Field-Karte, kein klassischer 1-Field-Step
    if (q.kind === "custom") {
      pages.push({
        id: pageId,
        funnel_id: funnelId,
        page_type: "custom",
        sort_order: idx,
        // Title + Subtitle der Custom-Karte landen im page-config, damit das Custom-Page-Field
        // selbst keinen "labeled" page-title rendern muss — saubere Trennung.
        config: {
          title: q.title || "",
          subtitle: q.subtitle || "",
          page_key: q.questionKey || "",
          // Aufgabe 59 Bugfix: page-level Sichtbarkeit der Karte (siehe Welcome oben).
          visible: q.visible,
        },
      });

      // Custom-Fields wie Submit-Fields persistieren — Aufgabe 40 Polish:
      // Existing keys IMMER behalten (auch hässliche/legacy mit Umlauten — Backward-Compat).
      // Nur wenn leer: type-aware Default. Konflikt-Resolution pro Page via Suffix.
      const usedKeysInPage = new Set<string>();
      (q.customFields ?? []).forEach((cf) => {
        const rawKey = cf.key?.trim() ?? "";
        const baseKey = rawKey || generateFieldKey(cf.type, cf.label, usedKeysInPage);
        const finalKey = ensureUniqueKey(baseKey, usedKeysInPage);
        usedKeysInPage.add(finalKey);

        fields.push({
          page_id: pageId,
          field_key: finalKey,
          field_type: CONTACT_TYPE_TO_FIELD_TYPE[cf.type],
          label: cf.label,
          subtitle: null,
          placeholder: cf.placeholder ?? null,
          visible: cf.visible,
          required: cf.required,
          sort_order: cf.sort_order,
          options: OPTION_BASED_CONTACT_TYPES.has(cf.type) ? cf.options ?? [] : [],
          config: buildContactFieldConfig(cf),
        });
      });
      return;
    }

    // Klassische Question-Page (1 Field)
    pages.push({
      id: pageId,
      funnel_id: funnelId,
      page_type: "question",
      sort_order: idx,
      config: {},
    });

    // Types die ihren required-Flag respektieren (sonst implizit true für choice/slider).
    const userControlsRequired =
      TEXTISH_TYPES.has(q.questionType) ||
      q.questionType === "date" ||
      q.questionType === "number" ||
      q.questionType === "checkbox";

    // Types die placeholder als top-level Spalte nutzen (Suchhilfe für API-Filter etc.).
    const hasPlaceholder = TEXTISH_TYPES.has(q.questionType);

    // Aufgabe 40 Polish: Existing keys IMMER behalten (Backward-Compat).
    // Nur leere keys werden aus Title generiert. Konflikt-Resolution via Suffix.
    const rawQKey = q.questionKey?.trim() ?? "";
    const baseKey = rawQKey || generateFieldKey(q.questionType, q.title, allQuestionKeys);
    const finalQKey = ensureUniqueKey(baseKey, allQuestionKeys);
    allQuestionKeys.add(finalQKey);
    // Aufgabe 58: finalen Key zurückmelden (Editor merged ihn wie die dbId).
    mappingEntry.questionKey = finalQKey;

    fields.push({
      page_id: pageId,
      field_key: finalQKey,
      field_type: questionTypeToFieldType(q.questionType),
      label: q.title,
      subtitle: q.subtitle || null,
      placeholder: hasPlaceholder ? q.placeholder || null : null,
      visible: q.visible,
      required: userControlsRequired ? q.required : true,
      sort_order: 0,
      options: OPTION_BASED_TYPES.has(q.questionType)
        ? q.options
            .filter((o) => o.label.trim())
            .map((o, oidx) => ({
              label: o.label,
              value: o.value || toKey(o.label),
              sort_order: oidx,
            }))
        : [],
      // Aufgabe 50: Marker-Stil im config-jsonb persistieren (nur wenn non-default, hält config schlank).
      config:
        OPTION_BASED_TYPES.has(q.questionType) && q.optionMarker && q.optionMarker !== "letters"
          ? { ...buildQuestionConfig(q), optionMarker: q.optionMarker }
          : buildQuestionConfig(q),
    });
  });

  // Aufgabe 52D: Submit-Page (Kontaktformular) wird nicht mehr erzeugt — komplett abgeschafft.
  // Lead-Erfassung läuft über Kontaktdaten-Karten (custom pages). buildContactFieldConfig /
  // CONTACT_TYPE_TO_FIELD_TYPE bleiben — die Karten-Felder nutzen sie weiter.

  // Success-Page (leer, nur Marker) — direkt nach den Fragen.
  pages.push({
    id: newPageId(),
    funnel_id: funnelId,
    page_type: "success",
    sort_order: state.questions.length,
    config: {},
  });

  return { pages, fields, pageIdByClientId };
}

// =============================================================================
// PAGES + FIELDS → EDITOR STATE (für Edit-Seite)
// =============================================================================

// Rückmapping field_type → ContactFieldConfig.type für Submit-Page-Fields.
// Inverse von CONTACT_TYPE_TO_FIELD_TYPE. Unbekannte field_types fallen auf
// "text" zurück, damit das Widget sie zumindest als Texteingabe rendert.
function fieldTypeToContactType(ft: string): ContactFieldConfig["type"] {
  switch (ft) {
    case "short_text":   return "text";
    case "email":        return "email";
    case "tel":          return "tel";
    case "plz":          return "plz";
    case "radio":        return "radio";
    // Aufgabe 39 Polish
    case "long_text":    return "long_text";
    case "number":       return "number";
    case "date":         return "date";
    case "checkbox":     return "checkbox";
    case "dropdown":     return "dropdown";
    // Polish-Runde 2
    case "slider":       return "slider";
    case "multi_choice": return "multi_choice";
    case "rating":       return "rating";
    case "scale":        return "scale";
    // Aufgabe 40 Polish
    case "first_name":   return "first_name";
    case "last_name":    return "last_name";
    case "full_name":    return "full_name";
    default:             return "text";
  }
}

// Eine DB-Field-Row → ContactFieldConfig. Wird sowohl für Submit-Page als auch Custom-Page-Fields
// benutzt — gemeinsame Logik damit slider/rating/scale-Configs konsistent zurückgelesen werden.
function fieldRowToContactConfig(f: DbFieldRow): ContactFieldConfig {
  const t = fieldTypeToContactType(f.field_type);
  const cfg = (f.config ?? {}) as Record<string, unknown>;
  return {
    key: f.field_key,
    type: t,
    label: f.label ?? "",
    placeholder: f.placeholder ?? undefined,
    required: f.required ?? false,
    visible: f.visible ?? true,
    sort_order: f.sort_order ?? 0,
    options:
      (t === "radio" || t === "dropdown" || t === "multi_choice") && Array.isArray(f.options)
        ? (f.options as string[])
        : undefined,
    checkboxLabel: t === "checkbox" && typeof cfg.label === "string" ? cfg.label : undefined,
    // Slider
    sliderMin:     t === "slider" && typeof cfg.min === "number" ? cfg.min : undefined,
    sliderMax:     t === "slider" && typeof cfg.max === "number" ? cfg.max : undefined,
    sliderStep:    t === "slider" && typeof cfg.step === "number" ? cfg.step : undefined,
    sliderUnit:    t === "slider" && typeof cfg.unit === "string" ? cfg.unit : undefined,
    sliderDefault: t === "slider" && typeof cfg.default === "number" ? cfg.default : undefined,
    // Rating
    ratingMaxStars: t === "rating" && typeof cfg.maxStars === "number" ? cfg.maxStars : undefined,
    // Scale
    scaleMin:        t === "scale" && typeof cfg.min === "number" ? cfg.min : undefined,
    scaleMax:        t === "scale" && typeof cfg.max === "number" ? cfg.max : undefined,
    scaleLabelLeft:  t === "scale" && typeof cfg.labelLeft === "string" ? cfg.labelLeft : undefined,
    scaleLabelRight: t === "scale" && typeof cfg.labelRight === "string" ? cfg.labelRight : undefined,
  };
}

// Defensive Fallback: Question-Page ohne Field (sollte nie passieren).
function emptyEditorQuestion(pageId: string): EditorQuestion {
  return {
    _id: uid(),
    dbId: pageId,
    questionKey: "",
    questionType: "single_choice",
    title: "",
    subtitle: "",
    visible: true,
    required: true,
    placeholder: "",
    maxLength: "",
    sliderMin: "0",
    sliderMax: "100",
    sliderStep: "1",
    sliderUnit: "",
    sliderDefault: "50",
    options: [],
    dateMin: "",
    dateMax: "",
    dateDefault: "",
    numberMin: "",
    numberMax: "",
    numberStep: "1",
    numberDefault: "",
    numberUnit: "",
    checkboxLabel: "",
  };
}

// Rückmapping field_type → QuestionType für Question-Page-Fields.
// `email`/`tel`/`radio`/`plz` sind Submit-Page-only (= ContactField-Types) und fallen auf single_choice/short_text zurück
// falls sie versehentlich auf einer Question-Page liegen (Type-Cleanup Aufgabe 34).

const VALID_QUESTION_TYPES: ReadonlySet<string> = new Set([
  "single_choice",
  "multi_choice",
  "short_text",
  "long_text",
  "slider",
  "date",
  "number",
  "dropdown",
  "checkbox",
  // Aufgabe 39
  "rating",
  "scale",
  "statement",
  // Aufgabe 40 Polish
  "first_name",
  "last_name",
  "full_name",
]);

function fieldTypeToQuestionType(ft: string): QuestionType {
  if (VALID_QUESTION_TYPES.has(ft)) return ft as QuestionType;
  return "single_choice";
}

export interface DbPageRow {
  id: string;
  funnel_id: string;
  page_type: "question" | "submit" | "success" | "custom" | "welcome";
  sort_order: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any> | null;
}

export interface DbFieldRow {
  id: string;
  page_id: string;
  field_key: string;
  field_type: string;
  label: string;
  subtitle: string | null;
  placeholder: string | null;
  visible: boolean;
  required: boolean;
  sort_order: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
}

export function dbToEditorState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  funnelRow: Record<string, any>,
  pages: DbPageRow[],
  fields: DbFieldRow[],
): EditorState {
  // Fields nach page_id gruppieren (sortiert nach sort_order innerhalb der Page)
  const fieldsByPage = new Map<string, DbFieldRow[]>();
  for (const f of fields) {
    const list = fieldsByPage.get(f.page_id) ?? [];
    list.push(f);
    fieldsByPage.set(f.page_id, list);
  }
  for (const [, list] of fieldsByPage) {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  // Pages nach Typ getrennt sammeln (sortiert nach sort_order).
  // Aufgabe 38 + 39: question + custom + welcome werden zu einer einzigen ordered Steps-Liste
  // in state.questions, mit kind-Diskriminator pro Entry.
  const stepPages = pages
    .filter((p) => p.page_type === "question" || p.page_type === "custom" || p.page_type === "welcome")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  // Aufgabe 52D: Submit-Page wird ignoriert (contactFields abgeschafft). Orphaned Submit-Pages
  // bei Alt-Funnels bleiben in der DB, werden aber nicht mehr in den Editor-State gelesen.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageConfigById = new Map<string, Record<string, any>>();
  for (const p of pages as Array<{ id: string; config?: Record<string, unknown> }>) {
    pageConfigById.set(p.id, (p.config ?? {}) as Record<string, unknown>);
  }

  const questions: EditorQuestion[] = stepPages.map((page) => {
    const pageFields = fieldsByPage.get(page.id) ?? [];

    // Aufgabe 39: Welcome-Screen rekonstruieren
    if (page.page_type === "welcome") {
      const pageCfg = pageConfigById.get(page.id) ?? {};
      return {
        ...emptyEditorQuestion(page.id),
        kind: "welcome",
        questionKey: typeof pageCfg.page_key === "string" ? pageCfg.page_key : "",
        title: typeof pageCfg.title === "string" ? pageCfg.title : "",
        subtitle: typeof pageCfg.subtitle === "string" ? pageCfg.subtitle : "",
        welcomeButtonLabel: typeof pageCfg.button_label === "string" ? pageCfg.button_label : "Starten",
        // Aufgabe 59 Bugfix: visible aus dem page-config lesen (Alt-Rows ohne Key → sichtbar).
        visible: pageCfg.visible !== false,
        // Aufgabe 40 Polish: existing keys aus DB sind "festgesetzt" — kein Auto-Sync
        _keyTouched: true,
      };
    }

    // Aufgabe 38: Custom-Multi-Field-Page rekonstruieren
    if (page.page_type === "custom") {
      const pageCfg = pageConfigById.get(page.id) ?? {};
      const customFields: ContactFieldConfig[] = pageFields.map((f) => ({
        ...fieldRowToContactConfig(f),
        _keyTouched: true, // existing key aus DB
        _clientId: `cf_load_${f.id ?? uid()}`,
      }));
      return {
        ...emptyEditorQuestion(page.id),
        kind: "custom",
        questionKey: typeof pageCfg.page_key === "string" ? pageCfg.page_key : "",
        title: typeof pageCfg.title === "string" ? pageCfg.title : "",
        subtitle: typeof pageCfg.subtitle === "string" ? pageCfg.subtitle : "",
        // Aufgabe 59 Bugfix: visible aus dem page-config lesen (Alt-Rows ohne Key → sichtbar).
        visible: pageCfg.visible !== false,
        customFields,
        _keyTouched: true,
      };
    }

    const f = pageFields[0];
    if (!f) {
      // Defensive: Question-Page ohne Field → Leerstring-Question (sollte nie passieren)
      return emptyEditorQuestion(page.id);
    }

    const cfg = (f.config ?? {}) as Record<string, unknown>;
    const opts = Array.isArray(f.options) ? f.options : [];
    const questionType = fieldTypeToQuestionType(f.field_type);

    return {
      _id: uid(),
      // Aufgabe 40 Polish: dbId = page.id (NICHT field.id) — wird für after_page-Webhook-Trigger
      // als trigger_page_id benutzt. Server prüft pages.id === trigger_page_id.
      // Vorher hatte dbId f.id (field-id), was bei Webhook-Anlegen "trigger_page_id does not
      // belong to this funnel"-Fehler verursachte.
      dbId: page.id,
      kind: "question",
      questionKey: f.field_key,
      questionType,
      title: f.label ?? "",
      subtitle: f.subtitle ?? "",
      visible: f.visible ?? true,
      required: f.required ?? true,
      placeholder: f.placeholder ?? (typeof cfg.placeholder === "string" ? cfg.placeholder : ""),
      maxLength: cfg.maxLength != null ? String(cfg.maxLength) : "",
      // Slider
      sliderMin: questionType === "slider" && cfg.min != null ? String(cfg.min) : "0",
      sliderMax: questionType === "slider" && cfg.max != null ? String(cfg.max) : "100",
      sliderStep: questionType === "slider" && cfg.step != null ? String(cfg.step) : "1",
      sliderUnit: questionType === "slider" && typeof cfg.unit === "string" ? cfg.unit : "",
      sliderDefault: questionType === "slider" && cfg.default != null ? String(cfg.default) : "50",
      options: opts.map((o: Record<string, unknown>) => ({
        _id: uid(),
        label: typeof o.label === "string" ? o.label : "",
        value: typeof o.value === "string" ? o.value : "",
      })),
      // Date
      dateMin: questionType === "date" && typeof cfg.min === "string" ? cfg.min : "",
      dateMax: questionType === "date" && typeof cfg.max === "string" ? cfg.max : "",
      dateDefault: questionType === "date" && typeof cfg.default === "string" ? cfg.default : "",
      // Number
      numberMin: questionType === "number" && cfg.min != null ? String(cfg.min) : "",
      numberMax: questionType === "number" && cfg.max != null ? String(cfg.max) : "",
      numberStep: questionType === "number" && cfg.step != null ? String(cfg.step) : "1",
      numberDefault: questionType === "number" && cfg.default != null ? String(cfg.default) : "",
      numberUnit: questionType === "number" && typeof cfg.unit === "string" ? cfg.unit : "",
      // Checkbox
      checkboxLabel: questionType === "checkbox" && typeof cfg.label === "string" ? cfg.label : "",
      // Aufgabe 39: Rating
      ratingMaxStars: questionType === "rating" && cfg.maxStars != null ? String(cfg.maxStars) : "5",
      // Aufgabe 39: Scale
      scaleMin: questionType === "scale" && cfg.min != null ? String(cfg.min) : "0",
      scaleMax: questionType === "scale" && cfg.max != null ? String(cfg.max) : "10",
      scaleLabelLeft: questionType === "scale" && typeof cfg.labelLeft === "string" ? cfg.labelLeft : "",
      scaleLabelRight: questionType === "scale" && typeof cfg.labelRight === "string" ? cfg.labelRight : "",
      // Aufgabe 50: Marker-Stil aus config (Default 'letters' wenn nicht gesetzt).
      optionMarker:
        cfg.optionMarker === "numbers" || cfg.optionMarker === "none" ? cfg.optionMarker : "letters",
      // Aufgabe 40 Polish: existing key aus DB → kein Auto-Sync mehr (Stabilität)
      _keyTouched: true,
    };
  });

  return {
    funnelName: funnelRow.funnel_name ?? "",
    funnelTitle: funnelRow.contact_form_title ?? "",
    primaryColor: funnelRow.primary_color ?? "#22c55e",
    textColor: funnelRow.text_color ?? "#1f2937",
    backgroundColor: funnelRow.background_color ?? "#ffffff",
    pageBackgroundColor: funnelRow.page_background_color ?? "transparent",
    font: funnelRow.font ?? "system",
    borderRadius: funnelRow.border_radius ?? "0.5rem",
    maxWidth: funnelRow.max_width ?? "720px",
    contactFormSubtitle: funnelRow.contact_form_subtitle ?? "",
    successMessage: funnelRow.success_message ?? "",
    responseMessage: funnelRow.response_message ?? "",
    privacyText: funnelRow.privacy_text ?? "",
    privacyPolicyUrl: funnelRow.privacy_policy_url ?? "",
    answersOverviewLabel: funnelRow.answers_overview_label ?? "",
    showProgressBar: funnelRow.show_progress_bar ?? true,
    showStepBadge: funnelRow.show_step_badge ?? true,
    titleAlignment: funnelRow.title_alignment === "center" ? "center" : "left",
    showAnswersOverview: funnelRow.show_answers_overview ?? false,
    notificationEmail: funnelRow.notification_email ?? "",
    emailSenderLocal: funnelRow.email_sender_local ?? "",
    isActive: funnelRow.is_active ?? true,
    redirectUrl: funnelRow.redirect_url ?? "",
    questions,
  };
}
