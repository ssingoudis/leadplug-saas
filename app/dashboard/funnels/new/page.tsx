import { redirect } from "next/navigation";

// Aufgabe 62 Runde 2 — „Neuer Funnel" läuft jetzt über das Modal (NewFunnelButton) bzw.
// die Vorlagen-Seite; der leere Editor lebt unter /new/blank. Diese Route bleibt
// als Redirect für Bookmarks/alte Links bestehen.
export default function NewFunnelPage() {
  redirect("/dashboard/vorlagen");
}
