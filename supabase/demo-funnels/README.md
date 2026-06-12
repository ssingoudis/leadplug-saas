# Demo-Funnel-Chargen (Vorlagen-Ausbau 9 → 38)

Anwendungsfertige SQL-Blöcke nach dem Muster aus
[`context/vorlagen-kochbuch.md`](../../context/vorlagen-kochbuch.md).
Recherche pro Branche ist erledigt und in den Datei-Headern belegt
(Lead-Markt-Beleg + fachliche Qualifizierer + Logik-Begründung).

> **Stand 2026-06-12 (Aufgabe 63): ✅ ANGEWENDET.** Chargen 2–6 (29 Vorlagen,
> Nr. 10–38) sind komplett auf Produktion: Migration `aufgabe_63_snapshot_mails_active`
> + alle charge2–6-Dateien eingespielt, Verify-Soll-Werte exakt getroffen,
> alle 29 Live-URLs geprüft, 29 Templates publiziert (sort_order 100–380),
> Demo-Mails deaktiviert, Gegenprobe `definition->emails` bestanden.
> **Offen:** Branch `feature/aufgabe-63-vorlagen-charge2` mergen +
> deployen (Kategorie-Icons + Galerie-Filter; bis dahin Sparkles-Fallback).
> Die Dateien bleiben als Referenz/Republish-Quelle liegen.
>
> **Nachpolitur nach Stavros-Review (2026-06-12) — Abweichungen von den Dateien:**
> - `charge3_03` (Haartransplantation): **GELÖSCHT** (Template + Funnel) — Branche braucht
>   Picture-Choice (Norwood) + ist preis-/Türkei-getrieben, Text-Funnel nicht polierbar.
> - `charge5_05` (Entrümpelung): Express-Regel zielt jetzt auf die Flächen-Frage statt
>   Kontakt (überspringt nur Anlass — Festpreis braucht Fläche/Füllgrad).
> - `charge4_06` (Nachhilfe): Prüfungs-Regel als Cross-Step-Condition an den Format-Step
>   verschoben (überspringt nur den Starttermin).
> - `charge4_03` (Steuerberater): Privatperson-Sprung zielt auf die Wechsel-Frage
>   (überspringt jetzt auch die Leistungs-Auswahl).
> - `charge6_05` (Schädlingsbekämpfung): Dringlichkeit (sort 2) und Objekt (sort 3)
>   getauscht — Gastro-Leads beantworten die Notfall-Frage wieder.
> - Alle 4 Templates danach republished (Snapshots tragen die neuen Regeln).
>
> **Realitäts-Review Runde 2 (2026-06-12) — Disqualifikations-Sprünge zurückgebaut**
> (Prinzip siehe Kochbuch Schritt 2 „Drei Regel-Typen"; 14 Funnels geändert + republished):
> - **Eigentums-/Mieter-Frage ans Strecken-Ende verschoben, Mieter→Kontakt-Sprung gelöscht:**
>   demo-solar, demo-waermepumpe (beide NEU: Gewerbe→Kontakt, da der Privat-Slider nicht passt),
>   charge2_01 (Badsanierung), charge3_01 (Dachsanierung), charge3_02 (Fenster — zusätzlich
>   „>10→Kontakt" gelöscht, NEU „defekt→Terminfrage-Skip"), charge4_01 (GaLaBau),
>   charge6_01 (Wintergarten — „Bauart unklar"-Regel zielt jetzt auf die Eigentums-Frage).
> - **Frühe Sprünge zur Kontaktkarte gelöscht:** demo-pkv (Ü55; Studenten-Regel jetzt
>   Cross-Step, überspringt nur Einkommen), demo-autoankauf (Erstzulassung ≤1999),
>   charge2_05 (BU: Ü50), charge4_04 (KFZ: Wohnmobil), charge4_05 (Personal-Training:
>   Gesundheits-Sprung — Funnel jetzt bewusst regelfrei).
> - **Retargets:** demo-baufinanzierung (Objektsuche überspringt nur Kaufpreis),
>   charge2_06 (Zahnimplantate: ganzer Kiefer überspringt nur die Bestandsdauer-Frage).

## Ausführungs-Reihenfolge

| Schritt | Datei | Zweck |
|---|---|---|
| 0 | `supabase/migrations/20260611230000_aufgabe_63_snapshot_mails_active.sql` | via `apply_migration`: Snapshot publiziert Mails IMMER aktiv (Republish-Falle weg) |
| 0b | Branch `feature/aufgabe-63-vorlagen-charge2` mergen + deployen | `CATEGORY_ICONS` braucht Handwerk/Dienstleistung/Gesundheit/Pflege/Bildung (sonst Sparkles-Fallback) |
| 1 | `charge2_01…06` anlegen → `charge2_09_verify` → `charge2_07_publish` → `charge2_08_disable` | Vorlagen 10–15 (sort_order 100–150) |
| 2 | `charge3_01…06` → `charge3_09` → `charge3_07` → `charge3_08` | Vorlagen 16–21 (160–210) |
| 3 | `charge4_01…06` → `charge4_09` → `charge4_07` → `charge4_08` | Vorlagen 22–27 (220–270) |
| 4 | `charge5_01…06` → `charge5_09` → `charge5_07` → `charge5_08` | Vorlagen 28–33 (280–330) |
| 5 | `charge6_01…05` → `charge6_09` → `charge6_07` → `charge6_08` | Vorlagen 34–38 (340–380, nur 5 Funnels) |
| 6 | Gegenprobe: `SELECT slug, jsonb_path_query_array(definition, '$.emails[*].is_active') FROM funnel_templates;` — alles true | Mails in allen Definitionen aktiv |
| 7 | Doku: Kochbuch §0-Tabelle + Zähler (38), current-feature.md, Memory-Restplan | Abschluss |

Verify-Files enthalten die Soll-Counts; zusätzlich pro Funnel ein WebFetch
auf `https://app.leadplug.de/<slug>` (SSR lädt = getTenantConfig ok).

## Charge 2 — Vorlagen 10–15

| Slug | Brand | Kategorie | Kern-Mechanik | Theme |
|---|---|---|---|---|
| `demo-badsanierung` | BadWerk Sanitär | Handwerk | Mieter→Kontakt; ≠barrierefrei→Pflegegrad-Skip | #0284c7 inter |
| `demo-treppenlift` | LiftKomfort | Handwerk | Dringend→Fast-Track; Pflegegrad-Zuschuss 4.180 € | #be123c system, center |
| `demo-umzug` | UmzugsHelden | Dienstleistung | Firmenumzug→Kontakt; 2 Multi-Field-Karten, date, checkbox | #d97706 roboto |
| `demo-pflege-recruiting` | Pflegeteam Sonnenhof | Recruiting | Quereinsteiger→Erfahrungs-Skip; per Du | #2563eb poppins, center |
| `demo-bu` | Vorsorgekontor | Finanzen | Alter ≥ 50 (gte) + Vorerkrankung→Kontakt; Slider | #115e59 inter |
| `demo-zahnimplantate` | City Dental | Gesundheit | Ganzer Kiefer→Kontakt; optionales long_text | #db2777 poppins, center |

## Charge 3 — Vorlagen 16–21

| Slug | Brand | Kategorie | Kern-Mechanik | Theme |
|---|---|---|---|---|
| `demo-dachsanierung` | MeisterDach | Handwerk | Mieter→Kontakt; Reparatur→Form/Fläche-Skip | #991b1b roboto |
| `demo-fenster` | KlarFenster | Handwerk | Mieter→Kontakt; >10 Fenster→Fast-Track | #475569 inter, center |
| `demo-haartransplantation` | HairMedic Klinik | Gesundheit | Alter < 25 (lt)→ärztliche Beratung | #a21caf poppins, center |
| `demo-hoergeraete` | HörPunkt Akustik | Gesundheit | Folgeversorgung→HNO-Skip | #65a30d system |
| `demo-betreuung` | PflegeNah | Pflege | ≠24h→Zimmer-Skip; dringend→Kontakt | #0c4a6e inter |
| `demo-kueche` | KüchenAtelier | Handwerk | Budget ≥ 35.000 € (gte, Slider)→Premium-Planer | #44403c poppins |

## Charge 4 — Vorlagen 22–27

| Slug | Brand | Kategorie | Kern-Mechanik | Theme |
|---|---|---|---|---|
| `demo-galabau` | GrünWerk Gartenbau | Handwerk | Mieter→Kontakt; Pflege-Dauerauftrag→Flächen-Skip | #3f6212 roboto |
| `demo-mpu` | MPU Kompass | Dienstleistung | Punkte→Abstinenz-Skip (Cross-Step-Condition!); Termin steht→Kontakt | #1e3a8a inter |
| `demo-steuerberater` | Kanzlei Steuerklar | Dienstleistung | Privatperson→Unternehmens-Fragen-Skip | #155e75 inter |
| `demo-kfz-versicherung` | AutoTarif24 | Finanzen | Erstfahrzeug→SF-Skip; Wohnmobil→Beratung | #ca8a04 system, center |
| `demo-personal-training` | Coach Mio | Coaching | Gesundheitl. Einschränkung→Anamnese-Kontakt; per Du | #f43f5e poppins, center |
| `demo-nachhilfe` | Lernwerk | Bildung | Prüfungsvorbereitung→Kontakt (zeitkritisch) | #10b981 poppins |

## Charge 5 — Vorlagen 28–33

| Slug | Brand | Kategorie | Kern-Mechanik | Theme |
|---|---|---|---|---|
| `demo-scheidung` | Kanzlei Brandt | Recht | Scheidung eingereicht→sofort Vertretung | #581c87 inter |
| `demo-webdesign` | Studio Nordpixel | Dienstleistung | Budget ≥ 15.000 € (gte, Slider)→Konzeptgespräch | #0ea5e9 inter |
| `demo-fertighaus` | HausWerk Fertigbau | Handwerk | „Erst informieren"→schlanke Kataloganfrage | #78350f roboto, center |
| `demo-augenlasern` | VisuMed Augenzentrum | Gesundheit | Alter ≥ 50 + instabile Sehstärke→ärztl. Beratung | #14b8a6 poppins, center |
| `demo-entruempelung` | RaumFrei | Dienstleistung | Express-Räumung→Kontakt | #ea580c system |
| `demo-alarmanlage` | SafeHome | Handwerk | Einbruch passiert→akuter Fast-Track | #334155 inter |

## Charge 6 — Vorlagen 34–38 (nur 5)

| Slug | Brand | Kategorie | Kern-Mechanik | Theme |
|---|---|---|---|---|
| `demo-wintergarten` | SonnenRaum | Handwerk | Mieter→Kontakt; Bauart unklar→Beratung | #15803d roboto |
| `demo-gebaeudereinigung` | BlitzBlank | Dienstleistung | Fläche ≥ 5.000 m² (gte, number)→Besichtigung | #1e40af inter |
| `demo-privatkredit` | KreditNavi | Finanzen | Selbstständig + Schufa-Eintrag→Beratung; Summen-Slider | #0f766e system, center |
| `demo-bestattungsvorsorge` | Lebenswerk Vorsorge | Dienstleistung | Akuter Trauerfall→Sofortkontakt; würdevoller Ton | #57534e inter |
| `demo-schaedlingsbekaempfung` | ProTect | Dienstleistung | Notfall + Gastro/HACCP→Sofortkontakt | #b91c1c system |

Alle: Welcome → 5–6 Fragen → Kontaktkarte (`full_name`/`email`/`tel`, regional
vermittelnde zusätzlich `plz`) → Success, 2 Drip-Mails (tenant + customer,
Chips + `answers_overview`), `notification_email` = stavrossingoudis@gmail.com,
Tenant `f64b2227-2fbb-4746-83fa-9d71bf8af26f`. Anrede: Sie, außer
Pflege-Recruiting + Personal-Training (per Du, Branchen-Norm dokumentiert).
