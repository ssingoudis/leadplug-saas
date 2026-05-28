import type {
  EditorState,
  EditorQuestion,
  QuestionType,
  QuestionConfig,
  FunnelConfig,
  FunnelTheme,
  ContactFieldConfig,
} from "@/types";
import { DEFAULT_CONTACT_FIELDS } from "@/components/tenant-editor/defaults";

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
    submitButtonLabel: state.submitButtonLabel || "Anfrage absenden",
    successMessage:
      state.successMessage || "Vielen Dank! Wir melden uns in Kürze bei Ihnen.",
    responseMessage:
      state.responseMessage ||
      "Wir melden uns so schnell wie möglich bei Ihnen.",
    contactFormSubtitle:
      state.contactFormSubtitle || "Wer soll das Angebot erhalten?",
    privacyPolicyUrl: state.privacyPolicyUrl || "#",
    privacyText:
      state.privacyText ||
      "Mit dem Absenden stimme ich zu, per E-Mail und Telefon kontaktiert zu werden.",
    answersOverviewLabel:
      state.answersOverviewLabel || "Ihre Angaben im Überblick:",
    footerText:
      state.footerText || "{{company_name}} · {{public_email}}",
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
  "email",
  "tel",
]);

export function buildQuestions(questions: EditorQuestion[]): QuestionConfig[] {
  return questions
    .filter((q) => q.visible !== false)
    .map((q) => ({
      id: q.questionKey || q._id,
      title: q.title,
      subtitle: q.subtitle || undefined,
      questionType: q.questionType,
      visible: q.visible,
      options: OPTION_BASED_TYPES.has(q.questionType)
        ? q.options
            .filter((o) => o.label.trim())
            .map((o) => ({
              label: o.label,
              value: o.value || toKey(o.label),
              iconKey: o.iconKey || "",
              iconUrl: o.iconUrl || undefined,
            }))
        : [],
      config: buildQuestionConfig(q),
    }));
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
    case "email":
    case "tel":
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
    submit_button_label: state.submitButtonLabel || null,
    success_message: state.successMessage || null,
    response_message: state.responseMessage || null,
    contact_form_subtitle: state.contactFormSubtitle || null,
    privacy_policy_url: state.privacyPolicyUrl || null,
    privacy_text: state.privacyText || null,
    answers_overview_label: state.answersOverviewLabel || null,
    footer_text: state.footerText || null,
    footer_company_name: state.footerCompanyName || null,
    footer_email: state.footerEmail || null,
    footer_phone: state.footerPhone || null,
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
const CONTACT_TYPE_TO_FIELD_TYPE: Record<ContactFieldConfig["type"], string> = {
  text: "short_text",
  email: "email",
  tel: "tel",
  plz: "plz",
  radio: "radio",
};

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

export interface PageInsertRow {
  id: string;
  funnel_id: string;
  page_type: "question" | "submit" | "success";
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
// Struktur pro Funnel: N × question-Pages (1 Field je Page) → 1 × submit-Page
// (alle contactFields als Fields) → 1 × success-Page (leer).
export function editorStateToPagesAndFields(
  state: EditorState,
  funnelId: string,
): { pages: PageInsertRow[]; fields: FieldInsertRow[] } {
  const pages: PageInsertRow[] = [];
  const fields: FieldInsertRow[] = [];

  // Question-Pages + Question-Fields
  state.questions.forEach((q, idx) => {
    const pageId = newPageId();
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

    fields.push({
      page_id: pageId,
      field_key: q.questionKey,
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
              icon_key: o.iconKey || "",
              icon_url: o.iconUrl || null,
              sort_order: oidx,
            }))
        : [],
      config: buildQuestionConfig(q),
    });
  });

  // Submit-Page mit allen ContactFields
  const submitPageId = newPageId();
  pages.push({
    id: submitPageId,
    funnel_id: funnelId,
    page_type: "submit",
    sort_order: state.questions.length,
    config: {},
  });

  state.contactFields.forEach((cf) => {
    fields.push({
      page_id: submitPageId,
      field_key: cf.key,
      field_type: CONTACT_TYPE_TO_FIELD_TYPE[cf.type],
      label: cf.label,
      subtitle: null,
      placeholder: cf.placeholder ?? null,
      visible: cf.visible,
      required: cf.required,
      sort_order: cf.sort_order,
      options: cf.type === "radio" ? cf.options ?? [] : [],
      config: {},
    });
  });

  // Success-Page (leer, nur Marker)
  pages.push({
    id: newPageId(),
    funnel_id: funnelId,
    page_type: "success",
    sort_order: state.questions.length + 1,
    config: {},
  });

  return { pages, fields };
}

// =============================================================================
// PAGES + FIELDS → EDITOR STATE (für Edit-Seite)
// =============================================================================

// Rückmapping field_type → ContactFieldConfig.type für Submit-Page-Fields.
// Inverse von CONTACT_TYPE_TO_FIELD_TYPE. Unbekannte field_types fallen auf
// "text" zurück, damit das Widget sie zumindest als Texteingabe rendert.
function fieldTypeToContactType(ft: string): ContactFieldConfig["type"] {
  switch (ft) {
    case "short_text":
      return "text";
    case "email":
      return "email";
    case "tel":
      return "tel";
    case "plz":
      return "plz";
    case "radio":
      return "radio";
    default:
      return "text";
  }
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
// Seit Aufgabe 31 sind alle QuestionType-Werte 1:1 valide field_type-Werte.
// `radio` + `plz` sind Submit-Page-only und fallen auf single_choice zurück.
const VALID_QUESTION_TYPES: ReadonlySet<string> = new Set([
  "single_choice",
  "multi_choice",
  "short_text",
  "long_text",
  "slider",
  "email",
  "tel",
  "date",
  "number",
  "dropdown",
  "checkbox",
]);

function fieldTypeToQuestionType(ft: string): QuestionType {
  if (VALID_QUESTION_TYPES.has(ft)) return ft as QuestionType;
  return "single_choice";
}

export interface DbPageRow {
  id: string;
  funnel_id: string;
  page_type: "question" | "submit" | "success";
  sort_order: number;
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

  // Pages nach Typ getrennt sammeln (sortiert nach sort_order)
  const questionPages = pages
    .filter((p) => p.page_type === "question")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const submitPage = pages.find((p) => p.page_type === "submit");

  // EditorQuestions aus Question-Pages bauen (1 Field je Page erwartet, defensiv erstes nehmen)
  const questions: EditorQuestion[] = questionPages.map((page) => {
    const pageFields = fieldsByPage.get(page.id) ?? [];
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
      dbId: f.id,
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
        iconKey: typeof o.icon_key === "string" ? o.icon_key : "",
        iconUrl: typeof o.icon_url === "string" ? o.icon_url : "",
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
    };
  });

  // ContactFields aus Submit-Page-Fields bauen
  const contactFields: ContactFieldConfig[] = submitPage
    ? (fieldsByPage.get(submitPage.id) ?? []).map((f) => ({
        key: f.field_key,
        type: fieldTypeToContactType(f.field_type),
        label: f.label ?? "",
        placeholder: f.placeholder ?? undefined,
        required: f.required ?? false,
        visible: f.visible ?? true,
        sort_order: f.sort_order ?? 0,
        options:
          f.field_type === "radio" && Array.isArray(f.options)
            ? (f.options as string[])
            : undefined,
      }))
    : DEFAULT_CONTACT_FIELDS;

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
    submitButtonLabel: funnelRow.submit_button_label ?? "",
    successMessage: funnelRow.success_message ?? "",
    responseMessage: funnelRow.response_message ?? "",
    privacyText: funnelRow.privacy_text ?? "",
    privacyPolicyUrl: funnelRow.privacy_policy_url ?? "",
    footerText: funnelRow.footer_text ?? "",
    answersOverviewLabel: funnelRow.answers_overview_label ?? "",
    footerCompanyName: funnelRow.footer_company_name ?? "",
    footerEmail: funnelRow.footer_email ?? "",
    footerPhone: funnelRow.footer_phone ?? "",
    notificationEmail: funnelRow.notification_email ?? "",
    emailSenderLocal: funnelRow.email_sender_local ?? "",
    isActive: funnelRow.is_active ?? true,
    questions,
    contactFields,
  };
}
