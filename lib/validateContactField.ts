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

    case "tel": {
      const onlyAllowed     = /^[+\d\s\-()\/]+$/.test(value)
      const digitCount      = (value.match(/\d/g) ?? []).length
      const startsCorrectly = /^[0+]/.test(value.trim())
      return !onlyAllowed || digitCount < 7 || !startsCorrectly
        ? "Bitte geben Sie eine gültige Telefonnummer ein."
        : ""
    }

    default:
      return ""
  }
}
