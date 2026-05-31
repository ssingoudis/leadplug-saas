"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, Send, RefreshCw, Copy, Check, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, Clock,
} from "lucide-react";
import type { EditorQuestion } from "@/types";
import { WebhookAddModal } from "./WebhookAddModal";

// =============================================================================
// Aufgabe 40 — Webhooks-Tab im Funnel-Editor
//
// Zeigt alle Webhooks des aktuellen Funnels. Tenant kann:
//   • neuen Webhook anlegen (Modal)
//   • Webhook aktivieren/deaktivieren
//   • Trigger ändern (on_submit / after_page)
//   • Test-Payload schicken
//   • Letzte Delivery-Versuche ansehen (Inspector)
//   • Secret rotieren (zeigt 1× neues Secret)
//   • Verify-Code-Snippet (Node/Python/PHP) anschauen
//   • Webhook löschen
//
// State liegt komplett im Panel — kein EditorState-Touch. Alle Schreiboperationen
// gehen direkt gegen die /api/tenant/funnels/[slug]/webhooks/... Routes.
// =============================================================================

interface Props {
  funnelSlug: string;
  questions: EditorQuestion[];
  /** Aufgabe 40: EditorShellV2 lädt webhook_counts neu — z.B. nach Create/Patch/Delete —
      damit Step-Pill-Badges in der Sidebar aktuell bleiben. */
  onSubsChanged?: () => void | Promise<void>;
}

interface SubscriptionRow {
  id: string;
  url: string;
  secret: string;  // maskiert, außer direkt nach Create/Rotate
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
  // Aufgabe 45: Master-Detail (Liste · Detail) wie EmailsPanel — selectedId statt expand.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- Load ---
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

  // --- Create ---
  async function handleCreate(payload: {
    url: string;
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

  // --- Patch (toggle active, change trigger, etc.) ---
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

  // --- Delete ---
  async function deleteSub(id: string) {
    if (!confirm("Webhook wirklich löschen? Bestehende Delivery-Logs gehen mit verloren.")) return;
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

  // ----------------------------------------------------------------------
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="grid min-h-0 flex-1 bg-gray-50 dark:bg-background"
        style={{ gridTemplateColumns: "280px minmax(0, 1fr)" }}
      >
        {/* LEFT: Liste */}
        <aside className="flex min-h-0 flex-col overflow-hidden border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Webhooks</h2>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              Leads automatisch an dein CRM (Zapier, Make, n8n, eigener Endpoint).
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-gray-400">Lade…</div>
            ) : error ? (
              <div className="m-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            ) : subs.length === 0 ? (
              <div className="p-6 text-center">
                <Send size={20} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Noch kein Webhook angelegt.</p>
              </div>
            ) : (
              <ul className="py-1">
                {subs.map((sub) => {
                  const triggerPage = sub.trigger_page_id
                    ? questions.find((q) => q.dbId === sub.trigger_page_id)
                    : null;
                  return (
                    <li key={sub.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(sub.id)}
                        className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                          selectedId === sub.id
                            ? "bg-primary/10 dark:bg-primary/20 border-l-2 border-primary"
                            : "border-l-2 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-medium text-gray-900 dark:text-white flex-1" title={sub.url}>
                            {sub.url}
                          </p>
                          {!sub.is_active && (
                            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-500 dark:text-gray-400">
                              pause
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[10px] text-gray-500 dark:text-gray-400">
                          {sub.trigger_type === "on_submit"
                            ? "feuert am Funnel-Ende"
                            : triggerPage
                              ? `nach „${triggerPage.title || "Frage"}"`
                              : "Trigger entfernt"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 p-3">
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Plus size={14} strokeWidth={2.5} />
              Webhook hinzufügen
            </button>
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
              <div className="text-center">
                <Send size={22} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {subs.length === 0 ? "Noch kein Webhook" : "Webhook auswählen"}
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
                  {subs.length === 0
                    ? "Leg deinen ersten Webhook an, um Leads automatisch an dein CRM zu schicken."
                    : "Wähle links einen Webhook, um ihn zu bearbeiten."}
                </p>
                {subs.length === 0 && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    Ersten Webhook anlegen
                  </button>
                )}
              </div>
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
    <div className="mb-4 rounded-xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 text-amber-600 dark:text-amber-400" size={18} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Dein Webhook-Secret — kopiere es jetzt!
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
            Aus Sicherheitsgründen zeigen wir es nur dieses eine Mal. Verloren? Du kannst es jederzeit
            neu generieren — alte Endpoints müssen dann das neue Secret bekommen.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-700/50 px-2 py-1.5 text-xs font-mono text-gray-900 dark:text-gray-100">
              {secret}
            </code>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 dark:bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 dark:hover:bg-amber-600"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Kopiert!" : "Kopieren"}
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-amber-700 dark:text-amber-400 hover:text-amber-900 text-xs">
          schließen
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// WebhookDetail — Detail-Pane für den ausgewählten Webhook (Aufgabe 45 Master-Detail)
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
  return (
    <div className="flex flex-col">
      {/* Header: URL + aktiv-Toggle */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white" title={sub.url}>
            {sub.url}
          </p>
          {!sub.is_active && (
            <span className="mt-0.5 inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">
              pausiert
            </span>
          )}
        </div>
        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={sub.is_active}
            onChange={(e) => onPatch({ is_active: e.target.checked })}
            className="accent-primary"
          />
          aktiv
        </label>
      </div>

      <div className="space-y-4 p-5">
        {revealedSecret && <SecretRevealBanner secret={revealedSecret} onDismiss={onDismissSecret} />}
        <ConfigSection sub={sub} questions={questions} onPatch={onPatch} />
        <TestSection funnelSlug={funnelSlug} subId={sub.id} />
        <LogsSection funnelSlug={funnelSlug} subId={sub.id} />
        <VerifySnippetSection />
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-3">
          <button
            onClick={() => {
              if (!confirm("Neues Secret generieren? Der alte Secret wird sofort ungültig — bestehende CRM-Integrationen müssen den neuen Wert bekommen.")) return;
              onPatch({ rotate_secret: true });
            }}
            className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900"
          >
            Secret rotieren
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
          >
            <Trash2 size={12} />
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// ConfigSection — URL + Trigger ändern
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

  // Dirty-Check
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
      await onPatch({
        url,
        trigger_type: triggerType,
        trigger_page_id: triggerType === "after_page" ? triggerPageId : null,
        event_types: events,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Konfiguration</p>

      <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Endpoint-URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Trigger</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as "on_submit" | "after_page")}
            className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="on_submit">Am Ende des Funnels</option>
            <option value="after_page" disabled={savedPages.length === 0}>Nach einer bestimmten Frage</option>
          </select>
        </div>

        {triggerType === "after_page" && (
          <div>
            <label className="mb-1 block text-xs text-gray-500">Nach welchem Schritt?</label>
            <select
              value={triggerPageId}
              onChange={(e) => setTriggerPageId(e.target.value)}
              className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">Schritt auswählen…</option>
              {savedPages.map(({ q, idx }) => (
                <option key={q.dbId} value={q.dbId}>
                  {idx + 1}. {q.title || "Unbenannte Frage"}
                </option>
              ))}
            </select>
          </div>
        )}

        {triggerType === "on_submit" && (
          <div>
            <label className="mb-1 block text-xs text-gray-500">Events</label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
                <input type="checkbox" checked={includeCompleted} onChange={(e) => setIncludeCompleted(e.target.checked)} className="accent-primary" />
                Lead vollständig abgesendet
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
                <input type="checkbox" checked={includeAbandoned} onChange={(e) => setIncludeAbandoned(e.target.checked)} className="accent-primary" />
                Lead abgebrochen, Email/Tel. vorhanden
              </label>
            </div>
          </div>
        )}

        {dirty && (
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "Speichern…" : "Änderungen speichern"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// TestSection — Test-Senden + Result
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
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Test senden</p>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Schickt eine Mock-Nachricht mit Beispiel-Daten an deine URL — du siehst direkt, ob dein
          Endpoint korrekt verdrahtet ist.
        </p>
        <button
          onClick={send}
          disabled={sending}
          className="mt-2 inline-flex items-center gap-1.5 rounded bg-gray-900 dark:bg-gray-100 px-3 py-1.5 text-xs font-medium text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white disabled:opacity-60"
        >
          <Send size={12} />
          {sending ? "Sende…" : "Test-Webhook senden"}
        </button>
        {result && (
          <div className={`mt-2 rounded border px-3 py-2 text-xs ${result.ok ? "border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"}`}>
            {result.ok
              ? `✓ Erfolgreich (HTTP ${result.statusCode})`
              : `✗ Fehlgeschlagen: ${result.error ?? "unbekannt"}${result.statusCode ? ` (HTTP ${result.statusCode})` : ""}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// LogsSection — letzte Versuche
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
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Letzte Versuche</p>
        <button onClick={load} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="Aktualisieren">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 max-h-64 overflow-y-auto">
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
                  <div className="mt-2 ml-6 space-y-1">
                    {log.last_error && (
                      <div>
                        <p className="text-[10px] uppercase text-gray-500">Error</p>
                        <pre className="rounded bg-gray-50 dark:bg-gray-950 px-2 py-1 text-[11px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">{log.last_error}</pre>
                      </div>
                    )}
                    {log.response_body && (
                      <div>
                        <p className="text-[10px] uppercase text-gray-500">Response-Body</p>
                        <pre className="rounded bg-gray-50 dark:bg-gray-950 px-2 py-1 text-[11px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{log.response_body}</pre>
                      </div>
                    )}
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

// ===========================================================================
// VerifySnippetSection — Code-Beispiele für HMAC-Verify
// ===========================================================================

const SNIPPET_NODE = `// Node.js (Express)
import crypto from "node:crypto";

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["x-leadplug-signature"];
  const [tPart, v1Part] = sig.split(",");
  const t = tPart.split("=")[1];
  const v1 = v1Part.split("=")[1];

  const expected = crypto
    .createHmac("sha256", process.env.LEADPLUG_WEBHOOK_SECRET)
    .update(\`\${t}.\${req.body}\`)
    .digest("hex");

  if (expected !== v1) return res.status(401).send("invalid signature");

  const payload = JSON.parse(req.body.toString());
  // … payload verarbeiten
  res.json({ ok: true });
});`;

const SNIPPET_PYTHON = `# Python (Flask)
import hmac, hashlib, os
from flask import Flask, request, abort

app = Flask(__name__)

@app.post("/webhook")
def webhook():
    sig = request.headers.get("X-LeadPlug-Signature", "")
    parts = dict(p.split("=", 1) for p in sig.split(","))
    t, v1 = parts.get("t", ""), parts.get("v1", "")

    secret = os.environ["LEADPLUG_WEBHOOK_SECRET"].encode()
    body = request.get_data()
    expected = hmac.new(secret, f"{t}.{body.decode()}".encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, v1):
        abort(401)

    payload = request.json
    # … payload verarbeiten
    return {"ok": True}`;

const SNIPPET_PHP = `<?php
// PHP
$sig = $_SERVER['HTTP_X_LEADPLUG_SIGNATURE'] ?? '';
$parts = [];
foreach (explode(',', $sig) as $p) { [$k, $v] = explode('=', $p, 2); $parts[$k] = $v; }
$t = $parts['t'] ?? '';
$v1 = $parts['v1'] ?? '';

$body = file_get_contents('php://input');
$expected = hash_hmac('sha256', "$t.$body", getenv('LEADPLUG_WEBHOOK_SECRET'));

if (!hash_equals($expected, $v1)) {
    http_response_code(401);
    exit('invalid signature');
}

$payload = json_decode($body, true);
// … payload verarbeiten
echo json_encode(['ok' => true]);`;

function VerifySnippetSection() {
  const [lang, setLang] = useState<"node" | "python" | "php">("node");
  const [copied, setCopied] = useState(false);
  const snippet = lang === "node" ? SNIPPET_NODE : lang === "python" ? SNIPPET_PYTHON : SNIPPET_PHP;

  function copy() {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Signatur verifizieren (optional, empfohlen)
      </p>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Jede Nachricht hat einen <code className="text-[11px]">X-LeadPlug-Signature</code>-Header.
          Auf deiner Seite kannst du mit deinem Secret prüfen, dass die Nachricht echt von uns kommt
          (verhindert Fake-Leads). In Zapier/Make ist das normalerweise nicht nötig — die URL
          ist nur dir bekannt.
        </p>
        <div className="flex items-center gap-1 mb-2">
          {(["node", "python", "php"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded px-2 py-1 text-xs font-medium ${l === lang ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            >
              {l === "node" ? "Node.js" : l === "python" ? "Python" : "PHP"}
            </button>
          ))}
          <button onClick={copy} className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Kopiert!" : "Kopieren"}
          </button>
        </div>
        <pre className="rounded bg-gray-950 px-3 py-2 text-[11px] text-gray-200 font-mono overflow-x-auto">
          {snippet}
        </pre>
      </div>
    </div>
  );
}
