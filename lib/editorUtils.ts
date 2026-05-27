import type {
  EditorState,
  EditorQuestion,
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

export function buildQuestions(questions: EditorQuestion[]): QuestionConfig[] {
  return questions
    .filter((q) => q.visible !== false)
    .map((q) => ({
      id: q.questionKey || q._id,
      title: q.title,
      subtitle: q.subtitle || undefined,
      questionType: q.questionType,
      visible: q.visible,
      options:
        q.questionType === "single_choice" ||
        q.questionType === "multiple_choice"
          ? q.options
              .filter((o) => o.label.trim())
              .map((o) => ({
                label: o.label,
                value: o.value || toKey(o.label),
                iconKey: o.iconKey || "",
                iconUrl: o.iconUrl || undefined,
              }))
          : [],
      config:
        q.questionType === "slider"
          ? {
              min: Number(q.sliderMin) || 0,
              max: Number(q.sliderMax) || 100,
              step: Number(q.sliderStep) || 1,
              default: Number(q.sliderDefault) || 50,
              unit: q.sliderUnit || "",
            }
          : q.questionType === "short_text" || q.questionType === "long_text"
            ? {
                placeholder: q.placeholder || undefined,
                maxLength: q.maxLength ? Number(q.maxLength) : undefined,
                required: q.required,
              }
            : {},
    }));
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
    contact_fields: state.contactFields,
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

export function editorQuestionsToDbRows(
  questions: EditorQuestion[],
  funnelId: string,
): Record<string, unknown>[] {
  return questions.map((q, idx) => ({
    funnel_id: funnelId,
    question_key: q.questionKey,
    title: q.title,
    subtitle: q.subtitle || null,
    question_type: q.questionType,
    visible: q.visible,
    sort_order: idx,
    config:
      q.questionType === "slider"
        ? {
            min: Number(q.sliderMin) || 0,
            max: Number(q.sliderMax) || 100,
            step: Number(q.sliderStep) || 1,
            default: Number(q.sliderDefault) || 50,
            unit: q.sliderUnit || "",
          }
        : q.questionType === "short_text" || q.questionType === "long_text"
          ? {
              placeholder: q.placeholder || undefined,
              maxLength: q.maxLength ? Number(q.maxLength) : undefined,
              required: q.required,
            }
          : {},
    options:
      q.questionType === "single_choice" ||
      q.questionType === "multiple_choice"
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
  }));
}

// =============================================================================
// DB ROW → EDITOR STATE (für Edit-Seite)
// =============================================================================

export function dbToEditorState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  funnelRow: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  questionRows: Record<string, any>[],
): EditorState {
  const questions: EditorQuestion[] = questionRows
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((q) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts: Record<string, any>[] = Array.isArray(q.options)
        ? q.options
        : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg: Record<string, any> = q.config ?? {};
      return {
        _id: uid(),
        dbId: q.id,
        questionKey: q.question_key,
        questionType: q.question_type ?? "single_choice",
        title: q.title ?? "",
        subtitle: q.subtitle ?? "",
        visible: q.visible ?? true,
        required: cfg.required !== false,
        placeholder: cfg.placeholder ?? "",
        maxLength: cfg.maxLength ? String(cfg.maxLength) : "",
        sliderMin: cfg.min != null ? String(cfg.min) : "0",
        sliderMax: cfg.max != null ? String(cfg.max) : "100",
        sliderStep: cfg.step != null ? String(cfg.step) : "1",
        sliderUnit: cfg.unit ?? "",
        sliderDefault: cfg.default != null ? String(cfg.default) : "50",
        options: opts.map((o) => ({
          _id: uid(),
          label: o.label ?? "",
          value: o.value ?? "",
          iconKey: o.icon_key ?? "",
          iconUrl: o.icon_url ?? "",
        })),
      };
    });

  const contactFields: ContactFieldConfig[] = Array.isArray(
    funnelRow.contact_fields,
  )
    ? (funnelRow.contact_fields as ContactFieldConfig[])
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
