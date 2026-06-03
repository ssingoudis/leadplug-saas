"use client";

import type { ReactNode } from "react";

export type TopTabKey = "content" | "logic" | "emails" | "webhooks" | "share";

interface TabDef {
  key: TopTabKey;
  label: string;
  badge?: string;
  disabled: boolean;
}

const TABS: TabDef[] = [
  // Aufgabe 45: Inhalt + Design in einem Tab „Bearbeiten" (Inspektor-Umschalter rechts).
  { key: "content", label: "Bearbeiten", disabled: false },
  { key: "logic", label: "Logik", badge: "bald", disabled: true },
  // Aufgabe 41: E-Mails als 2. Action-Klasse (Webhook-Pattern wiederverwendet).
  { key: "emails", label: "E-Mails", disabled: false },
  // Aufgabe 40: Webhooks als erste echte Action-Klasse.
  { key: "webhooks", label: "Webhooks", disabled: false },
  // Aufgabe 43: Einbinden-Tab pro Funnel (Embed-Snippet + Conversion-Tracking + Anleitungen).
  { key: "share", label: "Einbinden", disabled: false },
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
        <TabButton
          key={tab.key}
          active={active === tab.key}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.key)}
          title={tab.disabled ? "Bald verfügbar" : undefined}
        >
          {tab.label}
          {tab.badge && (
            <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              {tab.badge}
            </span>
          )}
        </TabButton>
      ))}
    </nav>
  );
}

interface TabButtonProps {
  children: ReactNode;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  title?: string;
}

function TabButton({ children, active, disabled, onClick, title }: TabButtonProps) {
  const base =
    "relative inline-flex items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
  const state = active
    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
    : disabled
      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer";
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`${base} ${state}`}>
      {children}
    </button>
  );
}
