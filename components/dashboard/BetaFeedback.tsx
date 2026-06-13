"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, Check, Send, Paperclip } from "lucide-react";
import Button from "@/components/ui/Button";

// Aufgabe 67: Feedback-Kanal — Floating-Button unten rechts im Dashboard öffnet
// ein zentriertes Modal (Scrim mit Blur, Stavros-Vorgabe). Kategorie + Nachricht
// → POST /api/feedback (Mail an SUPPORT_EMAIL). Optional ein direkter WhatsApp-
// Draht (NEXT_PUBLIC_SUPPORT_WHATSAPP, internationale Ziffern ohne +).
// Im Vollbild-Editor (/edit) ausgeblendet — dort würde der Button die
// Editor-Aktionsleisten überlagern.

const CATEGORIES = [
  { key: "feedback", label: "Feedback" },
  { key: "problem", label: "Problem" },
  { key: "frage", label: "Frage" },
] as const;
type CategoryKey = (typeof CATEGORIES)[number]["key"];

// Build-time inlined (NEXT_PUBLIC_) — nur Ziffern behalten, falls formatiert eingetragen.
const WHATSAPP_DIGITS = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");

// Optionaler Datei-Anhang (Aufgabe 69) — bleibt im Nur-Mail-Modell (Resend-Anhang,
// keine Storage). Bis zu 3 Dateien, zusammen ≤ 4 MB (sicher unter Vercels ~4,5 MB
// Body-Limit). Server prüft Anzahl/Typ/Größe erneut.
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "application/pdf": ".pdf",
};
const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // 4 MB gesamt

interface BetaFeedbackProps {
  // Füllen die WhatsApp-Nachricht vor (wa.me ?text= — der Nutzer sieht den Text
  // vor dem Absenden im Chat und kann ihn ändern; nichts wird heimlich gesendet).
  userEmail?: string;
  accountName?: string;
}

export default function BetaFeedback({ userEmail = "", accountName = "" }: BetaFeedbackProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CategoryKey>("feedback");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vollbild-Editor: Button stört die Bottom-Aktionen → ausblenden.
  if (pathname?.endsWith("/edit")) return null;

  function handleOpen() {
    setStatus("idle");
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setStatus("idle");
    setFiles([]);
    setFileError(null);
  }

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // erlaubt erneutes Wählen derselben Datei
    if (picked.length === 0) return;
    const combined = [...files, ...picked];
    if (combined.some((f) => !ALLOWED_TYPES[f.type])) {
      setFileError("Nur PNG, JPG oder PDF.");
      return;
    }
    if (combined.length > MAX_FILES) {
      setFileError(`Höchstens ${MAX_FILES} Dateien.`);
      return;
    }
    if (combined.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) {
      setFileError("Anhänge zusammen zu groß (max. 4 MB).");
      return;
    }
    setFileError(null);
    setFiles(combined);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  }

  async function handleSubmit() {
    const text = message.trim();
    if (!text || status === "sending") return;
    setStatus("sending");
    try {
      // FormData statt JSON, damit der optionale Anhang mitreist (Browser setzt
      // den multipart-Boundary selbst — KEIN Content-Type-Header setzen).
      const form = new FormData();
      form.append("category", category);
      form.append("message", text);
      if (pathname) form.append("pagePath", pathname);
      for (const f of files) form.append("file", f);
      const res = await fetch("/api/feedback", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
      if (res.ok && data?.success) {
        setStatus("sent");
        setMessage("");
        setFiles([]);
        setFileError(null);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {open && (
        // Standard-Modal: zentriert, Scrim dunkel + geblurrt; Klick auf den Scrim schließt.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/40"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nachricht senden"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              {/* Titel bleibt — gibt dem Kopf visuelles Gewicht (Stavros-Entscheid). */}
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Nachricht senden
              </p>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Schließen"
                className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {status === "sent" ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check size={20} strokeWidth={2.5} />
                </span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Nachricht angekommen
                </p>
                <Button variant="primary" className="mt-3" onClick={handleClose}>
                  Schließen
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-3 flex gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className={
                        category === c.key
                          ? "flex-1 rounded-lg border border-primary bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary"
                          : "flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary dark:border-gray-700 dark:text-gray-400"
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  autoFocus
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />

                {/* Optionaler Anhang (Aufgabe 69) — bis zu 3 Screenshots/PDFs. */}
                <div className="mt-2 flex flex-col items-start gap-1.5 text-xs">
                  {files.map((f, i) => (
                    <span
                      key={`${f.name}-${i}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      <Paperclip size={12} className="shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label="Anhang entfernen"
                        className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {files.length < MAX_FILES && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
                      >
                        <Paperclip size={12} />
                        Datei anhängen
                      </button>
                      <span className="text-gray-400 dark:text-gray-500">PNG, JPG, PDF · bis zu 3, max. 4 MB gesamt</span>
                    </div>
                  )}
                </div>
                {fileError && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fileError}</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
                  onChange={handleFilesChange}
                  className="hidden"
                />

                {status === "error" && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Senden fehlgeschlagen — bitte später erneut versuchen
                    {WHATSAPP_DIGITS ? " oder direkt per WhatsApp melden" : ""}.
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  {WHATSAPP_DIGITS ? (
                    <a
                      // Wording-Styleguide: neutral, keine Anrede — nur die Kontext-Zeile,
                      // danach Leerzeile für den eigenen Text des Nutzers.
                      href={`https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(
                        `(Konto: ${accountName || "—"} · E-Mail: ${userEmail || "—"})\n\n`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
                    >
                      Oder per WhatsApp →
                    </a>
                  ) : (
                    <span />
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={!message.trim() || status === "sending"}
                  >
                    <Send size={14} />
                    {status === "sending" ? "Sendet…" : "Senden"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover"
      >
        <MessageSquare size={16} />
        Feedback
      </button>
    </>
  );
}
