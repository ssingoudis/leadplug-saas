-- Aufgabe 53 — tote funnel.*-Variablen-Chips aus den E-Mail-Templates strippen.
--
-- Die {{funnel.*}}-Variablen (Firmenname/E-Mail/Telefon/success_message/response_message) wurden in
-- Aufgabe 52A aus resolveVar entfernt; gespeicherte Chips rendern seither leer. Diese Migration
-- entfernt die toten <span data-variable="funnel.*">…</span>-Chips aus body_html + subject, damit
-- niemand mehr leere Variablen in seinen Mails sieht.
--
-- Sicher für jede Code-Version (funnel.* rendert ohnehin zu ''). Betroffen: 15 E-Mails.
-- Per Dry-Run verifiziert: nur funnel.*-Chips entfernt, alles andere (contact.*, Magic-Sections, Text) bleibt.
-- Rollback: 20260606170000_aufgabe_53_strip_funnel_var_chips_DOWN.sql + tägliches Backup.

UPDATE email_subscriptions
SET body_html = regexp_replace(body_html, '<span[^>]*data-variable="funnel\.[^"]*"[^>]*>[^<]*</span>', '', 'g'),
    subject   = regexp_replace(subject,   '<span[^>]*data-variable="funnel\.[^"]*"[^>]*>[^<]*</span>', '', 'g')
WHERE body_html ~ 'data-variable="funnel\.' OR subject ~ 'data-variable="funnel\.';
