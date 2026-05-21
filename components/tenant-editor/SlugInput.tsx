"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toSlug } from "@/lib/editorUtils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  originalSlug?: string; // gesetzt im Edit-Modus — kein API-Call wenn unverändert
  onStatusChange?: (status: "idle" | "checking" | "available" | "taken") => void;
}

export function SlugInput({ value, onChange, originalSlug, onStatusChange }: Props) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(raw: string) {
    const slugified = toSlug(raw).slice(0, 60);
    onChange(slugified);
  }

  useEffect(() => {
    if (!value || value.length < 3) {
      setStatus("idle");
      onStatusChange?.("idle");
      return;
    }

    // Im Edit-Modus: wenn Wert = originalSlug → direkt verfügbar, kein API-Call
    if (originalSlug && value === originalSlug) {
      setStatus("available");
      onStatusChange?.("available");
      return;
    }

    setStatus("checking");
    onStatusChange?.("checking");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tenant/slug-check?slug=${encodeURIComponent(value)}`);
        const json = await res.json();
        const next = json.available ? "available" : "taken";
        setStatus(next);
        onStatusChange?.(next);
      } catch {
        setStatus("idle");
        onStatusChange?.("idle");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, originalSlug, onStatusChange]);

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        URL-Slug
      </p>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="mein-funnel"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 pr-9 font-mono transition"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && (
            <Loader2 size={15} className="animate-spin text-gray-400" />
          )}
          {status === "available" && (
            <CheckCircle size={15} className="text-green-500" />
          )}
          {status === "taken" && (
            <XCircle size={15} className="text-red-500" />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        {status === "taken"
          ? "Dieser Slug ist bereits vergeben."
          : status === "available"
            ? "Verfügbar ✓"
            : `Dein Funnel ist erreichbar unter: /[slug]`}
      </p>
    </div>
  );
}
