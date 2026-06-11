"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Trash2, Send, RefreshCw, Copy, Check, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, Clock, Pencil, Braces,
} from "lucide-react";
import type { EditorQuestion } from "@/types";
import { WebhookAddModal } from "./WebhookAddModal";
import { SectionCard, EmptyState, EDITOR_LEFT_COL, PanelListHeader } from "./ui/Panel";
import { EditorButton, TextInput, Select, Toggle } from "./ui/Controls";
import { ConfirmModal } from "./ui/ConfirmModal";
import { EditorModal } from "./ui/EditorModal";

// =============================================================================
// Aufgabe 40 — Webhooks-Tab im Funnel-Editor
// Aufgabe 50 — auf das geteilte Editor-Design-System gehoben (SectionCard/EmptyState/
//   EditorButton/TextInput/Select/Toggle). Logik (State, API, Test, Logs, Verify) 1:1.
//
// Zeigt alle Webhooks des aktuellen Funnels. Tenant kann: neuen Webhook anlegen (Modal),
// aktivieren/deaktivieren, Trigger ändern, Test schicken, Delivery-Versuche ansehen,
// Secret rotieren, Verify-Snippet anschauen, Webhook löschen.
// =============================================================================

interface Props {
  funnelSlug: string;
  questions: EditorQuestion[];
  onSubsChanged?: () => void | Promise<void>;
}

interface SubscriptionRow {
  id: string;
  name: string | null;
  url: string;
  secret: string;
  event_types: string[];
  trigger_type: "on_submit" | "after_page";
  trigger_page_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DeliveryAttempt {
  id: string;
  event_type: string | null;
  attempt_count: number;
  status: "pending" | "retrying" | "success" | "failed";
  last_error: string | null;
  response_status_code: number | null;
  response_body: string | null;
  delivered_at: string | null;
  next_retry_at: string | null;
  created_at: string;
}

export function WebhooksPanel({ funnelSlug, questions, onSubsChanged }: Props) {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<{ subId: string; secret: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/funnels/${funnelSlug}/webhooks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSubs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, [funnelSlug]);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  async function handleCreate(payload: {
    url: string;
    name?: string;
    trigger_type: "on_submit" | "after_page";
    trigger_page_id?: string | null;
    event_types: string[];
  }) {
    const res = await fetch(`/api/tenant/funnels/${funnelSlug}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `HTTP ${res.status}`);
    }
    const created = await res.json();
    setShowAdd(false);
    setRevealedSecret({ subId: created.id, secret: created.secret });
    setSelectedId(created.id);
    await loadSubs();
    await onSubsChanged?.();
  }

  async function patchSub(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/tenant/funnels/${funnelSlug}/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `HTTP ${res.status}`);
    }
    const updated = await res.json();
    if (updated.secret_revealed) {
      setRevealedSecret({ subId: updated.id, secret: updated.secret });
    }
    await loadSubs();
    await onSubsChanged?.();
  }

  async function deleteSub(id: string) {
    const res = await fetch(`/api/tenant/funnels/${funnelSlug}/webhooks/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Löschen fehlgeschlagen: ${j.error ?? res.status}`);
      return;
    }
    if (revealedSecret?.subId === id) setRevealedSecret(null);
    if (selectedId === id) setSelectedId(null);
    await loadSubs();
    await onSubsChanged?.();
  }

  const selectedSub = subs.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="grid min-h-0 flex-1 bg-gray-100 dark:bg-background"
        style={{ gridTemplateColumns: `${EDITOR_LEFT_COL} minmax(0, 1fr)` }}
      >
        {/* LEFT: Liste */}
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <PanelListHeader title="Webhooks" />
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-gray-400">Lade…</div>
            ) : error ? (
              <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            ) : subs.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
                Noch kein Webhook angelegt.
              </div>
            ) : (
              <ul className="flex flex-col gap-1 p-2">
                {subs.map((sub) => {
                  const triggerPage = sub.trigger_page_id
                    ? questions.find((q) => q.dbId === sub.trigger_page_id)
                    : null;
                  const active = selectedId === sub.id;
                  return (
                    <li key={sub.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(sub.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                            : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sub.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                          <p className="flex-1 truncate text-xs font-semibold text-gray-900 dark:text-white" title={sub.name ?? sub.url}>
                            {sub.name || sub.url}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate pl-3.5 text-[11px] text-gray-400 dark:text-gray-500" title={sub.url}>
                          {sub.url}
                        </p>
                        <p className="mt-0.5 truncate pl-3.5 text-[11px] text-gray-500 dark:text-gray-400">
                          {sub.trigger_type === "on_submit"
                            ? "Am Funnel-Ende"
                            : triggerPage
                              ? `Nach „${triggerPage.title || "Schritt"}"`
                              : "Trigger entfernt"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-200 p-3 dark:border-gray-800">
            <EditorButton variant="primary" onClick={() => setShowAdd(true)} className="w-full">
              <Plus size={15} strokeWidth={2.5} />
              Webhook hinzufügen
            </EditorButton>
          </div>
        </aside>

        {/* RIGHT: Detail */}
        <section className="flex min-h-0 flex-col overflow-y-auto">
          {selectedSub ? (
            <WebhookDetail
              key={selectedSub.id}
              sub={selectedSub}
              questions={questions}
              funnelSlug={funnelSlug}
              revealedSecret={revealedSecret?.subId === selectedSub.id ? revealedSecret.secret : null}
              onDismissSecret={() => setRevealedSecret(null)}
              onPatch={(body) => patchSub(selectedSub.id, body)}
              onDelete={() => deleteSub(selectedSub.id)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={<Send size={22} />}
                title={subs.length === 0 ? "Noch kein Webhook" : "Webhook auswählen"}
                description={
                  subs.length === 0
                    ? "Ersten Webhook anlegen, um Leads automatisch ans CRM zu schicken."
                    : "Wähle links einen Webhook, um ihn zu bearbeiten."
                }
                action={
                  subs.length === 0 ? (
                    <EditorButton variant="primary" onClick={() => setShowAdd(true)}>
                      <Plus size={15} strokeWidth={2.5} />
                      Ersten Webhook anlegen
                    </EditorButton>
                  ) : undefined
                }
              />
            </div>
          )}
        </section>
      </div>

      <WebhookAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        questions={questions}
        onCreate={handleCreate}
      />
    </div>
  );
}

// ===========================================================================
// SecretRevealBanner
// ===========================================================================

function SecretRevealBanner({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(secret).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 text-amber-600 dark:text-amber-400" size={18} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Webhook-Secret — jetzt kopieren!
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
            Aus Sicherheitsgründen zeigen wir es nur dieses eine Mal. Verloren? Es lässt sich jederzeit
            neu erzeugen — alte Webhooks brauchen dann das neue Secret.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded border border-amber-200 bg-white px-2 py-1.5 font-mono text-xs text-gray-900 dark:border-amber-700/50 dark:bg-gray-900 dark:text-gray-100">
              {secret}
            </code>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Kopiert!" : "Kopieren"}
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400">
          schließen
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// WebhookDetail
// ===========================================================================

interface WebhookDetailProps {
  sub: SubscriptionRow;
  questions: EditorQuestion[];
  funnelSlug: string;
  revealedSecret: string | null;
  onDismissSecret: () => void;
  onPatch: (body: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
}

function WebhookDetail({
  sub,
  questions,
  funnelSlug,
  revealedSecret,
  onDismissSecret,
  onPatch,
  onDelete,
}: WebhookDetailProps) {
  // Aufgabe 50: Name inline im Header editierbar (wie bei E-Mails) → keine Dopplung im Config-Feld.
  // On-Blur-Save via onPatch. Lokaler Draft, resettet pro Auswahl (WebhookDetail hat key={sub.id}).
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState(sub.name ?? "");
  const nameWidth = Math.max(8, Math.min(40, (nameDraft || "Webhook").length + 1));
  const [confirmAction, setConfirmAction] = useState<null | "delete" | "rotate">(null);

  function commitName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(sub.name ?? "");
      return;
    }
    if (trimmed !== (sub.name ?? "")) onPatch({ name: trimmed });
  }

  return (
    <div className="flex flex-col">
      {/* Header: Bar full-bleed, Inhalt auf Content-Breite zentriert (Name links, Aktiv rechts) */}
      <div className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="group inline-flex min-w-0 items-center gap-1.5">
            <input
              ref={nameInputRef}
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setNameDraft(sub.name ?? ""); e.currentTarget.blur(); }
              }}
              placeholder="Webhook benennen"
              aria-label="Name dieses Webhooks (zum Bearbeiten klicken)"
              title="Klick zum Umbenennen"
              className="min-w-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-bold text-gray-900 dark:text-white outline-none transition-colors hover:border-gray-200 dark:hover:border-gray-700 focus:border-primary focus:bg-white dark:focus:bg-gray-800"
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
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
            Aktiv
            <Toggle checked={sub.is_active} onChange={(v) => onPatch({ is_active: v })} />
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="mx-auto max-w-3xl space-y-4">
        {revealedSecret && <SecretRevealBanner secret={revealedSecret} onDismiss={onDismissSecret} />}
        <ConfigSection sub={sub} questions={questions} onPatch={onPatch} />
        <ExamplePayloadSection questions={questions} />
        <TestSection funnelSlug={funnelSlug} subId={sub.id} />
        <LogsSection funnelSlug={funnelSlug} subId={sub.id} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <EditorButton variant="secondary" onClick={() => setConfirmAction("rotate")}>
            <RefreshCw size={13} />
            Secret neu generieren
          </EditorButton>
          <EditorButton variant="danger" onClick={() => setConfirmAction("delete")}>
            <Trash2 size={13} />
            Webhook löschen
          </EditorButton>
        </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction === "delete") onDelete();
          else if (confirmAction === "rotate") onPatch({ rotate_secret: true });
        }}
        title={confirmAction === "delete" ? "Webhook löschen?" : "Secret neu generieren?"}
        message={
          confirmAction === "delete"
            ? "Der Webhook und seine Zustell-Logs werden dauerhaft entfernt. Das lässt sich nicht rückgängig machen."
            : "Das alte Secret wird sofort ungültig — bestehende CRM-Integrationen müssen den neuen Wert bekommen."
        }
        confirmLabel={confirmAction === "delete" ? "Löschen" : "Neu generieren"}
        danger={confirmAction === "delete"}
      />
    </div>
  );
}

// ===========================================================================
// ConfigSection
// ===========================================================================

function ConfigSection({
  sub,
  questions,
  onPatch,
}: {
  sub: SubscriptionRow;
  questions: EditorQuestion[];
  onPatch: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [url, setUrl] = useState(sub.url);
  const [triggerType, setTriggerType] = useState(sub.trigger_type);
  const [triggerPageId, setTriggerPageId] = useState(sub.trigger_page_id ?? "");
  const [includeCompleted, setIncludeCompleted] = useState(sub.event_types.includes("submission.completed"));
  const [includeAbandoned, setIncludeAbandoned] = useState(sub.event_types.includes("submission.abandoned"));
  const [saving, setSaving] = useState(false);

  const dirty =
    url !== sub.url ||
    triggerType !== sub.trigger_type ||
    (triggerType === "after_page" && triggerPageId !== (sub.trigger_page_id ?? "")) ||
    (triggerType === "on_submit" && (
      includeCompleted !== sub.event_types.includes("submission.completed") ||
      includeAbandoned !== sub.event_types.includes("submission.abandoned")
    ));

  const savedPages = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => Boolean(q.dbId) && q.kind !== "welcome");

  async function save() {
    setSaving(true);
    try {
      const events =
        triggerType === "on_submit"
          ? [
              ...(includeCompleted ? ["submission.completed"] : []),
              ...(includeAbandoned ? ["submission.abandoned"] : []),
            ]
          : ["step.advanced"];
      const body: Record<string, unknown> = {
        url,
        trigger_type: triggerType,
        trigger_page_id: triggerType === "after_page" ? triggerPageId : null,
        event_types: events,
      };
      await onPatch(body);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Konfiguration">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Endpoint-URL</span>
          <TextInput type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Trigger</span>
          <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value as "on_submit" | "after_page")}>
            <option value="on_submit">Am Ende des Funnels</option>
            <option value="after_page" disabled={savedPages.length === 0}>Nach einer bestimmten Frage</option>
          </Select>
        </label>

        {triggerType === "after_page" && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Nach welchem Schritt?</span>
            <Select value={triggerPageId} onChange={(e) => setTriggerPageId(e.target.value)}>
              <option value="">Schritt auswählen…</option>
              {savedPages.map(({ q, idx }) => (
                <option key={q.dbId} value={q.dbId}>
                  {idx + 1}. {q.title || "Unbenannte Frage"}
                </option>
              ))}
            </Select>
          </label>
        )}

        {triggerType === "on_submit" && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Events</span>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={includeCompleted} onChange={(e) => setIncludeCompleted(e.target.checked)} className="accent-primary" />
              Lead vollständig abgesendet
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={includeAbandoned} onChange={(e) => setIncludeAbandoned(e.target.checked)} className="accent-primary" />
              Lead abgebrochen, Email/Tel. vorhanden
            </label>
          </div>
        )}

        {dirty && (
          <div className="flex justify-end">
            <EditorButton variant="primary" onClick={save} loading={saving}>
              {saving ? "Speichern…" : "Änderungen speichern"}
            </EditorButton>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ===========================================================================
// ExamplePayloadSection — zeigt die exakte JSON-Struktur, funnel-spezifisch
// ===========================================================================

const EXAMPLE_BY_TYPE: Record<string, string> = {
  short_text: "Beispieltext",
  long_text: "Eine längere Beispielantwort …",
  number: "42",
  date: "2026-06-15",
  slider: "5",
  rating: "4",
  scale: "7",
  email: "max@beispiel.de",
  tel: "+49 151 23456789",
  plz: "10115",
  first_name: "Max",
  last_name: "Mustermann",
  full_name: "Max Mustermann",
  text: "Beispieltext",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "wert";
}

// Spiegelt die Server-Logik aus lib/webhooks.ts (resolveAnswerEntries) als Beispiel —
// echte Feld-Keys/Labels dieses Funnels, damit der Kunde direkt mappen kann.
function buildExamplePayload(questions: EditorQuestion[]): Record<string, unknown> {
  const answers: Array<Record<string, unknown>> = [];
  const answersFlat: Record<string, string> = {};

  function add(key: string, label: string, type: string, optLabels: string[], optValues: string[]) {
    if (type === "single_choice" || type === "dropdown" || type === "radio") {
      const l = optLabels[0] ?? "Option A";
      const v = optValues[0] ?? slugify(l);
      answers.push({ key, label, type, value: v, value_label: l });
      answersFlat[key] = l;
    } else if (type === "multi_choice") {
      const ls = optLabels.length ? optLabels.slice(0, 2) : ["Option A", "Option B"];
      const vs = optValues.length ? optValues.slice(0, 2) : ls.map(slugify);
      answers.push({ key, label, type, value: vs, value_label: ls });
      answersFlat[key] = ls.join(", ");
    } else if (type === "checkbox") {
      answers.push({ key, label, type, value: "true", value_label: "Ja" });
      answersFlat[key] = "Ja";
    } else {
      const v = EXAMPLE_BY_TYPE[type] ?? "Beispieltext";
      answers.push({ key, label, type, value: v });
      answersFlat[key] = v;
    }
  }

  for (const q of questions) {
    if (q.kind === "welcome" || q.questionType === "statement") continue;
    if (q.kind === "custom" && q.customFields) {
      for (const f of q.customFields) {
        const opts = Array.isArray(f.options) ? f.options : [];
        add(f.key, f.label, f.type, opts, opts);
      }
      continue;
    }
    const optLabels = (q.options ?? []).map((o) => o.label);
    const optValues = (q.options ?? []).map((o) => o.value);
    add(q.questionKey, q.title || "Frage", q.questionType, optLabels, optValues);
  }

  if (answers.length === 0) {
    add("beispiel_frage", "Beispiel-Frage", "single_choice", ["Option A", "Option B"], ["option_a", "option_b"]);
  }

  return {
    event: "submission.completed",
    delivery_id: "8f1c2d3e-…-uuid",
    delivered_at: "2026-06-08T10:15:30.000Z",
    tenant_id: "a3f29b10-…-uuid",
    funnel: { id: "c91b77a4-…-uuid", slug: "mein-funnel", name: "Müller Marketing" },
    submission: {
      id: "d72e5f81-…-uuid",
      session_id: "11ab33cd-…-uuid",
      created_at: "2026-06-08T10:14:55.000Z",
      completed_at: "2026-06-08T10:15:29.000Z",
      source_url: "https://kunde.de/angebot",
    },
    available_channels: { email: true, telefon: true, name: true },
    contact: { name: "Max Mustermann", email: "max@beispiel.de", telefon: "+49 151 23456789" },
    answers,
    answers_flat: answersFlat,
  };
}

// JSON-Syntax-Farben (auf bg-code-surface, analog zu components/dashboard/CodeSnippet.tsx).
const JSON_COLOR = {
  key: "#818cf8",
  string: "#fb923c",
  number: "#fbbf24",
  literal: "#f472b6",
  punct: "#94a3b8",
} as const;

function tokenizeJson(src: string): Array<{ t: keyof typeof JSON_COLOR; v: string }> {
  const out: Array<{ t: keyof typeof JSON_COLOR; v: string }> = [];
  const re = /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push({ t: "punct", v: src.slice(last, m.index) });
    const tok = m[0];
    let type: keyof typeof JSON_COLOR = "number";
    if (tok[0] === '"') {
      // Key vs. String: ist das nächste Nicht-Whitespace-Zeichen ein ":" → Key.
      let j = re.lastIndex;
      while (j < src.length && /\s/.test(src[j])) j++;
      type = src[j] === ":" ? "key" : "string";
    } else if (tok === "true" || tok === "false" || tok === "null") {
      type = "literal";
    }
    out.push({ t: type, v: tok });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: "punct", v: src.slice(last) });
  return out;
}

function JsonCodeBlock({ json }: { json: string }) {
  const tokens = useMemo(() => tokenizeJson(json), [json]);
  return (
    <pre
      className="overflow-auto rounded-xl bg-code-surface px-4 py-3 font-mono text-[13px] leading-6 ring-1 ring-white/10"
      style={{ maxHeight: "58vh" }}
    >
      {tokens.map((t, i) => (
        <span key={i} style={{ color: JSON_COLOR[t.t] }}>{t.v}</span>
      ))}
    </pre>
  );
}

function JsonCopyButton({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(json).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        })
      }
      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Kopiert!" : "Kopieren"}
    </button>
  );
}

function ExamplePayloadSection({ questions }: { questions: EditorQuestion[] }) {
  const [open, setOpen] = useState(false);
  const json = useMemo(() => JSON.stringify(buildExamplePayload(questions), null, 2), [questions]);

  return (
    <>
      <SectionCard title="Beispiel-Daten">
        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          So sehen die Daten aus, die bei jedem Lead an die URL gesendet werden — mit den Feldern
          dieses Funnels. Ideal zum Zuordnen in Make, Zapier, n8n oder im CRM.
        </p>
        <div className="mt-3">
          <EditorButton variant="secondary" onClick={() => setOpen(true)}>
            <Braces size={13} />
            Beispiel-Daten ansehen
          </EditorButton>
        </div>
      </SectionCard>

      <EditorModal
        open={open}
        onClose={() => setOpen(false)}
        scope="Webhook"
        title="Beispiel-Daten (JSON)"
        maxWidth="max-w-2xl"
        footer={
          <>
            <JsonCopyButton json={json} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Schließen
            </button>
          </>
        }
      >
        <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Genau dieses Format senden wir bei jedem Lead. Die Schlüssel unter{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">answers_flat</code>{" "}
          sind die Felder dieses Funnels — perfekt zum direkten Zuordnen.
        </p>
        <JsonCodeBlock json={json} />
      </EditorModal>
    </>
  );
}

// ===========================================================================
// TestSection
// ===========================================================================

function TestSection({ funnelSlug, subId }: { funnelSlug: string; subId: string }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; statusCode: number | null; error: string | null } | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/tenant/funnels/${funnelSlug}/webhooks/${subId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ ok: false, statusCode: null, error: err instanceof Error ? err.message : "Test fehlgeschlagen" });
    } finally {
      setSending(false);
    }
  }

  return (
    <SectionCard title="Test senden">
      <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        Schickt eine Test-Nachricht mit Beispiel-Daten an die URL — so zeigt sich direkt, ob der
        Endpoint korrekt verdrahtet ist.
      </p>
      <div className="mt-3">
        <EditorButton variant="secondary" onClick={send} loading={sending}>
          <Send size={13} />
          {sending ? "Sende…" : "Test-Webhook senden"}
        </EditorButton>
      </div>
      {result && (
        <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${result.ok ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"}`}>
          {result.ok
            ? `✓ Erfolgreich (HTTP ${result.statusCode})`
            : `✗ Fehlgeschlagen: ${result.error ?? "unbekannt"}${result.statusCode ? ` (HTTP ${result.statusCode})` : ""}`}
        </div>
      )}
    </SectionCard>
  );
}

// ===========================================================================
// LogsSection
// ===========================================================================

function LogsSection({ funnelSlug, subId }: { funnelSlug: string; subId: string }) {
  const [logs, setLogs] = useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/funnels/${funnelSlug}/webhooks/${subId}/logs?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [funnelSlug, subId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SectionCard
      title="Letzte Versuche"
      right={
        <button onClick={load} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Aktualisieren">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      }
    >
      <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
        {logs.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-gray-400">{loading ? "Lade…" : "Noch keine Versuche."}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <li key={log.id} className="px-3 py-2">
                <div className="flex cursor-pointer items-center gap-2" onClick={() => setOpenLogId(openLogId === log.id ? null : log.id)}>
                  <StatusIcon status={log.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-gray-900 dark:text-white">
                      {log.event_type ?? "unknown"}
                      {log.response_status_code ? ` · HTTP ${log.response_status_code}` : ""}
                      {log.attempt_count > 1 ? ` · Versuch ${log.attempt_count}` : ""}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString("de-DE")}
                    </p>
                  </div>
                  {(log.last_error || log.response_body) && (
                    openLogId === log.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                  )}
                </div>
                {openLogId === log.id && (log.last_error || log.response_body) && (
                  <div className="ml-6 mt-2 space-y-2">
                    {log.last_error && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Error</p>
                        <pre
                          className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-code-surface px-3 py-2 font-mono text-[12px] leading-5 text-slate-200 ring-1 ring-white/10"
                        >{log.last_error}</pre>
                      </div>
                    )}
                    {log.response_body && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Response-Body</p>
                        <pre
                          className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-code-surface px-3 py-2 font-mono text-[12px] leading-5 text-slate-200 ring-1 ring-white/10"
                        >{log.response_body}</pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}

function StatusIcon({ status }: { status: DeliveryAttempt["status"] }) {
  if (status === "success") return <CircleCheck size={14} className="shrink-0 text-green-600 dark:text-green-400" />;
  if (status === "failed")  return <CircleAlert size={14} className="shrink-0 text-red-600 dark:text-red-400" />;
  return <Clock size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />;
}

// (Entfernt in Aufgabe 50: „Signatur verifizieren"-Code-Snippet-Sektion — für
//  Nutzer ohne Mehrwert; Signatur-Header bleibt, nur die UI-Erklärung ist raus.)
