// Generischer CSV-Helfer (domänenfrei, testbar). Aufgabe 69 — Lead-Export.
// Zwei Dialekte, weil „CSV" kein einheitlicher Standard ist:
//   • Excel (Deutschland): Semikolon-Trenner + UTF-8-BOM → öffnet per Doppelklick
//     sauber in deutschem Excel (DE-Excel erwartet ; als Listentrenner, BOM für Umlaute).
//   • Standard / RFC 4180: Komma-Trenner, kein BOM → für Tools, Google Sheets, Code.

export type CsvDialect = {
  delimiter: string;
  bom: boolean;
};

export const CSV_EXCEL: CsvDialect = { delimiter: ";", bom: true };
export const CSV_STANDARD: CsvDialect = { delimiter: ",", bom: false };

// U+FEFF — Byte Order Mark; signalisiert Excel die UTF-8-Kodierung (sonst Umlaut-Salat).
const UTF8_BOM = "﻿";

/**
 * Serialisiert eine 2D-String-Matrix (Header + Datenzeilen) zu CSV.
 * Eine Zelle wird gequotet, wenn sie das Trennzeichen, ein Anführungszeichen
 * oder einen Zeilenumbruch enthält; interne " werden zu "" verdoppelt.
 */
export function toCsv(rows: string[][], dialect: CsvDialect = CSV_EXCEL): string {
  const { delimiter, bom } = dialect;
  const needsQuote = (value: string): boolean =>
    value.includes(delimiter) || /["\n\r]/.test(value);
  const escapeCell = (value: string): string =>
    needsQuote(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const body = rows.map((row) => row.map(escapeCell).join(delimiter)).join("\r\n");
  return bom ? `${UTF8_BOM}${body}` : body;
}

/** Löst einen Browser-Download der CSV-Daten aus (Client-only). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
