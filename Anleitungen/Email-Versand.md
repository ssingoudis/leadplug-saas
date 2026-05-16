# E-Mail-Versand

## Überblick

Pro Formular-Einreichung werden **genau 2 E-Mails** verschickt:

| Mail | Empfänger | Absender-Domain |
|------|-----------|----------------|
| Bestätigungsmail | Lead (Anfrager) | `EMAIL_DOMAIN` |
| Lead-Benachrichtigung | Tenant (Widget-Besitzer) | `EMAIL_DOMAIN_PLATFORM` |

Versand läuft über **Resend** (`lib/sendEmails.ts`).

---

## Die 2 Absender-Variablen

### `EMAIL_DOMAIN`
Domain für die **Bestätigungsmail an den Lead** (die Person, die das Formular ausgefüllt hat).

Kombiniert mit `email_sender_local` aus der Supabase-Tabelle `tenants`:

```
{tenants.email_sender_local}@{EMAIL_DOMAIN}
```

Beispiel: `email_sender_local = "muster-solar"` + `EMAIL_DOMAIN = "anfragebestaetigung.de"`
→ Absender: `muster-solar@anfragebestaetigung.de`

Fallback wenn `email_sender_local` in der DB nicht gesetzt ist: Wert aus `EMAIL_FROM` (z.B. `noreply@anfragebestaetigung.de`).

### `EMAIL_DOMAIN_PLATFORM`
Domain für die **Lead-Benachrichtigung an den Tenant** (den Widget-Besitzer).

Absender ist immer fest:
```
anfrage@{EMAIL_DOMAIN_PLATFORM}
```

Beispiel: `EMAIL_DOMAIN_PLATFORM = "leadplug.de"` → Absender: `anfrage@leadplug.de`

**Wenn `EMAIL_DOMAIN_PLATFORM` nicht gesetzt ist**, wird dieselbe Absenderadresse wie bei der Lead-Bestätigung verwendet.

---

## Ablauf pro Submission

```
POST /api/submit
  ↓
logSubmission()        ← erst in Supabase speichern
  ↓
sendAllEmails()
  ├── Bestätigungsmail  → an Lead (contact.email)                      von EMAIL_DOMAIN
  └── Lead-Alarm        → an Tenant (tenantConfig.notificationEmail)   von EMAIL_DOMAIN_PLATFORM
```

**Besonderheiten:**
- Die Bestätigungsmail wird **nur gesendet**, wenn der Lead eine E-Mail-Adresse eingetragen hat (Feld ist optional).
- Der Lead-Alarm an den Tenant wird **immer** gesendet.
- Hat der Lead eine E-Mail angegeben, wird sie als `Reply-To` im Lead-Alarm gesetzt, damit der Tenant direkt antworten kann.
- Fehler beim Senden werden nur geloggt – der Lead bekommt immer `{success: true}`.

---

## Konfiguration in `.env.local`

```env
RESEND_API_KEY=re_xxxxx

EMAIL_DOMAIN=anfragebestaetigung.de
EMAIL_FROM=noreply@anfragebestaetigung.de     # Fallback wenn email_sender_local fehlt

EMAIL_DOMAIN_PLATFORM=leadplug.de
```

---

## Wo kommt `email_sender_local` her?

Aus der Supabase-Tabelle `tenants`, Spalte `email_sender_local`.  
Wird in `lib/getTenantConfig.ts` geladen und als `tenantConfig.emailSenderLocal` weitergegeben.

Beispiele:

| Tenant | `email_sender_local` | Absender Bestätigungsmail |
|--------|----------------------|---------------------------|
| Muster Solar | `muster-solar` | `muster-solar@anfragebestaetigung.de` |
| Heizung Müller | `heizung-mueller` | `heizung-mueller@anfragebestaetigung.de` |
| (nicht gesetzt) | `null` | `noreply@anfragebestaetigung.de` |
