"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Trash2, Send, RefreshCw, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, Clock, Mail, GripVertical, Pencil, Zap, User, Inbox, AtSign, X, TriangleAlert,
} from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CUSTOM_RECIPIENTS = 5;
import { EmailEditor } from "./email/EmailEditor";
import { buildFunnelVariables, type FunnelVariables } from "./email/funnelVariables";
import { renderEmail, RECIPIENT_ME, type TemplateContext } from "@/lib/emailTemplates";
import type { EditorState, TenantConfig, QuestionConfig } from "@/types";
import { EmptyState, EDITOR_LEFT_COL, PanelListHeader } from "./ui/Panel";
import { EditorButton, TextInput, Select, Toggle } from "./ui/Controls";

// =============================================================================
// DEMO-MODE: bei API-Fehler (z.B. Tabelle existiert nicht) fallen wir in einen
// Mock-Mode mit In-Memory-Subscriptions. Alle Änderungen werden nur lokal
// gehalten — gibt Stavros eine UI-Vorschau ohne DB-Migration.
// =============================================================================

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `demo-${Math.random().toString(36).slice(2)}`;
}

function makeDemoSubs(): SubscriptionRow[] {
  const now = new Date().toISOString();
  return [
    {
      id: makeId(),
      name: "Bestätigung an Kunde",
      recipient_type: "customer",
      recipient_value: null,
      delay_minutes: 0,
      subject: 'Ihre Anfrage ist eingegangen',
      body_html:
        '<p>Vielen Dank, <span data-variable="contact.name">{{contact.name}}</span>!</p>' +
        '<p>Wir haben Ihre Anfrage erhalten und melden uns binnen 24 Stunden bei Ihnen zurück.</p>' +
        '<div data-magic-section="answers_overview"></div>' +
        '<p>Bei Rückfragen antworten Sie einfach auf diese E-Mail.</p>' +
        '<p>Beste Grüße</p>',
      from_local: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: makeId(),
      name: "Reminder nach 3 Tagen",
      recipient_type: "customer",
      recipient_value: null,
      delay_minutes: 4320,
      subject: 'Erinnerung: Ihre Anfrage',
      body_html:
        '<p>Hallo <span data-variable="contact.name">{{contact.name}}</span>,</p>' +
        '<p>vor ein paar Tagen haben Sie eine Anfrage bei uns gestellt. Sind noch Fragen offen?</p>' +
        '<p>Wir helfen gerne weiter — antworten Sie einfach auf diese E-Mail oder rufen Sie uns an.</p>' +
        '<p>Beste Grüße</p>',
      from_local: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: makeId(),
      name: "Lead-Benachrichtigung an dich",
      recipient_type: "tenant",
      recipient_value: null,
      delay_minutes: 0,
      subject: 'Neue Anfrage von <span data-variable="contact.name">{{contact.name}}</span>',
      body_html:
        '<p><strong>Neue Anfrage eingegangen!</strong></p>' +
        '<p>Eingegangen: <span data-variable="submitted_at">{{submitted_at}}</span></p>' +
        '<div data-magic-section="answers_overview"></div>' +
        '<div data-magic-section="dashboard_button"></div>',
      from_local: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];
}

// =============================================================================
// Aufgabe 41 — E-Mails-Tab: 3-Pane (Liste · Editor · Live-Vorschau)
// =============================================================================

interface Props {
  funnelSlug: string;
  state: EditorState;
}

type RecipientType = "customer" | "tenant" | "custom";

interface SubscriptionRow {
  id:              string;
  name:            string;
  recipient_type:  RecipientType;
  recipient_value: string | null;
  delay_minutes:   number;
  subject:         string;
  body_html:       string;
  from_local:      string | null;
  is_active:       boolean;
  created_at:      string;
  updated_at:      string;
}

interface PreviewLead {
  id:           string;
  created_at:   string;
  completed_at: string | null;
  contact:      Record<string, string>;
  answers:      Record<string, string>;
  display_name: string;
}

interface DeliveryAttempt {
  id:                string;
  scheduled_at:      string;
  attempt_count:     number;
  status:            "pending" | "retrying" | "success" | "failed";
  last_error:        string | null;
  resend_message_id: string | null;
  recipient_address: string | null;
  delivered_at:      string | null;
  next_retry_at:     string | null;
  created_at:        string;
}

// Draft: alles editierbar, lebt im Parent damit Editor + Vorschau die gleichen
// Live-Werte sehen.
interface EmailDraft {
  name:            string;
  recipient_type:  RecipientType;
  recipient_value: string | null;
  delay_minutes:   number;
  subject:         string;
  body_html:       string;
  is_active:       boolean;
}

function subToDraft(s: SubscriptionRow): EmailDraft {
  return {
    name:            s.name,
    recipient_type:  s.recipient_type,
    recipient_value: s.recipient_value,
    delay_minutes:   s.delay_minutes,
    subject:         s.subject,
    body_html:       s.body_html,
    is_active:       s.is_active,
  };
}

function draftsEqual(a: EmailDraft, b: EmailDraft): boolean {
  return (
    a.name === b.name &&
    a.recipient_type === b.recipient_type &&
    (a.recipient_value ?? "") === (b.recipient_value ?? "") &&
    a.delay_minutes === b.delay_minutes &&
    a.subject === b.subject &&
    a.body_html === b.body_html &&
    a.is_active === b.is_active
  );
}

// ---------------------------------------------------------------------------
// Delay-Helpers (Minuten ⇄ {amount, unit})
// ---------------------------------------------------------------------------

export type DelayUnit = "minutes" | "hours" | "days";

export function minutesToDelay(min: number): { amount: number; unit: DelayUnit } {
  if (min === 0) return { amount: 0, unit: "minutes" };
  if (min % 1440 === 0) return { amount: min / 1440, unit: "days" };
  if (min % 60 === 0)   return { amount: min / 60,   unit: "hours" };
  return { amount: min, unit: "minutes" };
}

export function delayToMinutes(amount: number, unit: DelayUnit): number {
  const n = Math.max(0, Math.floor(amount));
  if (unit === "days")    return n * 1440;
  if (unit === "hours")   return n * 60;
  return n;
}

export function formatDelay(min: number): string {
  if (min === 0) return "Sofort";
  const { amount, unit } = minutesToDelay(min);
  const noun =
    unit === "days"  ? (amount === 1 ? "Tag" : "Tagen")
    : unit === "hours" ? (amount === 1 ? "Stunde" : "Stunden")
    : (amount === 1 ? "Minute" : "Minuten");
  return `nach ${amount} ${noun}`;
}

// ---------------------------------------------------------------------------
// Custom-Recipient Helpers + UI
// ---------------------------------------------------------------------------

/** Parst recipient_value (kommagetrennt) zu Liste von trimmed Strings. */
export function parseRecipients(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// Aufgabe 53: Empfänger-Editor für den „feste Adresse(n)"-Modus. Verwaltet eine Liste aus
// E-Mail-Adressen + optional dem Marker „Mein Postfach" (RECIPIENT_ME → notification_email).
// Mappt zurück auf das DB-Modell: nur [@me] → recipient_type 'tenant'; sonst 'custom' mit Liste.
function FixedRecipients({
  recipientType,
  recipientValue,
  tenantInbox,
  onChange,
}: {
  recipientType: "tenant" | "custom";
  recipientValue: string | null;
  tenantInbox: string;
  onChange: (patch: { recipient_type: RecipientType; recipient_value: string | null }) => void;
}) {
  // entries: committete Empfänger (RECIPIENT_ME-Marker ODER E-Mail). Keine leeren Slots —
  // neue Adressen kommen über das Inline-Feld (inputDraft) und werden per Enter zu Chips.
  const derive = useCallback((): string[] => {
    if (recipientType === "tenant") return [RECIPIENT_ME];
    return parseRecipients(recipientValue);
  }, [recipientType, recipientValue]);

  const [entries, setEntries] = useState<string[]>(derive);
  const [inputDraft, setInputDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [addingEmail, setAddingEmail] = useState(false);

  // External-Reset bei Subscription-Wechsel / Änderung von außen (eigene Emits werden geguarded).
  const keyOf = (t: string, v: string | null) => `${t}|${v ?? ""}`;
  const lastKeyRef = useRef(keyOf(recipientType, recipientValue));
  useEffect(() => {
    const k = keyOf(recipientType, recipientValue);
    if (k === lastKeyRef.current) return;
    lastKeyRef.current = k;
    setEntries(derive());
    setInputDraft("");
    setInputError(null);
    setAddingEmail(false);
  }, [recipientType, recipientValue, derive]);

  function commitEntries(next: string[]) {
    setEntries(next);
    let patch: { recipient_type: RecipientType; recipient_value: string | null };
    if (next.length === 1 && next[0] === RECIPIENT_ME) {
      patch = { recipient_type: "tenant", recipient_value: null };
    } else if (next.length > 0) {
      patch = { recipient_type: "custom", recipient_value: next.join(", ") };
    } else {
      patch = { recipient_type: "custom", recipient_value: null };
    }
    lastKeyRef.current = keyOf(patch.recipient_type, patch.recipient_value);
    onChange(patch);
  }

  const hasMe = entries.includes(RECIPIENT_ME);
  const emailCount = entries.filter((e) => e !== RECIPIENT_ME).length;
  const canAddEmail = emailCount < MAX_CUSTOM_RECIPIENTS;

  function removeAt(idx: number) { commitEntries(entries.filter((_, i) => i !== idx)); }
  function tryAddEmail(): boolean {
    const v = inputDraft.trim().replace(/,$/, "").trim();
    if (!v) { setInputError(null); return false; }
    if (!EMAIL_RE.test(v)) { setInputError("Keine gültige E-Mail-Adresse."); return false; }
    if (entries.includes(v)) { setInputDraft(""); setInputError(null); return true; }
    if (!canAddEmail) { setInputError(`Maximal ${MAX_CUSTOM_RECIPIENTS} Adressen.`); return false; }
    commitEntries([...entries, v]);
    setInputDraft("");
    setInputError(null);
    return true;
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900">
      {/* Mein-Postfach-Box (eigenständig, zeigt die Account-Adresse) */}
      {hasMe && (
        <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1.5 dark:border-primary/30 dark:bg-primary/10">
          <Inbox size={14} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 dark:text-white">Mein Postfach</p>
            <p className="truncate text-[11px] text-gray-500" title={tenantInbox || "noch nicht konfiguriert"}>
              {tenantInbox || <span className="text-amber-600 dark:text-amber-400">noch keine Benachrichtigungs-Adresse hinterlegt</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeAt(entries.indexOf(RECIPIENT_ME))}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            title="Mein Postfach entfernen"
            aria-label="Mein Postfach entfernen"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Adress-Chips */}
      {emailCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entries.map((entry, idx) =>
            entry === RECIPIENT_ME ? null : (
              <span
                key={idx}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/30 bg-primary/10 py-1 pl-2 pr-1 text-xs text-primary"
              >
                <span className="truncate" title={entry}>{entry}</span>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="shrink-0 rounded p-0.5 hover:bg-primary/20"
                  title="Adresse entfernen"
                  aria-label={`${entry} entfernen`}
                >
                  <X size={12} />
                </button>
              </span>
            ),
          )}
        </div>
      )}

      {/* Inline-Feld zum Hinzufügen — erscheint per „+ Weitere Adresse" (tippen + Enter → Chip) */}
      {canAddEmail && addingEmail && (
        <div>
          <div className="flex items-center gap-2">
            <AtSign size={14} className="shrink-0 text-gray-400" />
            <input
              type="email"
              autoFocus
              value={inputDraft}
              onChange={(e) => { setInputDraft(e.target.value); if (inputError) setInputError(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") { e.preventDefault(); tryAddEmail(); }
                else if (e.key === "Escape") { e.preventDefault(); setInputDraft(""); setInputError(null); setAddingEmail(false); }
              }}
              onBlur={() => {
                if (!inputDraft.trim()) { setInputError(null); setAddingEmail(false); }
                else if (tryAddEmail()) setAddingEmail(false);
              }}
              placeholder="E-Mail eingeben und Enter drücken…"
              className={`flex-1 rounded border bg-white px-2 py-1 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100 ${
                inputError ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"
              }`}
            />
          </div>
          {inputError && <p className="mt-1 ml-6 text-[11px] text-red-600 dark:text-red-400">{inputError}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {canAddEmail && !addingEmail && (
          <button type="button" onClick={() => setAddingEmail(true)} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            <Plus size={11} strokeWidth={2.5} /> Adresse hinzufügen
          </button>
        )}
        {!canAddEmail && (
          <span className="text-[10px] text-gray-400">Maximum {MAX_CUSTOM_RECIPIENTS} Adressen erreicht</span>
        )}
      </div>

      {entries.length === 0 && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          ⚠️ Noch kein Empfänger — füge „Mein Postfach" oder eine Adresse hinzu, sonst kann die Mail nicht zugestellt werden.
        </p>
      )}

      <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
        ⚠️ Stelle sicher, dass alle Empfänger zugestimmt haben (DSGVO). Du bist als Tenant für die Rechtmäßigkeit verantwortlich.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview-Mock Builder (aus EditorState)
// ---------------------------------------------------------------------------

const MOCK_CONTACT = {
  name:    "Max Mustermann",
  email:   "max.mustermann@example.com",
  telefon: "+49 170 1234567",
  anrede:  "Herr",
};

function buildPreviewConfig(state: EditorState, funnelSlug: string): TenantConfig {
  // EditorQuestion → QuestionConfig (minimal für Renderer)
  const questions: QuestionConfig[] = state.questions
    .filter((q) => q.visible)
    .map((q) => ({
      // Aufgabe 53: Token-Key = field_key (questionKey), damit answer.<key>-Variablen in der
      // Vorschau dieselben Keys treffen wie im echten Versand.
      id:           q.questionKey || q._id,
      title:        q.title || "Beispielfrage",
      subtitle:     q.subtitle,
      questionType: q.questionType,
      options:      q.options.map((o) => ({ label: o.label, value: o.value })),
      config:       {} as Record<string, never>,
      visible:      q.visible,
      kind:         q.kind,
      customFields: q.customFields,
    }));

  return {
    funnelId:          undefined,
    slug:              funnelSlug,
    companyName:       state.funnelName || "Beispiel-Firma",
    notificationEmail: state.notificationEmail || "inbox@example.com",
    theme: {
      primaryColor:        state.primaryColor || "#4F46E5",
      textColor:           state.textColor,
      backgroundColor:     state.backgroundColor,
      pageBackgroundColor: state.pageBackgroundColor,
      font:                state.font,
      borderRadius:        state.borderRadius,
      maxWidth:            state.maxWidth,
    },
    funnel: {
      title:                state.funnelTitle,
      submitButtonLabel:    state.submitButtonLabel,
      successMessage:       state.successMessage,
      responseMessage:      state.responseMessage,
      contactFormSubtitle:  state.contactFormSubtitle,
      privacyText:          state.privacyText,
      privacyPolicyUrl:     state.privacyPolicyUrl || undefined,
      answersOverviewLabel: state.answersOverviewLabel || "Angaben im Überblick",
      showAnswersOverview:  state.showAnswersOverview,
    },
    billingModel:    "per_month",
    leadPrice:       0,
    questions,
  };
}

function buildMockAnswers(questions: QuestionConfig[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of questions) {
    if (q.kind === "welcome" || q.questionType === "statement") continue;
    if (q.kind === "custom" && q.customFields) {
      for (const f of q.customFields) out[f.key] = "Beispiel-Antwort";
      continue;
    }
    if (q.options.length > 0) out[q.id] = q.options[0].value;
    else if (q.questionType === "checkbox") out[q.id] = "true";
    else if (q.questionType === "rating") out[q.id] = "4";
    else if (q.questionType === "scale") out[q.id] = "8";
    else if (q.questionType === "number" || q.questionType === "slider") out[q.id] = "42";
    else if (q.questionType === "date") out[q.id] = new Date().toISOString().slice(0, 10);
    else out[q.id] = "Beispiel-Antwort";
  }
  return out;
}

// ---------------------------------------------------------------------------
// Default-Werte für neue Subscription
// ---------------------------------------------------------------------------

const DEFAULT_NEW_SUBJECT = 'Wir haben Ihre Anfrage erhalten';

const DEFAULT_NEW_BODY =
  '<p>Hallo <span data-variable="contact.name">{{contact.name}}</span>,</p>' +
  '<p>vielen Dank für Ihre Anfrage! Wir melden uns zeitnah bei Ihnen zurück.</p>' +
  '<p>Beste Grüße</p>';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function EmailsPanel({ funnelSlug, state }: Props) {
  // Aufgabe 53: dynamische Mail-Variablen aus den Funnel-Feldern (Picker-Gruppen + Chip-Labels).
  const mailVariables = useMemo(() => buildFunnelVariables(state.questions), [state.questions]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Resizable Preview-Pane — Default 680 damit die 600px-Mail-Card mit etwas Whitespace
  // drumherum gut sitzt. Min 632 damit die Card nicht gequetscht wird.
  const [rightWidth, setRightWidth] = useState(680);

  // Preview-Datenquelle: null = Mock, sonst lead-id aus previewLeads
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tenant/funnels/${funnelSlug}/preview-leads?limit=5`);
        if (!res.ok) return;
        const data = (await res.json()) as PreviewLead[];
        if (!cancelled && Array.isArray(data)) setPreviewLeads(data);
      } catch {
        // demo-mode oder netzwerk-fehler → bleibt bei Mock
      }
    })();
    return () => { cancelled = true; };
  }, [funnelSlug]);

  const previewLead = useMemo(
    () => previewLeads.find((l) => l.id === previewLeadId) ?? null,
    [previewLeads, previewLeadId],
  );

  const loadSubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/funnels/${funnelSlug}/emails`);
      if (!res.ok) {
        // Auto-Fallback: API liefert Fehler (z.B. Tabelle existiert nicht)
        // → Demo-Mode mit In-Memory-Subscriptions
        const demo = makeDemoSubs();
        setSubs(demo);
        setDemoMode(true);
        setSelectedId((prev) => prev ?? demo[0]?.id ?? null);
        return;
      }
      const data = (await res.json()) as SubscriptionRow[];
      setSubs(Array.isArray(data) ? data : []);
      setDemoMode(false);
      setSelectedId((prev) => {
        if (prev && data.some((s) => s.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    } catch {
      // Netzwerk-Fehler → ebenfalls Demo-Mode
      const demo = makeDemoSubs();
      setSubs(demo);
      setDemoMode(true);
      setSelectedId((prev) => prev ?? demo[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [funnelSlug]);

  useEffect(() => { loadSubs(); }, [loadSubs]);

  const selected = useMemo(
    () => subs.find((s) => s.id === selectedId) ?? null,
    [subs, selectedId],
  );

  // Live-Draft: synct sich mit der ausgewählten Subscription. Editor + Vorschau
  // arbeiten beide gegen diesen Draft. So updaten sich Subject/Body in der
  // Vorschau bei jedem Tastendruck.
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [saving, setSaving] = useState(false);

  // Bei Selection-Wechsel oder nach Save (updated_at ändert sich) draft neu setzen.
  useEffect(() => {
    setDraft(selected ? subToDraft(selected) : null);
    // Wir wollen nur reset bei Selection-Wechsel ODER wenn Server-State sich geändert hat
    // (updated_at). Innerhalb derselben Bearbeitung NICHT überschreiben.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.updated_at]);

  const dirty = useMemo(() => {
    if (!selected || !draft) return false;
    return !draftsEqual(draft, subToDraft(selected));
  }, [draft, selected]);

  const patchDraft = useCallback((patch: Partial<EmailDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  // Save-Handler — ref-stable, damit Auto-Save-Effekt nicht bei jeder Änderung
  // neu registriert wird.
  const savePending = useRef(false);
  const handleSave = useCallback(async () => {
    if (!selected || !draft || !dirty || savePending.current) return;
    savePending.current = true;
    setSaving(true);
    try {
      await patchSub(selected.id, { ...draft });
    } finally {
      setSaving(false);
      savePending.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, draft, dirty]);

  // Kein Auto-Save mehr — manuell speichern, wie überall sonst im Editor.
  // Bei Verlassen mit unsaved Changes zeigen wir stattdessen einen Warn-Modal.

  function nextDefaultName(): string {
    // "E-Mail 1", "E-Mail 2", … — überspringt Namen die bereits vergeben sind.
    const existing = new Set(subs.map((s) => s.name));
    for (let i = subs.length + 1; ; i++) {
      const candidate = `E-Mail ${i}`;
      if (!existing.has(candidate)) return candidate;
    }
  }

  async function handleAdd() {
    const newName = nextDefaultName();
    if (demoMode) {
      const now = new Date().toISOString();
      const newSub: SubscriptionRow = {
        id: makeId(),
        name: newName,
        recipient_type: "customer",
        recipient_value: null,
        delay_minutes: 0,
        subject: DEFAULT_NEW_SUBJECT,
        body_html: DEFAULT_NEW_BODY,
        from_local: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      setSubs((prev) => [...prev, newSub]);
      setSelectedId(newSub.id);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/tenant/funnels/${funnelSlug}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:           newName,
          recipient_type: "customer",
          delay_minutes:  0,
          subject:        DEFAULT_NEW_SUBJECT,
          body_html:      DEFAULT_NEW_BODY,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json();
      setSelectedId(created.id);
      await loadSubs();
    } catch (err) {
      alert(`Konnte E-Mail nicht anlegen: ${err instanceof Error ? err.message : "unbekannt"}`);
    } finally {
      setCreating(false);
    }
  }

  async function patchSub(id: string, body: Record<string, unknown>) {
    if (demoMode) {
      const now = new Date().toISOString();
      setSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...(body as Partial<SubscriptionRow>), updated_at: now } : s)),
      );
      return;
    }
    const res = await fetch(`/api/tenant/funnels/${funnelSlug}/emails/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `HTTP ${res.status}`);
    }
    await loadSubs();
  }

  async function deleteSub(id: string) {
    if (!confirm("E-Mail wirklich löschen? Bestehende Delivery-Logs gehen mit verloren.")) return;
    if (demoMode) {
      setSubs((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
      return;
    }
    const res = await fetch(`/api/tenant/funnels/${funnelSlug}/emails/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Löschen fehlgeschlagen: ${j.error ?? res.status}`);
      return;
    }
    if (selectedId === id) setSelectedId(null);
    await loadSubs();
  }

  // Switch-Modal: wenn dirty, zeige Bestätigungs-Modal statt direkt zu wechseln.
  // pendingSwitchTo merkt sich die Ziel-Subscription bis User entscheidet.
  const [pendingSwitchTo, setPendingSwitchTo] = useState<string | null>(null);

  function trySwitchTo(id: string) {
    if (id === selectedId) return;
    if (dirty) {
      setPendingSwitchTo(id);
      return;
    }
    setSelectedId(id);
  }

  async function confirmSwitchAfterSave() {
    await handleSave();
    if (pendingSwitchTo) {
      setSelectedId(pendingSwitchTo);
      setPendingSwitchTo(null);
    }
  }

  function confirmSwitchDiscard() {
    if (pendingSwitchTo) setSelectedId(pendingSwitchTo);
    setPendingSwitchTo(null);
    // Draft wird via useEffect (selected?.id-change) zurückgesetzt
  }

  function cancelSwitch() {
    setPendingSwitchTo(null);
  }

  // Drag-Handle für Vorschau-Breite
  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;
    function onMove(ev: MouseEvent) {
      const dx = startX - ev.clientX;
      setRightWidth(Math.max(632, Math.min(1100, startWidth + dx)));
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    }
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // 3-Pane Layout mit resizable Vorschau
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {demoMode && (
        <div className="flex items-center gap-2 border-b border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
          <span aria-hidden>🎭</span>
          <strong>Demo-Modus.</strong>
          <span>Die E-Mail-Tabellen sind noch nicht in der Datenbank — alle Änderungen werden nur lokal im Browser gehalten und beim Reload verworfen. Sobald die Migration appliziert ist, läuft das hier mit echten Daten.</span>
        </div>
      )}
      <div
        className="grid min-h-0 flex-1 bg-gray-50 dark:bg-background"
        style={{ gridTemplateColumns: `${EDITOR_LEFT_COL} minmax(0, 1fr) 6px ${rightWidth}px` }}
      >
        {/* LEFT: Liste */}
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <PanelListHeader title="E-Mails" />
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-gray-400">Lade…</div>
            ) : subs.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                Noch keine E-Mail angelegt.
              </div>
            ) : (
              <ul className="flex flex-col gap-1 p-2">
                {subs.map((sub) => {
                  const active = selectedId === sub.id;
                  return (
                    <li key={sub.id}>
                      <button
                        type="button"
                        onClick={() => trySwitchTo(sub.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                            : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sub.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                          <p className="flex-1 truncate text-xs font-medium text-gray-900 dark:text-white">{sub.name}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 pl-3.5 text-[10px] text-gray-500 dark:text-gray-400">
                          <span className={`rounded px-1.5 py-0.5 ${
                            sub.recipient_type === "customer"
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                              : sub.recipient_type === "tenant"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          }`}>
                            {sub.recipient_type === "customer"
                              ? "an Lead"
                              : sub.recipient_type === "tenant"
                                ? "an dich"
                                : `an ${sub.recipient_value ?? "—"}`}
                          </span>
                          <span>{formatDelay(sub.delay_minutes)}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-200 p-3 dark:border-gray-800">
            <EditorButton variant="primary" onClick={handleAdd} loading={creating} className="w-full">
              <Plus size={15} strokeWidth={2.5} />
              {creating ? "Anlegen…" : "E-Mail hinzufügen"}
            </EditorButton>
          </div>
        </aside>

        {/* CENTER: Editor */}
        <section className="flex min-h-0 flex-col overflow-hidden">
          {selected && draft ? (
            <SelectedEditor
              key={selected.id}
              subId={selected.id}
              draft={draft}
              onDraftChange={patchDraft}
              dirty={dirty}
              saving={saving}
              onSave={handleSave}
              onDelete={() => deleteSub(selected.id)}
              funnelSlug={funnelSlug}
              demoMode={demoMode}
              tenantNotificationEmail={state.notificationEmail}
              variables={mailVariables}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={<Mail size={22} />}
                title={subs.length === 0 ? "Noch keine E-Mail" : "E-Mail auswählen"}
                description={
                  subs.length === 0
                    ? "Lege links deine erste automatische Follow-up-Mail an."
                    : "Wähle links eine E-Mail, um sie zu bearbeiten."
                }
                action={
                  subs.length === 0 ? (
                    <EditorButton variant="primary" onClick={handleAdd} loading={creating}>
                      <Plus size={15} strokeWidth={2.5} />
                      Erste E-Mail anlegen
                    </EditorButton>
                  ) : undefined
                }
              />
            </div>
          )}
        </section>

        {/* RESIZE-HANDLE zwischen Editor und Vorschau */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleResizeStart}
          className="group relative flex cursor-col-resize items-center justify-center border-x border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 hover:bg-primary/10"
          title="Vorschau-Breite anpassen"
        >
          <GripVertical size={12} className="text-gray-400 group-hover:text-primary" />
        </div>

        {/* RIGHT: Live-Vorschau */}
        <aside className="flex min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-900">
          <PanelListHeader
            title="Vorschau"
            right={
              <select
                value={previewLeadId ?? ""}
                onChange={(e) => setPreviewLeadId(e.target.value || null)}
                className="max-w-[60%] rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] text-gray-700 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                title="Datenquelle für die Vorschau"
              >
                <option value="">Mock-Lead (Max Mustermann)</option>
                {previewLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.display_name} · {new Date(l.completed_at ?? l.created_at).toLocaleDateString("de-DE")}
                  </option>
                ))}
              </select>
            }
          />
          <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-4">
            {selected && draft ? (
              <PreviewPane
                subject={draft.subject}
                bodyHtml={draft.body_html}
                recipientType={draft.recipient_type}
                recipientValue={draft.recipient_value}
                state={state}
                funnelSlug={funnelSlug}
                previewLead={previewLead}
              />
            ) : (
              <p className="mt-8 text-center text-xs text-gray-400">Keine E-Mail ausgewählt.</p>
            )}
          </div>
        </aside>
      </div>

      {pendingSwitchTo && (
        <UnsavedChangesModal
          onCancel={cancelSwitch}
          onDiscard={confirmSwitchDiscard}
          onSave={confirmSwitchAfterSave}
        />
      )}
    </div>
  );
}

// ===========================================================================
// UnsavedChangesModal — wenn User Subscription wechselt mit ungesicherten Änderungen
// ===========================================================================

function UnsavedChangesModal({
  onCancel,
  onDiscard,
  onSave,
}: {
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
              <TriangleAlert size={18} className="text-amber-500" />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">Ungespeicherte Änderungen</h3>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Du hast Änderungen vorgenommen, die noch nicht gespeichert wurden.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Verwerfen
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// SelectedEditor — Center-Pane
// ===========================================================================

interface SelectedEditorProps {
  subId: string;
  draft: EmailDraft;
  onDraftChange: (patch: Partial<EmailDraft>) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  funnelSlug: string;
  demoMode: boolean;
  tenantNotificationEmail: string;
  variables: FunnelVariables;
}

function SelectedEditor({ subId, draft, onDraftChange, dirty, saving, onSave, onDelete, funnelSlug, demoMode, tenantNotificationEmail, variables }: SelectedEditorProps) {
  const initialDelay = minutesToDelay(draft.delay_minutes);
  // Lokale UI-State NUR für die geteilte Delay-Eingabe (amount + unit). Source of
  // truth bleibt draft.delay_minutes — beim Switch auf andere Subscription wird
  // diese lokal aus dem neuen draft.delay_minutes neu abgeleitet (key={subId}
  // remounted die Component).
  const [delayAmount, setDelayAmount] = useState<string>(String(initialDelay.amount));
  const [delayUnit,   setDelayUnit]   = useState<DelayUnit>(initialDelay.unit);
  const [logsOpen, setLogsOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function updateDelay(nextAmount: string, nextUnit: DelayUnit) {
    setDelayAmount(nextAmount);
    setDelayUnit(nextUnit);
    onDraftChange({ delay_minutes: delayToMinutes(Number(nextAmount) || 0, nextUnit) });
  }

  const isImmediate = draft.delay_minutes === 0;
  const nameWidth = Math.max(8, Math.min(40, (draft.name || "ohne Namen").length + 1));

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5">
        <div className="min-w-0 flex-1">
          {/* Inline editierbarer Titel — sieht aus wie Header, ist aber Input mit Hover-/Focus-Cue */}
          <div className="group inline-flex items-center gap-1.5">
            <input
              ref={nameInputRef}
              type="text"
              value={draft.name}
              onChange={(e) => onDraftChange({ name: e.target.value })}
              placeholder="ohne Namen"
              aria-label="Name dieser E-Mail (zum Bearbeiten klicken)"
              title="Klick zum Umbenennen"
              className="min-w-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-bold text-gray-900 dark:text-white outline-none transition-colors hover:border-gray-200 dark:hover:border-gray-700 focus:border-primary focus:bg-white dark:focus:bg-gray-950"
              style={{ width: `${nameWidth}ch` }}
            />
            <button
              type="button"
              onClick={() => nameInputRef.current?.focus()}
              title="Namen bearbeiten"
              aria-label="Namen bearbeiten"
              className="text-gray-300 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Pencil size={12} />
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
            {draft.is_active ? "aktiv" : "inaktiv"}
            <Toggle checked={draft.is_active} onChange={(v) => onDraftChange({ is_active: v })} />
          </span>
          <EditorButton variant="primary" onClick={onSave} disabled={!dirty || saving}>
            {saving ? "Speichere…" : "Speichern"}
          </EditorButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Trigger — Karten-Toggle Sofort / Verzögert */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Wann soll die Mail rausgehen?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateDelay("0", "minutes")}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                  isImmediate
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Zap size={16} className={isImmediate ? "text-primary mt-0.5" : "text-gray-400 mt-0.5"} />
                <div>
                  <p className={`text-sm font-medium ${isImmediate ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>Sofort</p>
                  <p className="text-[11px] text-gray-500">geht direkt nach Submit raus</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isImmediate) updateDelay("1", "days");
                }}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                  !isImmediate
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Clock size={16} className={!isImmediate ? "text-primary mt-0.5" : "text-gray-400 mt-0.5"} />
                <div>
                  <p className={`text-sm font-medium ${!isImmediate ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>Verzögert</p>
                  <p className="text-[11px] text-gray-500">X Stunden/Tage nach Submit</p>
                </div>
              </button>
            </div>
            {!isImmediate && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">Verzögerung:</span>
                <div className="w-20 shrink-0">
                  <TextInput
                    type="number"
                    min={1}
                    value={delayAmount}
                    onChange={(e) => updateDelay(e.target.value, delayUnit)}
                  />
                </div>
                <div className="w-32 shrink-0">
                  <Select value={delayUnit} onChange={(e) => updateDelay(delayAmount, e.target.value as DelayUnit)}>
                    <option value="minutes">Minuten</option>
                    <option value="hours">Stunden</option>
                    <option value="days">Tage</option>
                  </Select>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">nach Submit</span>
              </div>
            )}
          </div>

          {/* Empfänger — Aufgabe 53: 2 Modi (Lead | feste Adressen mit Multi + „Mein Postfach") */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Empfänger</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDraftChange({ recipient_type: "customer", recipient_value: null })}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                  draft.recipient_type === "customer"
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <User size={16} className={draft.recipient_type === "customer" ? "text-primary mt-0.5 shrink-0" : "text-gray-400 mt-0.5 shrink-0"} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${draft.recipient_type === "customer" ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>An den Lead</p>
                  <p className="text-[11px] text-gray-500 truncate">E-Mail aus dem Formular</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { if (draft.recipient_type === "customer") onDraftChange({ recipient_type: "tenant", recipient_value: null }); }}
                className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                  draft.recipient_type !== "customer"
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Inbox size={16} className={draft.recipient_type !== "customer" ? "text-primary mt-0.5 shrink-0" : "text-gray-400 mt-0.5 shrink-0"} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${draft.recipient_type !== "customer" ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>An feste Adresse(n)</p>
                  <p className="text-[11px] text-gray-500 truncate">dein Postfach, Kollegen, Vertrieb …</p>
                </div>
              </button>
            </div>
            {draft.recipient_type !== "customer" && (
              <FixedRecipients
                recipientType={draft.recipient_type}
                recipientValue={draft.recipient_value}
                tenantInbox={tenantNotificationEmail}
                onChange={(patch) => onDraftChange(patch)}
              />
            )}
          </div>

          {/* Betreff */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Betreff</label>
            <EmailEditor
              value={draft.subject}
              onChange={(v) => onDraftChange({ subject: v })}
              singleLine
              placeholder="Betreff der E-Mail"
              variables={variables}
            />
          </div>

          {/* Mail-Text */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mail-Text</label>
            <EmailEditor
              value={draft.body_html}
              onChange={(v) => onDraftChange({ body_html: v })}
              placeholder="Schreibe deine Mail. Variablen + Bausteine über die Toolbar einfügen."
              variables={variables}
            />
          </div>

          {/* Test-Mail (collapsible) */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setTestOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Test-Mail senden</span>
              {testOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            </button>
            {testOpen && <TestSection funnelSlug={funnelSlug} subId={subId} draft={draft} demoMode={demoMode} />}
          </div>

          {/* Logs (collapsible) */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setLogsOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Versand-Historie</span>
              {logsOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            </button>
            {logsOpen && <LogsSection funnelSlug={funnelSlug} subId={subId} demoMode={demoMode} />}
          </div>

          {/* Delete */}
          <div className="flex items-center justify-end border-t border-gray-200 pt-4 dark:border-gray-800">
            <EditorButton variant="danger" onClick={onDelete}>
              <Trash2 size={13} />
              Diese E-Mail löschen
            </EditorButton>
          </div>
        </div>
      </div>
    </>
  );
}

// ===========================================================================
// Preview-Pane
// ===========================================================================

function PreviewPane({
  subject: rawSubject,
  bodyHtml: rawBody,
  recipientType,
  recipientValue,
  state,
  funnelSlug,
  previewLead,
}: {
  subject: string;
  bodyHtml: string;
  recipientType: RecipientType;
  recipientValue: string | null;
  state: EditorState;
  funnelSlug: string;
  previewLead: PreviewLead | null;
}) {
  const { subject, bodyHtml, recipient } = useMemo(() => {
    const previewConfig = buildPreviewConfig(state, funnelSlug);

    let effectiveContact: Record<string, string>;
    let effectiveAnswers: Record<string, string>;
    let submittedAt: Date;
    let createdAt: string;
    let completedAt: string | null;

    if (previewLead) {
      // ECHTE Lead-Daten: contact + answers aus der Submission.
      // Aufgabe 52D: kein contactFields-Fill mehr (Submit-Page abgeschafft).
      effectiveContact = { ...previewLead.contact };
      effectiveAnswers = previewLead.answers;
      createdAt   = previewLead.created_at;
      completedAt = previewLead.completed_at;
      submittedAt = new Date(previewLead.completed_at ?? previewLead.created_at);
    } else {
      // MOCK-Daten (Aufgabe 52D: contact = MOCK_CONTACT; Lead-Felder kommen aus den Karten-Antworten)
      effectiveContact = { ...MOCK_CONTACT };
      effectiveAnswers = buildMockAnswers(previewConfig.questions);
      const now = new Date();
      createdAt   = now.toISOString();
      completedAt = now.toISOString();
      submittedAt = now;
    }

    const ctx: TemplateContext = {
      contact:      effectiveContact,
      answers:      effectiveAnswers,
      tenantConfig: previewConfig,
      submission: {
        id:           previewLead?.id ?? "00000000-0000-0000-0000-000000000000",
        session_id:   "00000000-0000-0000-0000-000000000001",
        created_at:   createdAt,
        completed_at: completedAt,
        source_url:   null,
      },
      submittedAt,
    };
    const rendered = renderEmail(rawSubject, rawBody, ctx);
    const recip =
      recipientType === "customer"
        ? (effectiveContact.email || "(Lead hat keine E-Mail)")
        : recipientType === "tenant"
          ? (previewConfig.notificationEmail || "(noch keine Adresse hinterlegt)")
          : (recipientValue?.trim() || "(noch keine Adresse hinterlegt)");
    return { subject: rendered.subject, bodyHtml: rendered.bodyHtml, recipient: recip };
  }, [rawSubject, rawBody, recipientType, recipientValue, state, funnelSlug, previewLead]);

  const primary = state.primaryColor || "#4F46E5";

  // Mail-spezifische Styles, die in der Vorschau die Resend-Render-Optik nachbilden
  // (Tailwind v4 resettet sonst margin:0 auf p/h/ul → würde Absätze enger stapeln
  // als in der echten Mail).
  const previewStyleTag = `
    .lp-email-preview { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #374151; font-size: 14px; line-height: 22px; }
    .lp-email-preview p { margin: 0 0 12px; }
    .lp-email-preview p:last-child { margin-bottom: 0; }
    .lp-email-preview h2 { font-size: 18px; font-weight: bold; margin: 16px 0 8px; color: #1f2937; }
    .lp-email-preview h3 { font-size: 15px; font-weight: bold; margin: 12px 0 6px; color: #1f2937; }
    .lp-email-preview ul, .lp-email-preview ol { margin: 0 0 12px; padding-left: 24px; }
    .lp-email-preview li { margin: 0 0 4px; }
    .lp-email-preview a { color: ${primary}; }
    .lp-email-preview hr { border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  `;

  return (
    <div className="mx-auto w-full max-w-150 space-y-3">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{previewStyleTag}</style>

      {/* Realistische Breite (= 600px wie in DynamicEmail.tsx maxWidth) + Mock-Info */}
      <p className="text-center text-[10px] uppercase tracking-wide text-gray-400">Vorschau-Breite max. 600 px (Mail-Container)</p>

      {/* Mail-Header-Meta */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
        <div><span className="text-gray-400">An:</span> <strong className="text-gray-900 dark:text-gray-100">{recipient}</strong></div>
        <div><span className="text-gray-400">Betreff:</span> <strong className="text-gray-900 dark:text-gray-100">{subject || "(leer)"}</strong></div>
      </div>

      {/* Mail-Body-Render */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white">
        <div className="px-7 py-6" style={{ backgroundColor: primary }}>
          <p className="m-0 text-base font-bold text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {state.funnelName || "Beispiel-Firma"}
          </p>
        </div>
        <div className="lp-email-preview px-8 py-6" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <div className="border-t border-gray-100 px-7 py-3 text-center text-[11px] text-gray-400">Übermittelt von leadplug.de</div>
      </div>
    </div>
  );
}

// ===========================================================================
// TestSection
// ===========================================================================

function TestSection({
  funnelSlug, subId, draft, demoMode,
}: {
  funnelSlug: string;
  subId: string;
  draft: EmailDraft;
  demoMode: boolean;
}) {
  const [sending, setSending] = useState(false);
  const [overrideRecipient, setOverrideRecipient] = useState("");
  const [result, setResult] = useState<{ ok: boolean; error: string | null } | null>(null);

  async function send() {
    if (demoMode) {
      setResult({ ok: false, error: "Demo-Modus: Test-Versand erst nach DB-Migration verfügbar." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      // Wir schicken IMMER den aktuellen Draft mit (Subject/Body/Recipient-Type).
      // Backend versendet damit den aktuellen Editor-Stand, auch wenn noch nicht
      // gespeichert wurde.
      const res = await fetch(`/api/tenant/funnels/${funnelSlug}/emails/${subId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(overrideRecipient ? { recipient: overrideRecipient } : {}),
          draft_subject:         draft.subject,
          draft_body_html:       draft.body_html,
          draft_recipient_type:  draft.recipient_type,
          draft_recipient_value: draft.recipient_value,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Test fehlgeschlagen" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-2">
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Schickt eine Mock-Mail mit Beispiel-Daten an dich.
      </p>
      <input
        type="email"
        value={overrideRecipient}
        onChange={(e) => setOverrideRecipient(e.target.value)}
        placeholder="optional: andere Test-Adresse"
        disabled={demoMode}
        className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 disabled:opacity-60"
      />
      <button
        onClick={send}
        disabled={sending || demoMode}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        title={demoMode ? "Test-Versand erst nach DB-Migration verfügbar" : undefined}
      >
        <Send size={12} />
        {sending ? "Sende…" : "Test-Mail senden"}
      </button>
      {result && (
        <div className={`rounded border px-3 py-2 text-xs ${result.ok ? "border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"}`}>
          {result.ok ? "✓ Versandt" : `✗ ${result.error ?? "unbekannt"}`}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// LogsSection
// ===========================================================================

function LogsSection({ funnelSlug, subId, demoMode }: { funnelSlug: string; subId: string; demoMode: boolean }) {
  const [logs, setLogs] = useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (demoMode) {
      setLogs([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/funnels/${funnelSlug}/emails/${subId}/logs?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [funnelSlug, subId, demoMode]);

  useEffect(() => { load(); }, [load]);

  if (demoMode) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4">
        <p className="text-center text-xs text-gray-400">Demo-Modus — Versand-Historie ist erst nach DB-Migration verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-[11px] text-gray-500">letzte 20 Versuche</p>
        <button onClick={load} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Aktualisieren">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto border-t border-gray-100 dark:border-gray-800">
        {logs.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-gray-400">{loading ? "Lade…" : "Noch keine Versuche."}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <li key={log.id} className="px-3 py-2">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpenLogId(openLogId === log.id ? null : log.id)}>
                  <StatusIcon status={log.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-900 dark:text-white truncate">
                      {log.status === "pending"
                        ? `geplant für ${new Date(log.scheduled_at).toLocaleString("de-DE")}`
                        : log.status === "success"
                          ? `versandt an ${log.recipient_address ?? "—"}`
                          : log.status === "retrying"
                            ? `retry geplant für ${log.next_retry_at ? new Date(log.next_retry_at).toLocaleString("de-DE") : "—"}`
                            : `fehlgeschlagen${log.recipient_address ? ` (${log.recipient_address})` : ""}`}
                      {log.attempt_count > 0 ? ` · Versuch ${log.attempt_count}` : ""}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{new Date(log.created_at).toLocaleString("de-DE")}</p>
                  </div>
                  {log.last_error && (openLogId === log.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
                </div>
                {openLogId === log.id && log.last_error && (
                  <div className="mt-2 ml-6">
                    <p className="text-[10px] uppercase text-gray-500">Fehler</p>
                    <pre className="rounded bg-gray-50 dark:bg-gray-950 px-2 py-1 text-[11px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">{log.last_error}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: DeliveryAttempt["status"] }) {
  if (status === "success") return <CircleCheck size={14} className="text-green-600 dark:text-green-400 shrink-0" />;
  if (status === "failed")  return <CircleAlert size={14} className="text-red-600 dark:text-red-400 shrink-0" />;
  return <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />;
}
