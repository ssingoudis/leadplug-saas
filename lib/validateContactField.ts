import type { ContactFieldConfig } from '@/types'

// Validiert ein einzelnes Kontaktfeld anhand seines Typs und der required-Flag.
// Gibt eine Fehlermeldung zurück, oder "" wenn valide.
export function validateContactField(field: ContactFieldConfig, value: string): string {
  if (!field.required && !value) return ""

  switch (field.type) {
    case "radio":
      return !value ? `Bitte wählen Sie ${field.label} aus.` : ""

    case "text":
      return !value.trim() ? `Bitte geben Sie ${field.label} ein.` : ""

    case "email":
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? "Bitte geben Sie eine gültige E-Mail-Adresse ein."
        : ""

    case "plz":
      return !/^\d{5}$/.test(value.trim())
        ? "Bitte geben Sie eine gültige Postleitzahl ein (5 Ziffern)."
        : ""

    case "tel": {
      const onlyAllowed     = /^[+\d\s\-()\/]+$/.test(value)
      const digitCount      = (value.match(/\d/g) ?? []).length
      const startsCorrectly = /^[0+]/.test(value.trim())
      return !onlyAllowed || digitCount < 7 || !startsCorrectly
        ? "Bitte geben Sie eine gültige Telefonnummer ein."
        : ""
    }

    // Aufgabe 39 Polish
    case "long_text":
      return !value.trim() ? `Bitte geben Sie ${field.label} ein.` : ""

    case "number":
      return !value.trim() || isNaN(Number(value))
        ? `Bitte geben Sie eine gültige Zahl ein.`
        : ""

    case "date":
      return !value.trim() ? `Bitte wählen Sie ein Datum.` : ""

    case "checkbox":
      // required heißt: muss aktiviert sein
      return value !== "true" ? `Bitte aktivieren Sie ${field.label}.` : ""

    case "dropdown":
      return !value ? `Bitte wählen Sie ${field.label} aus.` : ""

    // Polish-Runde 2
    case "multi_choice":
      return !value.trim() ? `Bitte wählen Sie mindestens eine Option.` : ""

    case "slider":
      // Slider hat immer einen Default → praktisch nie invalide
      return ""

    case "rating": {
      const n = Number(value)
      return !n || n < 1
        ? `Bitte vergeben Sie eine Bewertung.`
        : ""
    }

    case "scale":
      return !value.trim() ? `Bitte wählen Sie einen Wert auf der Skala.` : ""

    // Aufgabe 40 Polish: Name-Field-Types — wie text, aber mit klarerer Fehlermeldung.
    case "first_name":
      return !value.trim() ? "Bitte geben Sie Ihren Vornamen ein." : ""
    case "last_name":
      return !value.trim() ? "Bitte geben Sie Ihren Nachnamen ein." : ""
    case "full_name":
      return !value.trim() ? "Bitte geben Sie Ihren Namen ein." : ""

    default:
      return ""
  }
}
