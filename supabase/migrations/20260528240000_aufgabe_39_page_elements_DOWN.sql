-- Aufgabe 39 Rollback: redirect_url-Spalte droppen, neue Enum-Werte sind PG-spezifisch
-- nicht direkt entfernbar (siehe Aufgabe-38-DOWN für den manuellen Recovery-Pfad).
--
-- App-Code-Rollback (Code-only ohne Schema-Touch) reicht meistens: solange das
-- Frontend keine 'rating'/'scale'/'statement'-Fields oder 'welcome'-Pages erzeugt,
-- sind die Enum-Werte einfach ungenutzt im Schema.

ALTER TABLE funnels
  DROP COLUMN IF EXISTS redirect_url;

-- Enum-Werte zu entfernen (welcome, rating, scale, statement) erfordert den
-- temporären-Type-Pfad wie in Aufgabe-38-DOWN dokumentiert. Im Notfall:
--   1) Sicherstellen dass keine Daten mehr die Werte verwenden
--   2) Neuen Enum-Typ ohne die Werte erstellen
--   3) Spalten umtypisieren
--   4) Alten Typ droppen, neuen umbenennen
