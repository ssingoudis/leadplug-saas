"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, Pencil, Redo2, Save, TriangleAlert, Undo2 } from "lucide-react";
import type { EditorState, EditorQuestion, ContactFieldConfig, QuestionType, LogicRule } from "@/types";
import { TopTabs, type TopTabKey } from "./TopTabs";
import { StepList } from "./StepList";
import { CenterCanvas } from "./CenterCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { ThemePanel } from "./ThemePanel";
import { WebhooksPanel } from "./WebhooksPanel";
import { EmailsPanel } from "./EmailsPanel";
import { SharePanel } from "./SharePanel";
import { LogicRuleModal } from "./LogicRuleModal";
import { LogicMapPanel } from "./LogicMapPanel";
import { AddContactFieldPicker } from "./properties/AddContactFieldPicker";
import { EditorModal } from "./ui/EditorModal";
import { EDITOR_LEFT_COL } from "./ui/Panel";
import type { SelectedStep } from "./types";
import {
  makeDefaultCustomPage,
  makeAddressCustomPage,
  makeContactCard,
  makeDefaultWelcomePage,
} from "@/components/tenant-editor/defaults";
import { generateFieldKey, toKey } from "@/lib/editorUtils";
import { useHistoryState } from "@/lib/useHistoryState";
import { useSaveStatus } from "@/lib/useSaveStatus";
import { SaveStatus } from "@/components/ui/SaveStatus";

interface Props {
  initialState: EditorState;
  mode: "create" | "edit";
  originalSlug?: string;
  companyName: string;
  // Aufgabe 57D: Kontaktierbarkeits-Warnung wurde für diesen Funnel quittiert
  // (funnels.hide_contact_warning — bewusst NICHT im EditorState/Undo-Modell).
  initialHideContactWarning?: boolean;
}

function makeId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Aufgabe 40 Polish: Semantic Types haben einen kanonischen Default-Key (email→"email"),
 *  der unabhängig vom Label perfekt für CRM-Mapping ist. Bei diesen Types soll der Key
 *  nicht beim Label-Edit mitgezogen werden → _keyTouched=true von Anfang an.
 *
 *  Generic Types haben keinen kanonischen Key — der wird aus dem Label abgeleitet.
 *  Bei diesen soll der Key beim Label-Edit mit-syncen → _keyTouched=false. */
const SEMANTIC_CONTACT_TYPES: ReadonlySet<ContactFieldConfig["type"]> = new Set([
  "email",
  "tel",
  "plz",
  "first_name",
  "last_name",
  "full_name",
]);

function defaultContactField(
  type: ContactFieldConfig["type"],
  existing: ContactFieldConfig[],
): ContactFieldConfig {
  const labelByType: Record<ContactFieldConfig["type"], string> = {
    text: "Text",
    email: "E-Mail",
    tel: "Telefon",
    plz: "Postleitzahl",
    radio: "Auswahl",
    long_text: "Lang-Text",
    number: "Zahl",
    date: "Datum",
    checkbox: "Checkbox",
    dropdown: "Dropdown",
    slider: "Slider",
    multi_choice: "Mehrfachauswahl",
    rating: "Sterne-Rating",
    scale: "Skala",
    // Aufgabe 40 Polish
    first_name: "Vorname",
    last_name: "Nachname",
    full_name: "Name",
  };
  const label = labelByType[type];
  const existingKeys = new Set(existing.map((f) => f.key));
  const key = generateFieldKey(type, label, existingKeys);

  const maxOrder = existing.reduce((m, f) => Math.max(m, f.sort_order), -1);

  return {
    // Aufgabe 40 Polish: stabile UI-ID, entkoppelt von field.key.
    _clientId: `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    key,
    type,
    label,
    placeholder: "",
    // Aufgabe 39 Polish: alle neuen Felder default required=true.
    required: true,
    visible: true,
    sort_order: maxOrder + 1,
    // Aufgabe 40 Polish: semantic Types haben kanonischen Key (touched=true → stabil).
    // Generic Types syncen ihren Key mit dem Label (touched=false → Auto-Sync aktiv).
    _keyTouched: SEMANTIC_CONTACT_TYPES.has(type),
    ...(type === "radio" ? { options: ["Option 1", "Option 2"] } : {}),
  };
}

// Aufgabe 50: sinnvoller Default-Titel für eine 1-Feld-Karte, die aus einem einzelnen Feld erzeugt
// wird (der große Karten-Titel ersetzt im 1-Feld-Fall das Feld-Label). Leer = User benennt selbst.
function cardTitleForField(type: ContactFieldConfig["type"]): string {
  switch (type) {
    case "full_name":
    case "first_name":
    case "last_name":
      return "Wie heißt du?";
    case "email":
      return "Wie lautet deine E-Mail-Adresse?";
    case "tel":
      return "Wie lautet deine Telefonnummer?";
    case "plz":
      return "Wie lautet deine Postleitzahl?";
    default:
      return "";
  }
}

function defaultQuestion(type: QuestionType): EditorQuestion {
  const needsOptions = type === "single_choice" || type === "multi_choice" || type === "dropdown";
  return {
    _id: makeId(),
    questionKey: "",
    questionType: type,
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
    options: needsOptions
      ? [
          { _id: makeId(), label: "Option A", value: "" },
          { _id: makeId(), label: "Option B", value: "" },
        ]
      : [],
    dateMin: "",
    dateMax: "",
    dateDefault: "",
    numberMin: "",
    numberMax: "",
    numberStep: "",
    numberDefault: "",
    numberUnit: "",
    checkboxLabel: "",
    // Aufgabe 40 Polish: neue Frage hat noch keinen "berührten" key → Auto-Sync mit Titel aktiv
    _keyTouched: false,
  };
}

export function EditorShell({ initialState, mode, originalSlug, companyName, initialHideContactWarning }: Props) {
  const router = useRouter();

  // Aufgabe 55: useHistoryState statt useState — Drop-in (identische set-Signatur),
  // alle ~30 Handler unten bleiben unverändert. history liefert Undo/Redo + applyToAll.
  const [state, setState, history] = useHistoryState<EditorState>(initialState);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameSave = useSaveStatus();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  // Aufgabe 59 (Stavros-Befund): der aktive Tab lebt in der URL (?tab=…) statt nur im
  // React-State — Browser-Zurück/Vor (+ Maustasten) wechseln damit zwischen den Tabs,
  // statt aus dem Editor zu werfen; Tab-Links sind teilbar/refresh-fest. Shallow via
  // History API (Next synct useSearchParams ohne Server-Roundtrip — Editor-State bleibt).
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TopTabKey =
    tabParam === "logic" || tabParam === "emails" || tabParam === "webhooks" || tabParam === "share"
      ? tabParam
      : "content";
  const setActiveTab = useCallback((tab: TopTabKey) => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("tab") ?? "content";
    if (current === tab) return;
    if (tab === "content") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState(null, "", url.toString());
  }, []);
  // Aufgabe 45: rechter Inspektor im „Bearbeiten"-Tab — „content" = Schritt-Eigenschaften,
  // „design" = funnel-weites Theme. (Inhalt + Design sind ein Tab mit Umschalter.)
  const [inspectorMode, setInspectorMode] = useState<"content" | "design">("content");
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Name-Prompt für Create-Modus ohne Funnel-Namen — analog v1.
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(
    mode === "create" && !initialState.funnelName,
  );
  const [pendingName, setPendingName] = useState<string>("");

  // C.1c WYSIWYG-Edit — welches Element im CenterCanvas ist gerade selektiert (für Highlight + Inline-Edit)
  const [selectedFieldRef, setSelectedFieldRef] = useState<string>("");

  // Aufgabe 57D: Kontaktierbarkeits-Warnung quittierbar. Toggle wirkt sofort in der
  // Session; das PATCH persistiert pro Funnel als Best-Effort (Fehler nur loggen —
  // es ist ein UX-Hinweis, kein Datenverlust-Risiko; schlimmstenfalls ist das Banner
  // beim nächsten Laden wieder da). Create-Modus: noch kein Funnel in der DB → nur Session.
  const [hideContactWarning, setHideContactWarning] = useState<boolean>(initialHideContactWarning ?? false);
  const handleToggleContactWarning = useCallback(
    (hidden: boolean) => {
      setHideContactWarning(hidden);
      if (mode !== "edit" || !originalSlug) return;
      void fetch(`/api/tenant/funnels/${originalSlug}/contact-warning`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden }),
      })
        .then((res) => {
          if (!res.ok) console.error("contact-warning persist failed", res.status);
        })
        .catch((err) => console.error("contact-warning persist failed", err));
    },
    [mode, originalSlug],
  );

  // Polish: Canvas-side Inline-"+"-Button auf leerer Custom-Karte öffnet diesen Shell-Level-Picker.
  // Properties-Panel hat seinen eigenen Picker — beide funktionieren unabhängig.
  const [canvasFieldPickerOpen, setCanvasFieldPickerOpen] = useState(false);

  // Default-Selection: erste Frage falls vorhanden, sonst der End-Screen (existiert immer).
  // Aufgabe 51: nicht mehr auf "submit" zurückfallen — die Submit-Page ist bei neuen Funnels weg.
  const [selected, setSelected] = useState<SelectedStep>(() => {
    if (initialState.questions.length > 0) {
      return { kind: "question", questionIndex: 0 };
    }
    return { kind: "success" };
  });

  // Aufgabe 40: Map page_id → Anzahl after_page-Webhooks die auf diese Page zeigen.
  // Wird beim Mount + nach jeder Subscription-Änderung im WebhooksPanel neu geladen.
  // Für StepPill-Badges (visuelle Verbindung Builder ↔ Webhooks-Tab).
  const [webhookCountsByPageId, setWebhookCountsByPageId] = useState<Record<string, number>>({});

  const reloadWebhookCounts = useCallback(async () => {
    if (!originalSlug) return;
    try {
      const res = await fetch(`/api/tenant/funnels/${originalSlug}/webhooks`);
      if (!res.ok) return;
      const subs: Array<{ trigger_type: string; trigger_page_id: string | null }> = await res.json();
      const counts: Record<string, number> = {};
      for (const sub of subs) {
        if (sub.trigger_type === "after_page" && sub.trigger_page_id) {
          counts[sub.trigger_page_id] = (counts[sub.trigger_page_id] ?? 0) + 1;
        }
      }
      setWebhookCountsByPageId(counts);
    } catch {
      // silent — Badges sind nice-to-have, kein blocker
    }
  }, [originalSlug]);

  useEffect(() => {
    reloadWebhookCounts();
  }, [reloadWebhookCounts]);

  // Aufgabe 58 — Logik-Regeln des Funnels. Eine Quelle für: StepList-Badges,
  // Panel-Kurzfassung, Regel-Modal UND die Test-Modus-Runtime im Canvas.
  // Beim Mount geladen + nach jedem Modal-Save neu.
  const [logicRules, setLogicRules] = useState<LogicRule[]>([]);
  const reloadLogicRules = useCallback(async () => {
    if (!originalSlug) return;
    try {
      const res = await fetch(`/api/tenant/funnels/${originalSlug}/logic`);
      if (!res.ok) return;
      const rules: LogicRule[] = await res.json();
      setLogicRules(Array.isArray(rules) ? rules : []);
    } catch {
      // silent — Logik ist additiv, der Editor funktioniert auch ohne
    }
  }, [originalSlug]);

  useEffect(() => {
    reloadLogicRules();
  }, [reloadLogicRules]);

  const logicCountsByPageId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rule of logicRules) {
      counts[rule.sourcePageId] = (counts[rule.sourcePageId] ?? 0) + 1;
    }
    return counts;
  }, [logicRules]);

  // Welcher Step ist im Logik-Modal geöffnet (Index in state.questions, null = zu).
  const [logicModalIndex, setLogicModalIndex] = useState<number | null>(null);

  // Baseline für Dirty-Tracking. Startet als initialState, wird bei Feld-Autosave (z.B.
  // Funnel-Name on-blur) nachgezogen, damit ein bereits gespeichertes Feld das Dokument
  // nicht „ungespeichert" hält.
  const [savedSnapshot, setSavedSnapshot] = useState<EditorState>(initialState);
  const isDirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(savedSnapshot),
    [state, savedSnapshot],
  );

  // C.1c — Selection im Center-Canvas resetten wenn die Page wechselt (Step-Klick in der Sidebar).
  useEffect(() => {
    setSelectedFieldRef("");
  }, [selected]);

  // C.1c — Esc-Key deselected den aktuellen Field-Ref.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedFieldRef("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Aufgabe 55 — Undo/Redo-Shortcuts: Strg+Z / Strg+Shift+Z / Strg+Y.
  // WICHTIG: nicht kapern, wenn der Fokus in einem Input/Textarea/contentEditable
  // liegt — dort gilt das native Text-Undo des Browsers (Typeform-Verhalten).
  // Nur im Bearbeiten-Tab (Dokument-State) und nicht im Test-Modus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (activeTab !== "content" || isTestMode) return;
      e.preventDefault();
      if (key === "y" || (key === "z" && e.shiftKey)) {
        history.redo();
      } else {
        history.undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // undo/redo sind stabile useCallbacks — das History-Objekt selbst wechselt pro Render.
  }, [activeTab, isTestMode, history.undo, history.redo]);

  // Aufgabe 55 — Selection-Clamp: Undo/Redo (oder jede andere State-Änderung) kann die
  // Fragen-Liste verkürzen, während selected noch auf einen höheren Index zeigt. Ohne
  // Clamp zeigt der Canvas dann fälschlich den "Keine Frage"-Placeholder.
  useEffect(() => {
    if (selected.kind === "question" && selected.questionIndex >= state.questions.length) {
      setSelected(
        state.questions.length > 0
          ? { kind: "question", questionIndex: state.questions.length - 1 }
          : { kind: "success" },
      );
    }
  }, [state.questions.length, selected]);

  // Aufgabe 59: Browser-Verlassen-Schutz — der __editorGuard unten fängt nur In-App-Links.
  // Tab schließen / F5 / Navigation zu einer fremden Seite mit ungespeicherten Änderungen
  // → nativer Browser-Dialog. (Tab-Wechsel im Editor sind seit dem URL-Sync shallow und
  // lösen kein beforeunload aus; Soft-Navigation zu anderen App-Routen via Browser-Zurück
  // bleibt eine bekannte Lücke — popstate ist nicht zuverlässig blockierbar.)
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Exit-Guard registrieren (identische Signatur zu v1, konsumiert von Sidebar/MobileNav/UserMenu).
  useEffect(() => {
    if (isDirty) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__editorGuard = (href: string) => {
        setPendingHref(href);
        setShowExitModal(true);
      };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__editorGuard = null;
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__editorGuard = null;
    };
  }, [isDirty]);

  const handlePatch = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePatchQuestion = useCallback(
    (index: number, patch: Partial<EditorQuestion>) => {
      setState((prev) => {
        const next = [...prev.questions];
        if (!next[index]) return prev;
        const current = next[index];
        const merged: EditorQuestion = { ...current, ...patch };

        // Aufgabe 40 Polish: Auto-Sync questionKey ↔ Title — solange User den Key
        // noch nicht manuell editiert hat (_keyTouched=false). Wenn der Patch den
        // questionKey selbst setzt, mark _keyTouched=true (User hat ihn angefasst).
        if (Object.prototype.hasOwnProperty.call(patch, "questionKey")) {
          merged._keyTouched = true;
        } else if (Object.prototype.hasOwnProperty.call(patch, "title") && !current._keyTouched) {
          // Title hat sich geändert + Key noch nicht manuell editiert → sync
          merged.questionKey = toKey(merged.title);
        }

        next[index] = merged;
        return { ...prev, questions: next };
      });
    },
    [],
  );

  const handleReorder = useCallback((nextQuestions: EditorQuestion[]) => {
    setState((prev) => ({ ...prev, questions: nextQuestions }));
  }, []);

  const handleAddQuestion = useCallback(
    (type: QuestionType, atIndex?: number) => {
      const newQ = defaultQuestion(type);
      setState((prev) => {
        const insertAt = atIndex ?? prev.questions.length;
        const next = [...prev.questions];
        next.splice(insertAt, 0, newQ);
        return { ...prev, questions: next };
      });
      // selektiere die neue Frage an ihrer Insert-Position
      const insertAt = atIndex ?? state.questions.length;
      setSelected({ kind: "question", questionIndex: insertAt });
    },
    [state.questions.length],
  );

  // Aufgabe 39: Adresse-Quick-Card mit 4 vorbefüllten Feldern (Straße/Hausnr/PLZ/Ort)
  const handleAddAddressCard = useCallback(
    (atIndex?: number) => {
      const newPage = makeAddressCustomPage();
      setState((prev) => {
        const insertAt = atIndex ?? prev.questions.length;
        const next = [...prev.questions];
        next.splice(insertAt, 0, newPage);
        return { ...prev, questions: next };
      });
      const insertAt = atIndex ?? state.questions.length;
      setSelected({ kind: "question", questionIndex: insertAt });
    },
    [state.questions.length],
  );

  // Aufgabe 50: Kontaktdaten-Quick-Card (Name + E-Mail + Telefon) — häufigste Lead-Card.
  const handleAddContactCard = useCallback(
    (atIndex?: number) => {
      const newPage = makeContactCard();
      setState((prev) => {
        const insertAt = atIndex ?? prev.questions.length;
        const next = [...prev.questions];
        next.splice(insertAt, 0, newPage);
        return { ...prev, questions: next };
      });
      const insertAt = atIndex ?? state.questions.length;
      setSelected({ kind: "question", questionIndex: insertAt });
    },
    [state.questions.length],
  );

  // Aufgabe 39: Welcome-Screen IMMER an Position 0 (Intro vor allem anderen).
  // Max 1 Welcome-Screen pro Funnel — wenn schon einer da ist, wird er nicht doppelt
  // angelegt sondern stattdessen selektiert (User landet im Properties-Panel des bestehenden).
  const handleAddWelcome = useCallback(
    (_atIndex?: number) => {
      const existingWelcomeIdx = state.questions.findIndex((q) => q.kind === "welcome");
      if (existingWelcomeIdx >= 0) {
        setSelected({ kind: "question", questionIndex: existingWelcomeIdx });
        return;
      }
      const newPage = makeDefaultWelcomePage();
      setState((prev) => {
        // Immer Position 0 — Welcome ist Intro vor dem Flow, sonst Logik kaputt.
        return { ...prev, questions: [newPage, ...prev.questions] };
      });
      setSelected({ kind: "question", questionIndex: 0 });
    },
    [state.questions],
  );

  // Aufgabe 38: neue Custom-Multi-Field-Karte hinzufügen
  const handleAddCustomPage = useCallback(
    (atIndex?: number) => {
      const newPage = makeDefaultCustomPage();
      setState((prev) => {
        const insertAt = atIndex ?? prev.questions.length;
        const next = [...prev.questions];
        next.splice(insertAt, 0, newPage);
        return { ...prev, questions: next };
      });
      const insertAt = atIndex ?? state.questions.length;
      setSelected({ kind: "question", questionIndex: insertAt });
    },
    [state.questions.length],
  );

  // Aufgabe 38: Patch eines Felds innerhalb einer Custom-Page
  const handlePatchCustomField = useCallback(
    (pageIndex: number, clientId: string, patch: Partial<ContactFieldConfig>) => {
      setState((prev) => {
        const next = [...prev.questions];
        const page = next[pageIndex];
        if (!page || page.kind !== "custom") return prev;
        const fields = (page.customFields ?? []).map((f) => {
          if (f._clientId !== clientId) return f;
          const merged: ContactFieldConfig = { ...f, ...patch };
          // Aufgabe 40 Polish: gleiche Auto-Sync-Logik wie bei Question-Pages.
          // Key-Patch → _keyTouched=true. Label-Patch + !_keyTouched → sync key zu toKey(label).
          if (Object.prototype.hasOwnProperty.call(patch, "key")) {
            merged._keyTouched = true;
          } else if (
            Object.prototype.hasOwnProperty.call(patch, "label") &&
            !f._keyTouched
          ) {
            merged.key = toKey(merged.label) || f.key;
          }
          return merged;
        });
        next[pageIndex] = { ...page, customFields: fields };
        return { ...prev, questions: next };
      });
    },
    [],
  );

  // Aufgabe 38: neues Feld einer Custom-Page hinzufügen
  const handleAddCustomField = useCallback(
    (pageIndex: number, type: ContactFieldConfig["type"]) => {
      setState((prev) => {
        const next = [...prev.questions];
        const page = next[pageIndex];
        if (!page || page.kind !== "custom") return prev;
        const existing = page.customFields ?? [];
        const newField = defaultContactField(type, existing);
        next[pageIndex] = { ...page, customFields: [...existing, newField] };
        return { ...prev, questions: next };
      });
    },
    [],
  );

  // Aufgabe 50: Karten-Feld hinzufügen (Karten-Model). Einfaches Feld wandert in die gewählte
  // Karte (wenn erlaubt + eine Karte selektiert ist), sonst entsteht eine NEUE Karte mit genau
  // diesem Feld an atIndex. Spezial-Typen laufen weiter über handleAddQuestion (eigene Seite).
  const handleAddCardField = useCallback(
    (type: ContactFieldConfig["type"], atIndex: number, allowIntoSelected: boolean) => {
      if (allowIntoSelected && selected.kind === "question") {
        const page = state.questions[selected.questionIndex];
        if (page && page.kind === "custom") {
          handleAddCustomField(selected.questionIndex, type);
          return;
        }
      }
      const newPage = makeDefaultCustomPage();
      newPage.title = cardTitleForField(type);
      newPage.customFields = [defaultContactField(type, [])];
      const clampedIndex = Math.min(Math.max(atIndex, 0), state.questions.length);
      setState((prev) => {
        const insertAt = Math.min(Math.max(atIndex, 0), prev.questions.length);
        const next = [...prev.questions];
        next.splice(insertAt, 0, newPage);
        return { ...prev, questions: next };
      });
      setSelected({ kind: "question", questionIndex: clampedIndex });
    },
    [selected, state.questions, handleAddCustomField],
  );

  // Aufgabe 38: Feld einer Custom-Page löschen
  const handleDeleteCustomField = useCallback(
    (pageIndex: number, clientId: string) => {
      setState((prev) => {
        const next = [...prev.questions];
        const page = next[pageIndex];
        if (!page || page.kind !== "custom") return prev;
        const fields = (page.customFields ?? []).filter((f) => f._clientId !== clientId);
        next[pageIndex] = { ...page, customFields: fields };
        return { ...prev, questions: next };
      });
    },
    [],
  );

  // Aufgabe 38: Felder einer Custom-Page neu sortieren
  const handleReorderCustomFields = useCallback(
    (pageIndex: number, nextFields: ContactFieldConfig[]) => {
      setState((prev) => {
        const next = [...prev.questions];
        const page = next[pageIndex];
        if (!page || page.kind !== "custom") return prev;
        const reindexed = nextFields.map((f, idx) => ({ ...f, sort_order: idx }));
        next[pageIndex] = { ...page, customFields: reindexed };
        return { ...prev, questions: next };
      });
    },
    [],
  );

  const handleDeleteQuestion = useCallback(
    (index: number) => {
      setState((prev) => {
        const next = [...prev.questions];
        next.splice(index, 1);
        return { ...prev, questions: next };
      });
      // Nach Delete: Selektion auf vorherige Frage, oder End-Screen wenn keine mehr da.
      setSelected((prev) => {
        if (prev.kind !== "question") return prev;
        const remaining = state.questions.length - 1;
        if (remaining <= 0) return { kind: "success" };
        return { kind: "question", questionIndex: Math.min(index, remaining - 1) };
      });
    },
    [state.questions.length],
  );

  // Aufgabe 55: Step duplizieren (Hover-Action in der StepList). Deep-Copy mit frischen
  // Client-IDs; dbId wird bewusst NICHT kopiert — die Kopie ist eine neue Page und bekommt
  // beim Save eine eigene UUID (zwei Steps mit derselben dbId würde der Save-Pfad zwar
  // defensiv auflösen, aber sauber ist sauber). questionKey bleibt — der Save-Pfad
  // dedupliziert Frage-Keys global via ensureUniqueKey (Suffix _2); Karten-Feld-Keys
  // sind nur pro Page unique, identische Keys auf der neuen Page sind also valide.
  const handleDuplicateQuestion = useCallback((index: number) => {
    setState((prev) => {
      const src = prev.questions[index];
      if (!src || src.kind === "welcome") return prev; // max 1 Welcome pro Funnel
      const stamp = Date.now().toString(36);
      const copy: EditorQuestion = {
        ...src,
        _id: makeId(),
        dbId: undefined,
        options: src.options.map((o, i) => ({
          ...o,
          _id: `opt_${stamp}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        })),
        customFields: src.customFields?.map((f, i) => ({
          ...f,
          _clientId: `cf_${stamp}_${i}_${Math.random().toString(36).slice(2, 8)}`,
          options: f.options ? [...f.options] : undefined,
        })),
      };
      const next = [...prev.questions];
      next.splice(index + 1, 0, copy);
      return { ...prev, questions: next };
    });
    setSelected({ kind: "question", questionIndex: index + 1 });
  }, [setState]);

  /* ─── Aufgabe 52D: Contact-Field-Handler entfernt (Submit-Page/Kontaktformular abgeschafft).
         Lead-Erfassung läuft über Kontaktdaten-Karten → handlePatchCustomField etc. ─── */

  /* ─── C.1c Canvas-Option-Aktionen (Add/Reorder/Duplicate/Delete) ─── */

  const handleAddOption = useCallback(() => {
    if (selected.kind !== "question") return;
    const qIdx = selected.questionIndex;
    setState((prev) => {
      const next = [...prev.questions];
      const q = next[qIdx];
      if (!q) return prev;
      const newOption = {
        _id: `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        label: "",
        value: "",
      };
      next[qIdx] = { ...q, options: [...q.options, newOption] };
      return { ...prev, questions: next };
    });
  }, [selected]);

  const handleReorderOptions = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (selected.kind !== "question") return;
      const qIdx = selected.questionIndex;
      setState((prev) => {
        const next = [...prev.questions];
        const q = next[qIdx];
        if (!q) return prev;
        const newOptions = [...q.options];
        const [moved] = newOptions.splice(fromIdx, 1);
        if (!moved) return prev;
        newOptions.splice(toIdx, 0, moved);
        next[qIdx] = { ...q, options: newOptions };
        return { ...prev, questions: next };
      });
    },
    [selected],
  );

  const handleDuplicateOption = useCallback(
    (idx: number) => {
      if (selected.kind !== "question") return;
      const qIdx = selected.questionIndex;
      setState((prev) => {
        const next = [...prev.questions];
        const q = next[qIdx];
        if (!q || !q.options[idx]) return prev;
        const src = q.options[idx];
        const duplicate = {
          ...src,
          _id: `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          value: "", // wird beim Save neu aus Label generiert
        };
        const newOptions = [...q.options];
        newOptions.splice(idx + 1, 0, duplicate);
        next[qIdx] = { ...q, options: newOptions };
        return { ...prev, questions: next };
      });
    },
    [selected],
  );

  const handleDeleteOption = useCallback(
    (idx: number) => {
      if (selected.kind !== "question") return;
      const qIdx = selected.questionIndex;
      setState((prev) => {
        const next = [...prev.questions];
        const q = next[qIdx];
        if (!q || q.options.length <= 1) return prev; // mindestens 1 Option erforderlich
        const newOptions = q.options.filter((_, i) => i !== idx);
        next[qIdx] = { ...q, options: newOptions };
        return { ...prev, questions: next };
      });
    },
    [selected],
  );

  /* ─── C.1c WYSIWYG-Edit — Text-Change-Router ─── */

  // Mappt Field-Refs aus funnel.tsx (z.B. "question_title", "option_2", "contact_form_title")
  // auf EditorState-Updates. qIdx kommt vom EditorShell-State (selected.questionIndex), nicht vom
  // Funnel-Callback — das ist die Sidebar-Array-Index-Wahrheit.
  const handleTextChange = useCallback(
    (fieldRef: string, newText: string) => {
      const qIdx = selected.kind === "question" ? selected.questionIndex : -1;

      // Option-Label: option_<idx>
      if (fieldRef.startsWith("option_") && qIdx >= 0) {
        const optIdx = parseInt(fieldRef.slice("option_".length), 10);
        if (!Number.isFinite(optIdx)) return;
        setState((prev) => {
          const next = [...prev.questions];
          const q = next[qIdx];
          if (!q) return prev;
          const nextOptions = q.options.map((o, i) => (i === optIdx ? { ...o, label: newText } : o));
          next[qIdx] = { ...q, options: nextOptions };
          return { ...prev, questions: next };
        });
        return;
      }

      // Question-Page Felder
      if (qIdx >= 0) {
        if (fieldRef === "question_title") {
          handlePatchQuestion(qIdx, { title: newText });
          return;
        }
        if (fieldRef === "question_subtitle") {
          handlePatchQuestion(qIdx, { subtitle: newText });
          return;
        }
        // Aufgabe 56: neue Inline-Edit-Ziele
        if (fieldRef === "welcome_button_label") {
          handlePatchQuestion(qIdx, { welcomeButtonLabel: newText });
          return;
        }
        if (fieldRef === "checkbox_label") {
          handlePatchQuestion(qIdx, { checkboxLabel: newText });
          return;
        }
      }

      // Aufgabe 52D: Submit-Page-Canvas-Edit-Felder (contact_form_title/subtitle, submit_button)
      // entfernt — das Kontaktformular wird nicht mehr gerendert.

      // Success-Page Felder
      if (fieldRef === "success_message") {
        handlePatch({ successMessage: newText });
        return;
      }
      if (fieldRef === "response_message") {
        handlePatch({ responseMessage: newText });
        return;
      }
      if (fieldRef === "answers_overview_label") {
        handlePatch({ answersOverviewLabel: newText });
        return;
      }

      // Unbekannter Field-Ref — keine State-Änderung. Selection-Highlight läuft trotzdem.
    },
    [selected, handlePatch, handlePatchQuestion],
  );

  // Aufgabe 59: withV2Flag entfernt — das ?v=2-Routing-Flag war seit dem v1-Aus (C.1d) tot,
  // beide Editor-Seiten rendern EditorShell bedingungslos. Alt-URLs mit v=2 bleiben gültig
  // (der Parameter wird schlicht ignoriert).

  // Aufgabe 50: Speichern vom Navigieren entkoppelt. Default bleibt im Editor — der globale
  // Save ist jetzt iterativ nutzbar. Navigation passiert nur noch (a) wenn explizit verlassen
  // wird (ExitModal → leaveAfter=true), oder (b) im Create-Modus, wo nach dem POST auf die
  // Edit-URL des neuen Slugs gewechselt werden MUSS (sonst POSTet der nächste Save ein Duplikat).
  async function handleSave({ leaveAfter = false }: { leaveAfter?: boolean } = {}) {
    if (!state.funnelName) {
      setSaveError("Bitte gib einen Funnel-Namen ein.");
      return;
    }
    // Snapshot dessen, was wir tatsächlich senden — damit savedSnapshot exakt der gespeicherte
    // Stand ist, auch wenn der User während des Requests weitertippt (dann bleibt es dirty).
    const savedState = state;
    setIsSaving(true);
    setSaveError(null);
    try {
      const url =
        mode === "create"
          ? "/api/tenant/funnels"
          : `/api/tenant/funnels/${originalSlug}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: savedState }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error ?? "Unbekannter Fehler beim Speichern.");
        return;
      }

      if (mode === "create") {
        // Funnel existiert jetzt → in die Edit-URL des neuen Slugs wechseln, damit der nächste
        // Save als PUT läuft. Beim expliziten Verlassen stattdessen zum pendingHref.
        const newSlug = typeof json.slug === "string" ? json.slug : undefined;
        const dest = leaveAfter
          ? (pendingHref ?? "/dashboard/funnels")
          : newSlug
            ? `/dashboard/funnels/${newSlug}/edit`
            : "/dashboard/funnels";
        setPendingHref(null);
        router.push(dest);
        return;
      }

      // Edit-Modus: Baseline nachziehen → isDirty=false, Badge „Gespeichert". Im Editor bleiben
      // (kein router.refresh — der Client-State ist die Wahrheit, sonst Flicker/State-Verlust).
      //
      // Aufgabe 54: Der PUT gibt die persistierten Page-UUIDs zurück (pageIds, gemappt über
      // EditorQuestion._id). Wir mergen sie als dbId in State UND Snapshot — identisch, sonst
      // bliebe isDirty (JSON-Vergleich) fälschlich true. Damit haben neu angelegte Steps ab dem
      // ersten Save eine stabile dbId: Webhook-Binding ohne Reload, keine UUID-Rotation mehr
      // bei Folge-Saves. Mid-Flight-Edits des Users bleiben korrekt dirty (andere Felder
      // differieren weiterhin gegen den Snapshot).
      // Aufgabe 58: zusätzlich zum pageId-Merge reist der FINALE questionKey von
      // Question-Pages mit (bei leerem Editor-Key server-seitig generiert) — Logik-
      // Bedingungen referenzieren ihn, der Editor muss ihn kennen.
      const returnedPageIds: Array<{ clientId: string; pageId: string; questionKey?: string }> = Array.isArray(json.pageIds)
        ? (json.pageIds as Array<{ clientId?: unknown; pageId?: unknown; questionKey?: unknown }>).flatMap(
            (e) =>
              typeof e?.clientId === "string" && typeof e?.pageId === "string"
                ? [{
                    clientId: e.clientId,
                    pageId: e.pageId,
                    questionKey: typeof e.questionKey === "string" && e.questionKey ? e.questionKey : undefined,
                  }]
                : [],
          )
        : [];
      if (returnedPageIds.length > 0) {
        const byClientId = new Map(returnedPageIds.map((e) => [e.clientId, e]));
        const withDbIds = (qs: EditorState["questions"]): EditorState["questions"] =>
          qs.map((q) => {
            const entry = byClientId.get(q._id);
            if (!entry) return q;
            const needsDbId = q.dbId !== entry.pageId;
            // entry.questionKey existiert nur für Question-Pages (editorStateToPagesAndFields
            // setzt ihn ausschließlich im Question-Branch) — kein kind-Guard nötig.
            const needsKey = entry.questionKey !== undefined && q.questionKey !== entry.questionKey;
            if (!needsDbId && !needsKey) return q;
            return {
              ...q,
              ...(needsDbId ? { dbId: entry.pageId } : {}),
              // Key ist jetzt DB-Wahrheit → festschreiben (kein Auto-Sync mit dem Titel mehr).
              ...(needsKey ? { questionKey: entry.questionKey!, _keyTouched: true } : {}),
            };
          });
        // Aufgabe 55: applyToAll statt setState — der dbId-Merge ist ein technischer
        // Schritt (kein Undo-Eintrag!) und muss auch in past/future gelten, sonst
        // verliert ein Undo über den Save-Punkt die frischen Page-UUIDs → der nächste
        // Save würde Pages neu anlegen und after_page-Webhook-Bindings zerstören.
        history.applyToAll((s) => ({ ...s, questions: withDbIds(s.questions) }));
        setSavedSnapshot({ ...savedState, questions: withDbIds(savedState.questions) });
      } else {
        setSavedSnapshot(savedState);
      }
      if (leaveAfter) {
        const dest = pendingHref ?? "/dashboard/funnels";
        setPendingHref(null);
        router.push(dest);
      }
    } catch {
      setSaveError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (isDirty) {
      setPendingHref("/dashboard/funnels");
      setShowExitModal(true);
    } else {
      router.push("/dashboard/funnels");
    }
  }

  function handleDiscardAndLeave() {
    setShowExitModal(false);
    router.push(pendingHref ?? "/dashboard/funnels");
    setPendingHref(null);
  }

  function handleCancelExit() {
    setShowExitModal(false);
    setPendingHref(null);
  }

  function confirmNamePrompt() {
    const trimmed = pendingName.trim();
    if (!trimmed) return;
    setState((prev) => ({ ...prev, funnelName: trimmed }));
    setShowNamePrompt(false);
  }

  function cancelNamePrompt() {
    router.push("/dashboard/funnels");
  }

  // Aufgabe 50: Funnel-Name autosaved on-blur (nur Edit-Modus — im Create-Modus existiert der
  // Funnel noch nicht, der Name geht im ersten Speichern mit). Leer → auf zuletzt gespeicherten
  // Wert zurücksetzen (Name ist Pflicht). Unverändert → kein Request.
  async function handleNameBlur() {
    if (mode !== "edit" || !originalSlug) return;
    const trimmed = state.funnelName.trim();
    if (!trimmed) {
      handlePatch({ funnelName: savedSnapshot.funnelName });
      return;
    }
    if (trimmed !== state.funnelName) handlePatch({ funnelName: trimmed });
    if (trimmed === savedSnapshot.funnelName) return;
    await nameSave.run(async () => {
      const res = await fetch(`/api/tenant/funnels/${originalSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnelName: trimmed }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedSnapshot((prev) => ({ ...prev, funnelName: trimmed }));
    });
  }

  const canSave = Boolean(state.funnelName);

  // Aufgabe 45: Speichern-Modell vereinheitlicht. „Dokument-Tabs" (Inhalt/Design) speichern
  // über den globalen Top-Button. „Ressourcen-Tabs" (E-Mails/Webhooks/Einbinden) speichern
  // inline pro Element → der Top-Button wird dort ausgeblendet (außer es gibt ungesicherte
  // Dokument-Änderungen), ein passiver Hinweis ersetzt ihn. Schluss mit Doppel-Speichern.
  const isDocumentTab = activeTab === "content";

  return (
    <>
      {showNamePrompt && <NamePromptModal pendingName={pendingName} setPendingName={setPendingName} onConfirm={confirmNamePrompt} onCancel={cancelNamePrompt} />}
      {showExitModal && (
        <ExitModal onCancel={handleCancelExit} onDiscard={handleDiscardAndLeave} onSave={() => { setShowExitModal(false); handleSave({ leaveAfter: true }); }} />
      )}

      <div
        className="fixed inset-y-0 right-0 left-0 lg:left-16 flex flex-col bg-gray-100 dark:bg-background"
      >
        {/* Top-Bar: EINE Zeile — links Back+Name · Mitte Tabs (zentriert) · rechts Status+Speichern.
            Test/Geräte-Controls schweben im Canvas (CenterCanvas) statt als eigener Balken. */}
        <header className="flex shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
          {/* Links */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Zurück zur Funnel-Liste"
              title="Zurück"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="group flex min-w-0 items-center gap-1">
              <input
                ref={nameInputRef}
                type="text"
                value={state.funnelName}
                onChange={(e) => handlePatch({ funnelName: e.target.value })}
                onBlur={handleNameBlur}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                placeholder="Neuer Funnel"
                aria-label="Funnel-Name (zum Bearbeiten klicken)"
                title="Klick zum Umbenennen"
                className="min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-semibold text-gray-900 outline-none transition-colors hover:border-gray-200 focus:border-primary focus:bg-white dark:text-white dark:hover:border-gray-700 dark:focus:bg-gray-800"
                style={{ width: `${Math.min(Math.max((state.funnelName || "Neuer Funnel").length, 8) + 2, 36)}ch` }}
              />
              <button
                type="button"
                onClick={() => nameInputRef.current?.focus()}
                title="Funnel umbenennen"
                aria-label="Funnel umbenennen"
                className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100 dark:hover:text-gray-300"
              >
                <Pencil size={13} />
              </button>
            </div>
            <SaveStatus status={nameSave.status} className="shrink-0" />
            {/* Aufgabe 56: Live-Preview — öffnet den echten Funnel in neuem Tab, OHNE den
                Aufruf-Zähler zu erhöhen (?preview=1, Skip in TenantFunnelClient). Submits
                bleiben echt → voller End-to-End-Test möglich. Zeigt den GESPEICHERTEN Stand. */}
            {mode === "edit" && originalSlug && (
              <a
                href={`/${originalSlug}?preview=1`}
                target="_blank"
                rel="noopener noreferrer"
                title="Live ansehen (gespeicherter Stand — zählt keinen Aufruf)"
                aria-label="Live ansehen"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <ExternalLink size={15} />
              </a>
            )}
          </div>

          {/* Mitte: Tabs */}
          <div className="shrink-0">
            <TopTabs active={activeTab} onChange={setActiveTab} />
          </div>

          {/* Rechts: Undo/Redo + Status + Speichern */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            {/* Aufgabe 55: Undo/Redo — nur im Bearbeiten-Tab (Dokument-State; Ressourcen-Tabs
                speichern server-seitig pro Eintrag, ein UI-only-Undo wäre dort eine Lüge). */}
            {isDocumentTab && !isTestMode && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={history.undo}
                  disabled={!history.canUndo}
                  title="Rückgängig (Strg+Z)"
                  aria-label="Rückgängig"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white dark:disabled:hover:bg-transparent"
                >
                  <Undo2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={history.redo}
                  disabled={!history.canRedo}
                  title="Wiederholen (Strg+Shift+Z)"
                  aria-label="Wiederholen"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white dark:disabled:hover:bg-transparent"
                >
                  <Redo2 size={16} />
                </button>
              </div>
            )}
            {saveError && (
              <span className="hidden text-xs text-red-600 dark:text-red-400 md:inline">{saveError}</span>
            )}
            {/* Aufgabe 45/50: globaler Save nur auf Dokument-Tabs (Inhalt/Design) — oder wenn es
                ungesicherte Dokument-Änderungen gibt. Status + Aktion sind EIN Element: grünes
                „Gespeichert" im Ruhezustand, „Speichern"-Button bei ungesicherten Änderungen. */}
            {(isDocumentTab || isDirty) &&
              (isDirty || isSaving ? (
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={!canSave || isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/80" />
                  ) : (
                    <Save size={14} />
                  )}
                  {isSaving ? "Speichern…" : "Speichern"}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-sm font-medium text-green-700 dark:border-green-700/40 dark:bg-green-900/20 dark:text-green-400">
                  <Check size={14} strokeWidth={2.5} />
                  Gespeichert
                </span>
              ))}
          </div>
        </header>

        {/* Body — Layout je nach Tab.
            C.2: Design-Tab versteckt StepList (Theme ist funnel-weit, kein Step) und ersetzt
            PropertiesPanel durch ThemePanel. CenterCanvas bleibt für Live-Preview.
            Aufgabe 40: Webhooks-Tab ist full-width Panel — kein Canvas, keine StepList,
            weil Webhook-Config keine Page-Selection braucht. */}
        {activeTab === "logic" ? (
          // Aufgabe 59: Logic-Map — read-only Übersicht (Daten: state.questions + logicRules,
          // beides lebt schon hier im Shell). Create-Modus: Regeln brauchen gespeicherte
          // Page-UUIDs → gleicher Hinweis wie bei Webhooks/E-Mails.
          mode === "create" || !originalSlug ? (
            <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-background p-8">
              <div className="max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
                <p className="text-base font-semibold text-gray-900 dark:text-white">Funnel zuerst speichern</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Logik-Regeln brauchen gespeicherte Schritte. Bitte speichere den Funnel einmal,
                  dann siehst du hier den Ablauf deines Funnels als Übersicht.
                </p>
              </div>
            </div>
          ) : (
            <LogicMapPanel
              questions={state.questions}
              rules={logicRules}
              selected={selected}
              onSelectStep={(step) => {
                setSelected(step);
                setActiveTab("content");
              }}
              onOpenLogic={(idx) => setLogicModalIndex(idx)}
              onStartTest={() => {
                setIsTestMode(true);
                setActiveTab("content");
              }}
            />
          )
        ) : activeTab === "webhooks" ? (
          mode === "create" || !originalSlug ? (
            <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-background p-8">
              <div className="max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
                <p className="text-base font-semibold text-gray-900 dark:text-white">Funnel zuerst speichern</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Webhooks sind funnel-spezifisch. Bitte speichere den Funnel einmal, dann kannst du hier
                  deine ersten Webhook-Endpoints anlegen.
                </p>
              </div>
            </div>
          ) : (
            <WebhooksPanel
              funnelSlug={originalSlug}
              questions={state.questions}
              onSubsChanged={reloadWebhookCounts}
            />
          )
        ) : activeTab === "emails" ? (
          mode === "create" || !originalSlug ? (
            <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-background p-8">
              <div className="max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
                <p className="text-base font-semibold text-gray-900 dark:text-white">Funnel zuerst speichern</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  E-Mail-Aktionen sind funnel-spezifisch. Bitte speichere den Funnel einmal, dann kannst du hier
                  deine ersten E-Mails anlegen.
                </p>
              </div>
            </div>
          ) : (
            <EmailsPanel funnelSlug={originalSlug} state={state} />
          )
        ) : activeTab === "share" ? (
          mode === "create" || !originalSlug ? (
            <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-background p-8">
              <div className="max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
                <p className="text-base font-semibold text-gray-900 dark:text-white">Funnel zuerst speichern</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Der Einbett-Code und das Conversion-Tracking sind funnel-spezifisch. Bitte speichere den Funnel
                  einmal, dann findest du hier deinen Code und die Tracking-Einstellungen.
                </p>
              </div>
            </div>
          ) : (
            <SharePanel funnelSlug={originalSlug} funnelName={state.funnelName} />
          )
        ) : (
          // Aufgabe 50: clamp statt fix — Seiten-Panels schrumpfen sanft auf kleineren Screens,
          // Canvas behält Priorität. Linke Spalte = geteilte EDITOR_LEFT_COL (konsistent über alle Tabs).
          <div
            className="grid min-h-0 flex-1"
            style={{ gridTemplateColumns: `${EDITOR_LEFT_COL} minmax(0, 1fr) clamp(340px, 24vw, 400px)` }}
          >
            {/* Aufgabe 59 (Stavros-Wunsch): Test-Modus als Fokus-Modus — dunkle Blur-Overlays
                über beiden Seitenleisten machen unmissverständlich „hier läuft ein Durchlauf".
                Der Canvas bleibt unangetastet (WYSIWYG). Klick aufs Overlay beendet den Test. */}
            <div className="relative min-h-0 overflow-hidden">
              <StepList
                state={state}
                selected={selected}
                onSelect={setSelected}
                onReorder={handleReorder}
                onAddQuestion={handleAddQuestion}
                onAddCardField={handleAddCardField}
                onAddCustomPage={handleAddCustomPage}
                onAddAddressCard={handleAddAddressCard}
                onAddContactCard={handleAddContactCard}
                onAddWelcome={handleAddWelcome}
                onDuplicateQuestion={handleDuplicateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                logicCountsByPageId={logicCountsByPageId}
                onLogicBadgeClick={(idx) => setLogicModalIndex(idx)}
                webhookCountsByPageId={webhookCountsByPageId}
                onSwitchToWebhooksTab={() => setActiveTab("webhooks")}
              />
              {isTestMode && <TestModeOverlay onClick={() => setIsTestMode(false)} />}
            </div>
            <CenterCanvas
              state={state}
              selected={selected}
              companyName={companyName}
              isTestMode={isTestMode}
              logicRules={logicRules}
              hideContactWarning={hideContactWarning}
              onToggleContactWarning={handleToggleContactWarning}
              onToggleTestMode={() => setIsTestMode((t) => !t)}
              selectedFieldRef={selectedFieldRef}
              onSelectField={setSelectedFieldRef}
              onTextChange={handleTextChange}
              onAddOption={handleAddOption}
              onReorderOptions={handleReorderOptions}
              onDuplicateOption={handleDuplicateOption}
              onDeleteOption={handleDeleteOption}
              onAddCustomFieldRequest={() => setCanvasFieldPickerOpen(true)}
              liveSlug={mode === "edit" ? originalSlug : undefined}
            />
            <div className="relative flex min-h-0 flex-col">
              {isTestMode && <TestModeOverlay onClick={() => setIsTestMode(false)} />}
              {/* Aufgabe 45: Inspektor-Umschalter Inhalt | Design (rechte Spalte des Bearbeiten-Tabs).
                  „Inhalt" = Eigenschaften des gewählten Schritts, „Design" = funnel-weites Theme. */}
              <div className="flex h-14 shrink-0 items-center gap-1 border-b border-l border-gray-200 bg-white px-2 dark:border-gray-800 dark:bg-gray-900">
                {(["content", "design"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInspectorMode(m)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      inspectorMode === m
                        ? "bg-primary/10 text-primary"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    {m === "content" ? "Inhalt" : "Design"}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1">
                {inspectorMode === "content" ? (
                  <PropertiesPanel
                    state={state}
                    selected={selected}
                    selectedFieldRef={selectedFieldRef}
                    logicRules={logicRules}
                    onOpenLogicEditor={(idx) => setLogicModalIndex(idx)}
                    onPatch={handlePatch}
                    onPatchQuestion={handlePatchQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onPatchCustomField={handlePatchCustomField}
                    onAddCustomField={handleAddCustomField}
                    onDeleteCustomField={handleDeleteCustomField}
                    onReorderCustomFields={handleReorderCustomFields}
                  />
                ) : (
                  <ThemePanel state={state} onPatch={handlePatch} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Polish: Shell-Level-Picker für Canvas-Inline-+-Button auf leerer Custom-Karte.
          PropertiesPanel hat seinen eigenen Picker — beide arbeiten unabhängig. */}
      <AddContactFieldPicker
        open={canvasFieldPickerOpen}
        onClose={() => setCanvasFieldPickerOpen(false)}
        onSelect={(type) => {
          if (selected.kind === "question") {
            handleAddCustomField(selected.questionIndex, type);
          }
          setCanvasFieldPickerOpen(false);
        }}
      />

      {/* Aufgabe 58 — Regel-Editor für Logik-Sprünge (öffnet aus Panel-Sektion + StepList-Badge). */}
      {originalSlug && logicModalIndex !== null && (
        <LogicRuleModal
          open
          onClose={() => setLogicModalIndex(null)}
          funnelSlug={originalSlug}
          sourceIndex={logicModalIndex}
          questions={state.questions}
          rules={logicRules}
          onSaved={reloadLogicRules}
        />
      )}
    </>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

// Aufgabe 59: Fokus-Overlay für den Test-Modus — legt sich über eine Seitenleiste
// (dunkel + leichter Blur), damit klar ist, dass gerade ein Durchlauf läuft.
// Klick beendet den Test (zurück zum Editor, gleiche Wirkung wie der Toggle-Button).
function TestModeOverlay({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Test beenden — zurück zum Editor"
      aria-label="Test beenden — zurück zum Editor"
      className="absolute inset-0 z-30 cursor-pointer bg-gray-900/30 backdrop-blur-[2px] dark:bg-black/50"
    />
  );
}

function NamePromptModal({
  pendingName,
  setPendingName,
  onConfirm,
  onCancel,
}: {
  pendingName: string;
  setPendingName: (s: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <EditorModal
      open
      onClose={onCancel}
      dismissible={false}
      scope="Neuer Funnel"
      title="Wie soll dein neuer Funnel heißen?"
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!pendingName.trim()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Funnel anlegen
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Der Name ist nur für dich zur Wiedererkennung. Endkunden sehen ihn nicht. Du kannst ihn später jederzeit ändern.
      </p>
      <input
        type="text"
        value={pendingName}
        onChange={(e) => setPendingName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="z. B. Solar-Anfrage Frühling 2026"
        autoFocus
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
      />
    </EditorModal>
  );
}

function ExitModal({
  onCancel,
  onDiscard,
  onSave,
}: {
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <EditorModal
      open
      onClose={onCancel}
      scope="Editor verlassen"
      title="Ungespeicherte Änderungen"
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Verwerfen
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Speichern
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
          <TriangleAlert size={18} className="text-amber-500" />
        </div>
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Du hast Änderungen vorgenommen, die noch nicht gespeichert wurden.
        </p>
      </div>
    </EditorModal>
  );
}
