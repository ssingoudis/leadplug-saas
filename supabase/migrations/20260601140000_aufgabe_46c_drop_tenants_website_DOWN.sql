-- DOWN für Aufgabe 46c: tenants.website wiederherstellen (Daten sind verloren).

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website text NULL;
