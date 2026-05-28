"use client";

import type { ReactNode } from "react";

export type TopTabKey = "content" | "design" | "logic" | "emails" | "share";

interface TabDef {
  key: TopTabKey;
  label: string;
  badge?: string;
  disabled: boolean;
}

const TABS: TabDef[] = [
  { key: "content", label: "Inhalt", disabled: false },
  { key: "design", label: "Design", disabled: true },
  { key: "logic", label: "Logik", badge: "bald", disabled: true },
  { key: "emails", label: "E-Mails", disabled: true },
  { key: "share", label: "Einbinden", disabled: true },
];

interface Props {
  active: TopTabKey;
  onChange: (tab: TopTabKey) => void;
}

export function TopTabs({ active, onChange }: Props) {
  return (
    <nav className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4">
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
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
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
    "relative inline-flex items-center px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2";
  const state = active
    ? "border-primary text-gray-900 dark:text-white"
    : disabled
      ? "border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed"
      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer";
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`${base} ${state}`}>
      {children}
    </button>
  );
}
