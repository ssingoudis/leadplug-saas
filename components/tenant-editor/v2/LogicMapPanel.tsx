"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EyeOff, Info, ListPlus, Maximize, Minus, Pencil, Play, Plus, Split, TriangleAlert } from "lucide-react";
import type { EditorQuestion, LogicRule } from "@/types";
import type { SelectedStep } from "./types";
import { questionMeta, SUCCESS_META, CUSTOM_META, WELCOME_META, type FieldMeta } from "./fieldMeta";
import { ruleConditionText } from "@/lib/logicDisplay";
import { EmptyState, PANEL_HEADER_H } from "./ui/Panel";

// =============================================================================
// Aufgabe 59 — Logic-Map: read-only Übersicht des Funnel-Flusses im „Logik"-Tab.
//
// Steps als Karten in horizontaler Kette (custom SVG, KEIN React Flow, keine
// neue Dependency), Sprung-Regeln aus Aufgabe 58 als Bézier-Bögen darüber.
// Vorwärts-only ⇒ alle Bögen laufen nach rechts, nie Kreuz-Chaos.
//
// Canvas-Verhalten (Polish-Runde nach Stavros-Review):
//   • Auto-Fit beim Öffnen — der ganze Funnel ist sofort sichtbar
//   • Drag-Pan mit Linksklick + Zoom via Strg/Cmd+Mausrad + Controls unten rechts
//   • Karten-Klick → öffnet das LogicRuleModal (Logik IST die Hauptaktion hier);
//     Stift-Icon (Hover) → springt in den „Bearbeiten"-Tab zum Step
//   • Karten-Hover hebt die eigenen Sprung-Bögen hervor, dimmt den Rest
//   • Bogen-Hover → eigener Tooltip mit Regel-Lesefassung (lib/logicDisplay)
//   • Fallback-Regeln gestrichelt · kaputte/rückwärtige Ziele amber
//
// Read-only by design (User-Entscheid): Kanten ziehen/editieren ist NICHT v1 —
// das Stufe-1-Modal bleibt der einzige Schreibweg. Kein DB-Zugriff: alle Daten
// (state.questions + logicRules) kommen aus dem EditorShell.
// =============================================================================

interface Props {
  questions: EditorQuestion[];
  rules: LogicRule[];
  selected: SelectedStep;
  onSelectStep: (step: SelectedStep) => void;
  onOpenLogic: (questionIndex: number) => void;
  /** Springt in den „Bearbeiten"-Tab und startet den Test-Modus — Logik bauen →
   *  sofort durchspielen ist der natürliche Workflow dieser Seite. */
  onStartTest?: () => void;
}

/* ─── Layout-Konstanten (px, unskaliert — Zoom skaliert per CSS-Transform) ─── */
const CARD_W = 210;
const CARD_H = 96;
const GAP = 72;
const PAD_X = 48;
const PAD_BOTTOM = 48;
// Bogen-Höhe: Basis + Zuwachs pro übersprungenem Step, hart gedeckelt.
const ARC_BASE_H = 40;
const ARC_SPAN_H = 22;
const ARC_MAX_H = 340;
// Lane-Stacking: kollidierende Bögen (überlappende Spanne, ähnliche Höhe) weichen nach oben aus.
const ARC_LANE_DY = 14;
// Start/Ende der Bögen leicht asymmetrisch auf der Karten-Oberkante — Abflug rechts,
// Ankunft links der Mitte. Entzerrt Karten, die zugleich Quelle und Ziel sind.
const ARC_FROM_X = 0.62;
const ARC_TO_X = 0.38;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.75;

interface MapNode {
  key: string;
  kind: "welcome" | "step" | "end";
  /** Index in der Karten-Kette (Layout-Position). */
  nodeIndex: number;
  /** Index in state.questions — für Selektion + Modal. undefined beim Ende-Node. */
  questionIndex?: number;
  number: number | null;
  title: string;
  meta: FieldMeta;
  dbId?: string;
  hidden: boolean;
  ruleCount: number;
}

interface MapArc {
  id: string;
  from: number; // nodeIndex Quelle
  to: number;   // nodeIndex Ziel (bei warn: der lineare Nachbar)
  height: number;
  dashed: boolean;        // Fallback („Alle anderen Fälle")
  tone: "jump" | "warn";  // warn = Ziel gelöscht oder (ungespeichert) rückwärts
  tooltip: string;
}

export function LogicMapPanel({ questions, rules, selected, onSelectStep, onOpenLogic, onStartTest }: Props) {
  const { nodes, arcs, arcAreaH } = useMemo(
    () => buildLayout(questions, rules),
    [questions, rules],
  );

  const totalW = PAD_X * 2 + nodes.length * CARD_W + Math.max(0, nodes.length - 1) * GAP;
  const totalH = arcAreaH + CARD_H + PAD_BOTTOM;
  const nodeX = (i: number) => PAD_X + i * (CARD_W + GAP);
  const midY = arcAreaH + CARD_H / 2;

  const hasSteps = questions.length > 0;
  const hasRules = arcs.length > 0;

  // Header-Kennzahlen: Schritte (ohne Welcome/Ende), Regeln, Regeln ohne Wirkung.
  const stepCount = nodes.filter((n) => n.kind === "step").length;
  const ruleCount = arcs.length;
  const warnCount = arcs.filter((a) => a.tone === "warn").length;

  /* ─── Zoom (CSS-Transform auf dem Inhalt, Scroll-Position wird mitgeführt) ─── */
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  const applyZoom = useCallback((next: number, center?: { x: number; y: number }) => {
    const vp = viewportRef.current;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    const prev = zoomRef.current;
    if (!vp || clamped === prev) return;
    // Zoom um den Cursor (bzw. die Viewport-Mitte): Scroll so nachführen, dass der
    // Punkt unter dem Anker stehen bleibt.
    const cx = center?.x ?? vp.clientWidth / 2;
    const cy = center?.y ?? vp.clientHeight / 2;
    const ratio = clamped / prev;
    const nextLeft = (vp.scrollLeft + cx) * ratio - cx;
    const nextTop = (vp.scrollTop + cy) * ratio - cy;
    zoomRef.current = clamped;
    setZoom(clamped);
    requestAnimationFrame(() => {
      const vp2 = viewportRef.current;
      if (vp2) {
        vp2.scrollLeft = nextLeft;
        vp2.scrollTop = nextTop;
      }
    });
  }, []);

  const fitView = useCallback((floor: number = MIN_ZOOM) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const fit = Math.min((vp.clientWidth - 64) / totalW, (vp.clientHeight - 64) / totalH, 1);
    const clamped = Math.max(floor, fit);
    zoomRef.current = clamped;
    setZoom(clamped);
    requestAnimationFrame(() => {
      const vp2 = viewportRef.current;
      if (vp2) {
        vp2.scrollLeft = Math.max(0, (totalW * clamped - vp2.clientWidth) / 2);
        vp2.scrollTop = 0;
      }
    });
  }, [totalW, totalH]);

  // Auto-Fit beim Öffnen des Tabs — der ganze Funnel sofort im Blick. Mit Lesbarkeits-
  // Untergrenze: lieber minimal pannen als Briefmarken-Karten (der explizite
  // „Alles einpassen"-Button fittet dagegen ohne Grenze).
  useLayoutEffect(() => {
    if (hasSteps) fitView(0.65);
    // bewusst nur beim Mount/Steps-Erscheinen — spätere Layout-Änderungen (Regel
    // gespeichert) sollen den Zoom des Users nicht zurücksetzen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSteps]);

  // Strg/Cmd + Mausrad = Zoom (auch Trackpad-Pinch). React-onWheel ist passiv →
  // preventDefault braucht einen manuellen non-passive Listener.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      applyZoom(zoomRef.current * Math.exp(-e.deltaY * 0.002), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [applyZoom, hasSteps]);

  /* ─── Drag-Pan mit Linksklick auf der Bühne (Karten/Controls ausgenommen) ─── */
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; sl: number; st: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    // Jede neue Interaktion auf der Bühne beendet den Warn-Fokus + sein Callout.
    setFocusArcId(null);
    setTip(null);
    if ((e.target as Element).closest?.("[data-map-stop-pan]")) return;
    const vp = viewportRef.current;
    if (!vp) return;
    panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
    setIsPanning(true);
    vp.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const p = panRef.current;
    const vp = viewportRef.current;
    if (!p || !vp || e.pointerId !== p.pointerId) return;
    vp.scrollLeft = p.sl - (e.clientX - p.startX);
    vp.scrollTop = p.st - (e.clientY - p.startY);
  }
  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (panRef.current?.pointerId !== e.pointerId) return;
    panRef.current = null;
    setIsPanning(false);
    viewportRef.current?.releasePointerCapture?.(e.pointerId);
  }

  /* ─── Hover-Emphasis + Tooltip + Warn-Fokus ─── */
  const [hoverArcId, setHoverArcId] = useState<string | null>(null);
  const [hoverNodeIdx, setHoverNodeIdx] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  // Klick auf den Warn-Chip fokussiert die betroffene Regel (zentrieren + hervorheben
  // + Erklär-Callout am Bogen) — bei mehreren springt jeder Klick zur nächsten.
  const [focusArcId, setFocusArcId] = useState<string | null>(null);
  const warnCycleRef = useRef(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const anyHover = hoverArcId !== null || hoverNodeIdx !== null || focusArcId !== null;

  const warnArcs = useMemo(() => arcs.filter((a) => a.tone === "warn"), [arcs]);

  function focusNextWarnArc() {
    const vp = viewportRef.current;
    if (!vp || warnArcs.length === 0) return;
    const arc = warnArcs[warnCycleRef.current % warnArcs.length];
    warnCycleRef.current += 1;
    // Auf lesbares Niveau zoomen (nie rauszoomen) und den Bogen-Scheitel zentrieren.
    const targetZoom = Math.max(zoomRef.current, 0.85);
    zoomRef.current = targetZoom;
    setZoom(targetZoom);
    const apexX = (nodeX(arc.from) + CARD_W * ARC_FROM_X + nodeX(arc.to) + CARD_W * ARC_TO_X) / 2;
    const apexY = arcAreaH - arc.height;
    requestAnimationFrame(() => {
      const vp2 = viewportRef.current;
      const content = contentRef.current;
      if (!vp2 || !content) return;
      vp2.scrollLeft = apexX * targetZoom - vp2.clientWidth / 2;
      vp2.scrollTop = (arcAreaH + CARD_H / 2) * targetZoom - vp2.clientHeight / 2;
      setFocusArcId(arc.id);
      // Callout am Scheitel platzieren — über die echte Wrapper-Position (m-auto-Zentrierung
      // + Scroll sind damit automatisch berücksichtigt).
      const rect = content.getBoundingClientRect();
      setTip({ x: rect.left + apexX * targetZoom, y: rect.top + apexY * targetZoom, text: arc.tooltip });
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Kopfzeile — gleiche Höhe/Optik wie alle anderen Editor-Panes (PANEL_HEADER_H).
          Kein Anleitungs-Satz (Interaktionen erklären sich selbst) — stattdessen
          Nutzwert: Kennzahlen + Warn-Chip + Test-Einstieg (Stavros-Review). */}
      <div className={`${PANEL_HEADER_H} justify-between bg-white dark:bg-gray-900`}>
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="shrink-0 text-sm font-bold text-gray-900 dark:text-white">Logik-Übersicht</h2>
          {hasSteps && (
            <span className="hidden shrink-0 text-xs text-gray-500 dark:text-gray-400 sm:inline">
              {stepCount} {stepCount === 1 ? "Schritt" : "Schritte"} · {ruleCount} {ruleCount === 1 ? "Regel" : "Regeln"}
            </span>
          )}
          {warnCount > 0 && (
            <button
              type="button"
              onClick={focusNextWarnArc}
              title={
                warnCount === 1
                  ? "Klicken zeigt die betroffene Regel auf der Karte — Ziel gelöscht, ausgeblendet oder vor dem Schritt."
                  : "Klicken springt nacheinander zu den betroffenen Regeln — Ziel gelöscht, ausgeblendet oder vor dem Schritt."
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
            >
              <TriangleAlert size={12} strokeWidth={2.5} />
              {warnCount} {warnCount === 1 ? "Regel" : "Regeln"} ohne Wirkung — anzeigen
            </button>
          )}
        </div>
        {onStartTest && hasSteps && (
          <button
            type="button"
            onClick={onStartTest}
            title="Funnel im Test-Modus durchspielen — die Sprünge laufen wie im Live-Widget"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Play size={12} fill="currentColor" />
            Funnel testen
          </button>
        )}
      </div>

      {!hasSteps ? (
        <div className="flex flex-1 items-center justify-center bg-gray-100 p-8 dark:bg-background">
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <EmptyState
              icon={<ListPlus size={22} />}
              title="Noch keine Schritte"
              description={'Füge im Tab „Bearbeiten" Fragen hinzu — danach siehst du hier den Ablauf deines Funnels.'}
            />
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Hinweis-Banner solange keine Regeln existieren — die Kette ist trotzdem sichtbar. */}
          {!hasRules && (
            <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
              <div className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs leading-relaxed text-gray-600 shadow-lg ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                <Info size={14} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong>Noch keine Sprung-Regeln</strong> — dein Funnel läuft Schritt für Schritt von links nach rechts.
                  Klicke auf einen Schritt, um die erste Regel anzulegen (z.&nbsp;B. „bei Antwort B direkt zu Schritt 5").
                </span>
              </div>
            </div>
          )}

          {/* Bühne: Drag-Pan + Zoom, Punktraster wie die Editor-Default-Bühne. */}
          <div
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            // Scrollbalken bleiben sichtbar (Stavros-Entscheid: Orientierungs-Anker, kein
            // Verstecken) — aber schmal + dezent gestylt statt klobigem OS-Default.
            className={`flex flex-1 touch-none select-none overflow-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600 bg-gray-100 bg-[radial-gradient(circle,rgba(17,24,39,0.06)_1px,transparent_1px)] bg-size-[18px_18px] dark:bg-background dark:bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] ${
              isPanning ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {/* Größen-Wrapper trägt die skalierten Maße (korrekte Scrollbars + Zentrierung),
                der innere Layer rendert unskaliert und wird per transform gezoomt. */}
            <div ref={contentRef} className="m-auto shrink-0" style={{ width: totalW * zoom, height: totalH * zoom }}>
              <div
                className="relative"
                style={{ width: totalW, height: totalH, transform: `scale(${zoom})`, transformOrigin: "0 0" }}
              >
                {/* Kanten-Layer — pointer-events nur auf den Bogen-Hitzonen (Tooltip). */}
                <svg
                  width={totalW}
                  height={totalH}
                  className="pointer-events-none absolute inset-0"
                  role="img"
                  aria-label="Logik-Übersicht des Funnels"
                >
                  <defs>
                    <ArrowMarker id="lp-arrow-gray" fill="#9ca3af" />
                    <ArrowMarker id="lp-arrow-emerald" fill="#10b981" />
                    <ArrowMarker id="lp-arrow-amber" fill="#f59e0b" />
                  </defs>

                  {/* Standard-Fluss: gerade graue Kante zwischen Nachbarn. */}
                  {nodes.slice(0, -1).map((n) => (
                    <line
                      key={`flow-${n.key}`}
                      x1={nodeX(n.nodeIndex) + CARD_W}
                      y1={midY}
                      x2={nodeX(n.nodeIndex + 1) - 7}
                      y2={midY}
                      strokeWidth={1.5}
                      markerEnd="url(#lp-arrow-gray)"
                      className="stroke-gray-300 dark:stroke-gray-700"
                      opacity={anyHover ? 0.45 : 1}
                    />
                  ))}

                  {/* Sprung-Bögen oberhalb der Kette. Hover (Bogen oder Quell-Karte)
                      hebt hervor und dimmt den Rest. */}
                  {arcs.map((arc) => {
                    const sx = nodeX(arc.from) + CARD_W * ARC_FROM_X;
                    const tx = nodeX(arc.to) + CARD_W * ARC_TO_X;
                    const y0 = arcAreaH;
                    const yh = arcAreaH - arc.height;
                    const d = `M ${sx} ${y0} C ${sx} ${yh}, ${tx} ${yh}, ${tx} ${y0 - 2}`;
                    const stroke = arc.tone === "warn" ? "#f59e0b" : "#10b981";
                    const marker = arc.tone === "warn" ? "url(#lp-arrow-amber)" : "url(#lp-arrow-emerald)";
                    const emphasized =
                      hoverArcId === arc.id || hoverNodeIdx === arc.from || focusArcId === arc.id;
                    return (
                      <g key={arc.id}>
                        <path
                          d={d}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={emphasized ? 2.75 : 1.75}
                          // Konsistenz zur Legende (Stavros-Befund): „kaputt" überstimmt den
                          // Fallback-Stil — Regeln ohne Wirkung sind IMMER durchgezogen amber,
                          // egal welcher Regel-Typ. Das Warum steht im Tooltip.
                          strokeDasharray={arc.dashed && arc.tone !== "warn" ? "6 4" : undefined}
                          markerEnd={marker}
                          opacity={anyHover ? (emphasized ? 1 : 0.15) : 0.9}
                          className="transition-[opacity,stroke-width] duration-150"
                        />
                        {/* unsichtbare breite Hitzone für den Hover-Tooltip */}
                        <path
                          d={d}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={16}
                          pointerEvents="stroke"
                          className="cursor-help"
                          onMouseEnter={(e) => {
                            setHoverArcId(arc.id);
                            setTip({ x: e.clientX, y: e.clientY, text: arc.tooltip });
                          }}
                          onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, text: arc.tooltip })}
                          onMouseLeave={() => {
                            setHoverArcId(null);
                            setTip(null);
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Karten-Layer */}
                {nodes.map((node) => (
                  <StepCard
                    key={node.key}
                    node={node}
                    x={nodeX(node.nodeIndex)}
                    y={arcAreaH}
                    selected={
                      node.kind === "end"
                        ? selected.kind === "success"
                        : selected.kind === "question" && selected.questionIndex === node.questionIndex
                    }
                    onOpenLogic={
                      node.kind === "step" && node.dbId
                        ? () => onOpenLogic(node.questionIndex!)
                        : undefined
                    }
                    onNavigate={() =>
                      onSelectStep(
                        node.kind === "end"
                          ? { kind: "success" }
                          : { kind: "question", questionIndex: node.questionIndex! },
                      )
                    }
                    onHover={(hovering) => setHoverNodeIdx(hovering ? node.nodeIndex : null)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Zoom-Controls (unten rechts, Figma-Muster). bottom-6: lässt dem schmalen
              Scrollbalken Platz, sodass der sichtbare Abstand der linken Marge entspricht. */}
          <div className="absolute bottom-6 right-4 z-10 flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-900">
            <ZoomButton label="Rauszoomen" onClick={() => applyZoom(zoomRef.current / 1.2)}>
              <Minus size={14} />
            </ZoomButton>
            <button
              type="button"
              onClick={() => applyZoom(1)}
              title="Auf 100 % zurücksetzen"
              className="w-12 rounded-lg px-1 py-1.5 text-center text-xs font-semibold tabular-nums text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {Math.round(zoom * 100)}%
            </button>
            <ZoomButton label="Reinzoomen" onClick={() => applyZoom(zoomRef.current * 1.2)}>
              <Plus size={14} />
            </ZoomButton>
            <span className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
            <ZoomButton label="Alles einpassen" onClick={() => fitView()}>
              <Maximize size={13} />
            </ZoomButton>
          </div>

          {/* Klartext-Legende (unten links) — nur wenn es etwas zu erklären gibt. */}
          {hasRules && (
            <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white/95 px-3.5 py-2.5 text-[11px] text-gray-600 shadow-lg ring-1 ring-black/5 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-300">
              <LegendItem swatch={<LegendLine className="stroke-gray-400" straight />} label="Standard-Ablauf (der Reihe nach)" />
              <LegendItem swatch={<LegendLine className="stroke-emerald-500" />} label="Sprung bei passender Antwort" />
              <LegendItem swatch={<LegendLine className="stroke-emerald-500" dashed />} label="Sprung für alle anderen Antworten" />
              <LegendItem swatch={<LegendLine className="stroke-amber-500" />} label="Regel ohne Wirkung — Hover am Bogen erklärt warum" />
            </div>
          )}

          {/* Eigener Tooltip (sofort, gestylt) statt nativem title-Tooltip. */}
          {tip && (
            <div
              className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              style={{
                left: Math.min(tip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 300),
                top: tip.y + 14,
              }}
            >
              {tip.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Layout-Berechnung (pure, useMemo-gecached)
   ───────────────────────────────────────────────────────────────────────────── */

function buildLayout(
  questions: EditorQuestion[],
  rules: LogicRule[],
): { nodes: MapNode[]; arcs: MapArc[]; arcAreaH: number } {
  // Regel-Anzahl pro Quell-Page (für die „Logik"-Zeile an den Karten).
  const ruleCountByPageId: Record<string, number> = {};
  for (const r of rules) {
    ruleCountByPageId[r.sourcePageId] = (ruleCountByPageId[r.sourcePageId] ?? 0) + 1;
  }

  // Karten-Kette: alle Steps (inkl. Welcome + ausgeblendete) + „Ende"-Node.
  // Nummerierung wie StepList: Welcome zählt nicht mit.
  const nodes: MapNode[] = [];
  let number = 0;
  questions.forEach((q, qIdx) => {
    const isWelcome = q.kind === "welcome";
    if (!isWelcome) number++;
    nodes.push({
      key: q._id,
      kind: isWelcome ? "welcome" : "step",
      nodeIndex: nodes.length,
      questionIndex: qIdx,
      number: isWelcome ? null : number,
      title: q.title,
      meta: isWelcome ? WELCOME_META : q.kind === "custom" ? CUSTOM_META : questionMeta(q.questionType),
      dbId: q.dbId,
      hidden: q.visible === false,
      ruleCount: q.dbId ? (ruleCountByPageId[q.dbId] ?? 0) : 0,
    });
  });
  const endIdx = nodes.length;
  nodes.push({
    key: "__end__",
    kind: "end",
    nodeIndex: endIdx,
    questionIndex: undefined,
    number: null,
    title: "Ende",
    meta: SUCCESS_META,
    hidden: false,
    ruleCount: 0,
  });

  const nodeByDbId = new Map<string, number>();
  for (const n of nodes) {
    if (n.dbId) nodeByDbId.set(n.dbId, n.nodeIndex);
  }

  // Bögen: pro Regel ein Bogen. Quelle ohne Karte (Step im Editor gelöscht, noch
  // nicht gespeichert) → Regel hat keinen Ankerpunkt, wird nicht gezeichnet.
  const arcs: MapArc[] = [];
  const placed: Array<{ from: number; to: number; h: number }> = [];
  const sorted = [...rules].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const r of sorted) {
    const from = nodeByDbId.get(r.sourcePageId);
    if (from === undefined) continue;
    const sourceQ = questions[nodes[from].questionIndex!];
    if (!sourceQ) continue;

    const condText = ruleConditionText(sourceQ, r);
    let to: number;
    let tone: MapArc["tone"];
    let tooltip: string;

    if (r.targetType === "end") {
      to = endIdx;
      tone = "jump";
      tooltip = `${condText} → Ende`;
    } else {
      const targetIdx = r.targetPageId ? nodeByDbId.get(r.targetPageId) : undefined;
      if (targetIdx === undefined) {
        // Ziel-Page gelöscht (target_page_id SET NULL oder Step im Editor entfernt).
        to = Math.min(from + 1, endIdx);
        tone = "warn";
        tooltip = `${condText} → Ziel gelöscht — es geht stattdessen linear weiter.`;
      } else if (targetIdx <= from) {
        // Ungespeicherte Umsortierung: Ziel liegt (jetzt) vor der Quelle.
        // Die Runtime degradiert Rückwärts-Sprünge zu „weiter" — genau das zeigen wir.
        to = Math.min(from + 1, endIdx);
        tone = "warn";
        const targetNum = nodes[targetIdx].number;
        tooltip = `${condText} → Schritt ${targetNum ?? "?"} — Ziel liegt jetzt vor diesem Schritt, die Regel wird ignoriert (es geht linear weiter).`;
      } else if (nodes[targetIdx].hidden) {
        // Aufgabe 59: ausgeblendetes Ziel — fliegt live aus visibleQuestions,
        // die Runtime findet es nicht und geht linear weiter.
        to = targetIdx;
        tone = "warn";
        tooltip = `${condText} → Schritt ${nodes[targetIdx].number ?? "?"} — das Ziel ist ausgeblendet, der Sprung wird ignoriert (es geht linear weiter).`;
      } else {
        to = targetIdx;
        tone = "jump";
        tooltip = `${condText} → Schritt ${nodes[targetIdx].number ?? "?"}`;
      }
    }

    // Aufgabe 59: ausgeblendeter Quell-Schritt — wird live nie besucht, seine Regeln
    // laufen nicht. Überstimmt jede Ziel-Bewertung.
    if (nodes[from].hidden) {
      tone = "warn";
      tooltip = `${condText} — dieser Schritt ist ausgeblendet, die Regel läuft im Funnel nicht.`;
    }

    // Bogen-Höhe ∝ Sprungdistanz + Lane-Stacking bei Kollision (überlappende
    // Spanne mit ähnlicher Höhe → eine Lane nach oben ausweichen).
    const span = to - from;
    let h = Math.min(ARC_BASE_H + Math.max(0, span - 1) * ARC_SPAN_H, ARC_MAX_H);
    let guard = 24;
    while (
      guard-- > 0 &&
      h < ARC_MAX_H &&
      placed.some(
        (p) => Math.max(p.from, from) < Math.min(p.to, to) && Math.abs(p.h - h) < ARC_LANE_DY,
      )
    ) {
      h += ARC_LANE_DY;
    }
    placed.push({ from, to, h });

    arcs.push({
      id: r.id,
      from,
      to,
      height: h,
      dashed: r.isFallback,
      tone,
      tooltip,
    });
  }

  const maxH = arcs.reduce((m, a) => Math.max(m, a.height), 0);
  // Ohne Bögen reicht ein schmaler Luftraum über den Karten.
  const arcAreaH = Math.max(56, maxH + 32);

  return { nodes, arcs, arcAreaH };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-Komponenten
   ───────────────────────────────────────────────────────────────────────────── */

function StepCard({
  node,
  x,
  y,
  selected,
  onOpenLogic,
  onNavigate,
  onHover,
}: {
  node: MapNode;
  x: number;
  y: number;
  selected: boolean;
  /** Nur für gespeicherte Frage-/Karten-Steps — öffnet das LogicRuleModal. */
  onOpenLogic?: () => void;
  onNavigate: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const isStep = node.kind === "step";
  const unsaved = isStep && !node.dbId;
  // Hauptaktion der Karte: Steps → Logik bearbeiten (DAS macht man auf dieser Seite);
  // Welcome/Ende haben keine Logik → Klick öffnet sie im Bearbeiten-Tab.
  const primaryAction = onOpenLogic ?? (unsaved ? undefined : onNavigate);
  const primaryTitle = onOpenLogic
    ? node.ruleCount > 0
      ? "Sprung-Logik dieses Schritts bearbeiten"
      : "Sprung-Logik für diesen Schritt anlegen"
    : unsaved
      ? "Bitte den Funnel zuerst speichern — dann lassen sich hier Regeln anlegen."
      : "Im Editor öffnen";

  return (
    <div
      data-map-stop-pan
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`group absolute flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
        selected
          ? "border-primary bg-primary/5 dark:border-primary dark:bg-primary/10"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      } ${node.hidden ? "opacity-60" : ""}`}
      style={{ left: x, top: y, width: CARD_W, height: CARD_H }}
    >
      <button
        type="button"
        disabled={!primaryAction}
        onClick={primaryAction}
        title={primaryTitle}
        className={`flex h-full w-full flex-col text-left ${!primaryAction ? "cursor-not-allowed" : ""}`}
      >
        {/* items-center: Icon-Pille vertikal mittig zum zweizeiligen Textblock (Stavros-Review). */}
        <span className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5">
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${node.meta.pillClass}`}
          >
            {node.meta.icon}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {node.number != null ? `${node.number} · ${node.meta.label}` : node.meta.label}
              {node.hidden && <EyeOff size={11} className="shrink-0" aria-label="Ausgeblendet" />}
            </span>
            <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
              {node.title || <span className="text-gray-400 dark:text-gray-500">Unbenannt</span>}
            </span>
          </span>
        </span>

        {/* Status-Zeile: zeigt den Logik-Stand des Steps (die ganze Karte ist die Klickfläche). */}
        {isStep && (
          <span
            className={`flex h-8 shrink-0 items-center justify-center gap-1.5 border-t text-[11px] font-semibold transition-colors ${
              unsaved
                ? "border-gray-100 text-gray-300 dark:border-gray-700/60 dark:text-gray-600"
                : node.ruleCount > 0
                  ? "border-emerald-100 bg-emerald-50/60 text-emerald-700 group-hover:bg-emerald-100 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300 dark:group-hover:bg-emerald-900/40"
                  : "border-gray-100 text-gray-400 group-hover:bg-gray-50 group-hover:text-primary dark:border-gray-700/60 dark:text-gray-500 dark:group-hover:bg-gray-700/40"
            }`}
          >
            <Split size={11} strokeWidth={2.5} />
            {unsaved
              ? "Erst speichern"
              : node.ruleCount > 0
                ? `${node.ruleCount} ${node.ruleCount === 1 ? "Regel" : "Regeln"}`
                : "Logik hinzufügen"}
          </span>
        )}
      </button>

      {/* Sekundär-Aktion (Hover): Stift springt in den „Bearbeiten"-Tab zum Step. */}
      {isStep && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          title={'Inhalt im „Bearbeiten"-Tab öffnen'}
          aria-label="Schritt im Bearbeiten-Tab öffnen"
          className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 opacity-0 shadow-sm transition-opacity hover:text-gray-700 group-hover:opacity-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function ArrowMarker({ id, fill }: { id: string; fill: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 8 8"
      refX="7"
      refY="4"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M 0 0.5 L 7.5 4 L 0 7.5 Z" fill={fill} />
    </marker>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {swatch}
      {label}
    </span>
  );
}

function LegendLine({
  className,
  dashed,
  straight,
}: {
  className: string;
  dashed?: boolean;
  straight?: boolean;
}) {
  return (
    <svg width="22" height="8" aria-hidden="true" className="shrink-0">
      <path
        d={straight ? "M 1 4 L 21 4" : "M 1 6 C 6 1, 16 1, 21 6"}
        fill="none"
        strokeWidth={1.75}
        strokeDasharray={dashed ? "4 3" : undefined}
        className={className}
      />
    </svg>
  );
}
