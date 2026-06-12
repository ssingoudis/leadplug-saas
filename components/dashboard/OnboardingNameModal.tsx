"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

// Aufgabe 67: Erst-Login-Onboarding — fragt einmalig den Kontonamen ab.
// Wird vom Dashboard-Layout gerendert, solange tenants.company_name leer ist
// (die Auto-Tenant-Anlage setzt seit Aufgabe 67 KEINEN Verlegenheits-Namen mehr
// aus dem E-Mail-Localpart). Bewusst nicht wegklickbar: ein Feld, fünf Sekunden,
// und Navigation/Mails zeigen nie wieder einen technischen Platzhalter-Namen.
// Speicherpfad identisch zur Konto-Seite: UPDATE tenants via User-Client (RLS).

export default function OnboardingNameModal({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSave() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || status === "saving") return;
    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase
      .from("tenants")
      .update({ company_name: trimmed.slice(0, 80) })
      .eq("id", tenantId);
    if (error) {
      console.error("[OnboardingNameModal] update failed:", error.message);
      setStatus("error");
      return;
    }
    // Server-Layout neu laden — company_name ist jetzt gesetzt, das Modal verschwindet.
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kontoname festlegen"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
      >
        <p className="text-base font-semibold text-gray-900 dark:text-white">
          Kontoname festlegen
        </p>
        <p className="mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">
          Der Name erscheint in der Navigation und in Benachrichtigungen.
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          maxLength={80}
          autoFocus
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />

        {status === "error" && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Speichern fehlgeschlagen — bitte erneut versuchen.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Jederzeit in den Konto-Einstellungen änderbar.
          </p>
          <Button onClick={handleSave} disabled={name.trim().length < 2 || status === "saving"}>
            {status === "saving" ? "Speichert…" : "Speichern"}
          </Button>
        </div>
      </div>
    </div>
  );
}
