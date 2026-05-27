"use client";

import { HelpCircle } from "lucide-react";
import type { EditorState } from "@/types";

interface Props {
  state: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
  onFocus: (field: string) => void;
}

function Label({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-1 mb-1.5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{children}</p>
      {tooltip && (
        <span title={tooltip} className="cursor-help text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
          <HelpCircle size={11} />
        </span>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition";

const FOOTER_ITEMS: Array<{
  key: "company" | "email" | "phone";
  label: string;
  stateKey: "footerCompanyName" | "footerEmail" | "footerPhone";
  inputPlaceholder: string;
  focusKey: "footer_company" | "footer_email" | "footer_phone";
}> = [
  { key: "company", label: "Firmenname",     stateKey: "footerCompanyName", inputPlaceholder: "z. B. Muster GmbH",        focusKey: "footer_company" },
  { key: "email",   label: "E-Mail-Adresse", stateKey: "footerEmail",       inputPlaceholder: "z. B. info@firma.de",      focusKey: "footer_email"   },
  { key: "phone",   label: "Telefonnummer",  stateKey: "footerPhone",       inputPlaceholder: "z. B. +49 123 456789",     focusKey: "footer_phone"   },
];

function buildFooterText(company: boolean, email: boolean, phone: boolean): string {
  return [
    company ? "{{company_name}}" : null,
    email ? "{{public_email}}" : null,
    phone ? "{{public_phone}}" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function SectionTexte({ state, onChange, onFocus }: Props) {
  const footerToggles = {
    company: state.footerText.includes("{{company_name}}"),
    email: state.footerText.includes("{{public_email}}"),
    phone: state.footerText.includes("{{public_phone}}"),
  };

  function handleFooterToggle(key: "company" | "email" | "phone") {
    const next = { ...footerToggles, [key]: !footerToggles[key] };
    onChange({ footerText: buildFooterText(next.company, next.email, next.phone) });
  }

  return (
    <div className="space-y-4">
      {/* Erfolgsseite */}
      <div>
        <Label tooltip="Wird als Überschrift auf der Erfolgsseite angezeigt, nachdem das Formular abgesendet wurde.">
          Erfolgs-Nachricht
        </Label>
        <input
          type="text"
          value={state.successMessage}
          onChange={(e) => onChange({ successMessage: e.target.value })}
          onFocus={() => onFocus("success_message")}
          data-field="success_message"
          placeholder="Vielen Dank! Wir melden uns in Kürze bei Ihnen."
          className={inputClass}
        />
      </div>

      <div>
        <Label tooltip="Zweiter Text auf der Erfolgsseite — z. B. wann du dich meldest.">
          Antwortzeit-Text
        </Label>
        <input
          type="text"
          value={state.responseMessage}
          onChange={(e) => onChange({ responseMessage: e.target.value })}
          onFocus={() => onFocus("response_message")}
          data-field="response_message"
          placeholder="Wir melden uns innerhalb von 24 Stunden."
          className={inputClass}
        />
      </div>

      <div>
        <Label tooltip="Überschrift über der Zusammenfassung der Antworten auf der Erfolgsseite.">
          Überschrift Antwort-Übersicht
        </Label>
        <input
          type="text"
          value={state.answersOverviewLabel}
          onChange={(e) => onChange({ answersOverviewLabel: e.target.value })}
          onFocus={() => onFocus("answers_overview_label")}
          data-field="answers_overview_label"
          placeholder="Ihre Angaben im Überblick:"
          className={inputClass}
        />
      </div>

      {/* E-Mail-Einstellungen */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          E-Mail-Einstellungen
        </p>

        <div>
          <Label tooltip="Pflichtfeld. Neue Leads werden an diese Adresse gesendet.">
            Benachrichtigungs-E-Mail
          </Label>
          <input
            type="email"
            value={state.notificationEmail}
            onChange={(e) => onChange({ notificationEmail: e.target.value })}
            onFocus={() => onFocus("email_notification")}
            data-field="email_notification"
            placeholder="z. B. anfragen@meinefirma.de"
            className={inputClass}
          />
        </div>

        <div>
          <Label tooltip="Lokalteil der Absender-E-Mail-Adresse (vor dem @). Z. B. 'anfragen' → anfragen@leadplug.de. Leer lassen = Standard-Absender.">
            Absender-Adresse (Lokalteil)
          </Label>
          <input
            type="text"
            value={state.emailSenderLocal}
            onChange={(e) => onChange({ emailSenderLocal: e.target.value })}
            onFocus={() => onFocus("email_sender")}
            data-field="email_sender"
            placeholder="z. B. anfragen"
            className={inputClass}
          />
        </div>
      </div>

      {/* Kontaktdaten / Branding */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        <div>
          <Label tooltip="Diese Daten erscheinen als Text am unteren Rand des Widgets (auf jeder Seite), in der Bestätigungs-E-Mail an den Kunden sowie in der Lead-Benachrichtigung. Aktiviere, welche Angaben sichtbar sein sollen, und trage die Werte ein.">
            Kontaktdaten
          </Label>
          <div
            className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3"
            onFocus={() => onFocus("footer")}
            data-field="footer"
          >
            {FOOTER_ITEMS.map(({ key, label, stateKey, inputPlaceholder, focusKey }) => (
              <div key={key}>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={footerToggles[key]}
                    onChange={() => handleFooterToggle(key)}
                    onFocus={() => onFocus(focusKey)}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
                {footerToggles[key] && (
                  <input
                    type="text"
                    value={state[stateKey]}
                    onChange={(e) => onChange({ [stateKey]: e.target.value })}
                    onFocus={() => onFocus(focusKey)}
                    data-field={focusKey}
                    placeholder={inputPlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
