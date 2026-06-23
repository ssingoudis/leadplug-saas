import type { FunnelTheme, FunnelConfig, QuestionConfig, LogicRule } from "@/types";

// Props-Vertrag der Funnel-Widget-Komponente. Beide Consumer setzen Teilmengen:
// TenantFunnelClient (Live) und CenterCanvas (Editor, 3 Modi via editMode/isTestMode).
export interface FunnelProps {
  theme?: Partial<FunnelTheme>;
  funnel: FunnelConfig;
  questions: QuestionConfig[];
  initialSubmitted?: boolean;
  initialStep?: number;
  previewHighlight?: string; // Editor-only: hebt das gerade bearbeitete Element hervor
  initialAnswers?: Record<string, string>; // Editor-only: Platzhalter-Antworten für Erfolgsseiten-Preview
  onFieldClick?: (field: string, questionVisibleIndex?: number) => void; // Editor-only: Klick im Preview → Sidebar-Feld fokussieren
  onStepChange?: (mode: "question" | "contact" | "success", index: number) => void; // Editor-only: Test-Modus reflektiert den aktuellen Schritt in der Step-Navigation
  // editMode=true: Texte werden contentEditable + alle Step-Advance-Handler short-circuited.
  editMode?: boolean;
  onTextChange?: (fieldRef: string, newText: string) => void; // Editor-only: Inline-Edit committed → State-Update durchreichen
  // Editor-Canvas-Aktionen für die Choice-Options der aktuellen Frage.
  onAddOption?: () => void;
  onReorderOptions?: (fromIdx: number, toIdx: number) => void;
  onDuplicateOption?: (idx: number) => void;
  onDeleteOption?: (idx: number) => void;
  // Partial-Submissions: debounced bei answers-Änderung → /api/track-progress (Live).
  // contact ist immer {} (Lead-Daten kommen aus den Karten-Antworten).
  onAnswersChange?: (data: { answers: Record<string, string>; contact: Record<string, string> }) => void;
  // Nach jedem Step-Advance (mit pageId der verlassenen Page). Snapshot MUSS mit, sonst
  // überschreibt der Server-UPSERT existierende Daten mit {}. Triggert after_page-Webhooks.
  onPageAdvanced?: (pageId: string, snapshot: { answers: Record<string, string>; contact: Record<string, string> }) => void;
  onSubmit?: (data: {
    answers: Record<string, string>;
    contact: Record<string, string>;
    honeypot: string;
  }) => void;
  // Wenn gesetzt: Widget redirected nach Submit auf diese URL (statt Success-Page).
  redirectUrl?: string;
  // Leere Custom-Karte → Builder zeigt inline „+ Feld hinzufügen" im Canvas.
  onAddCustomFieldRequest?: () => void;
  // Logik-Sprünge (leer/undefined = linear). Auswertung beim Advance via lib/funnelLogic.
  logicRules?: LogicRule[];
}
