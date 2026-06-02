// Superadmin-Gate (Plattform-Owner). Erlaubte Accounts kommen aus der Env-Variable
// SUPERADMIN_EMAIL (komma-separiert für mehrere). Server-only — die Variable hat KEIN
// NEXT_PUBLIC-Prefix, damit die Allowlist nie im Client landet.
export function isSuperadmin(email: string | null | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.SUPERADMIN_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}
