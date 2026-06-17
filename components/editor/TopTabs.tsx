"use client";

import type { ReactNode } from "react";

export type TopTabKey = "content" | "logic" | "emails" | "webhooks" | "share";

interface TabDef {
  key: TopTabKey;
  label: string;
}

const TABS: TabDef[] = [
  // Aufgabe 45: Inhalt + Design in einem Tab „Bearbeiten" (Design via Slide-in, Aufgabe 74).
  { key: "content", label: "Bearbeiten" },
  // Aufgabe 59: Logic-Map — read-only Übersicht der Logik-Sprünge.
  { key: "logic", label: "Logik" },
  // Aufgabe 41: E-Mails als 2. Action-Klasse (Webhook-Pattern wiederverwendet).
  { key: "emails", label: "E-Mails" },
  // Aufgabe 40: Webhooks als erste echte Action-Klasse.
  { key: "webhooks", label: "Webhooks" },
  // Aufgabe 43: Einbinden-Tab pro Funnel (Embed-Snippet + Conversion-Tracking + Anleitungen).
  { key: "share", label: "Einbinden" },
];

interface Props {
  active: TopTabKey;
  onChange: (tab: TopTabKey) => void;
}

export function TopTabs({ active, onChange }: Props) {
  return (
    // Segmented-Control: zentrierbar in der Editor-Top-Bar, aktiver Tab als weiße Pille.
    <nav className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
      {TABS.map((tab) => (
        <TabButton key={tab.key} active={active === tab.key} onClick={() => onChange(tab.key)}>
          {tab.label}
        </TabButton>
      ))}
    </nav>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const base =
    "relative inline-flex cursor-pointer items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
  const state = active
    ? "bg-white text-primary shadow-sm dark:bg-gray-900 dark:text-primary"
    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
  return (
    <button type="button" onClick={onClick} className={`${base} ${state}`}>
      {children}
    </button>
  );
}
