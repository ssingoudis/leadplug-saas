"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function SectionAccordion({ title, isOpen, onToggle, children }: Props) {
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-gray-400 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6 space-y-4">{children}</div>
      )}
    </div>
  );
}
