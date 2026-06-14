import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DEFAULT_EDITOR_STATE } from "@/components/editor/defaults";
import FunnelEditorClient from "../FunnelEditorClient";

// Aufgabe 62 — leerer Editor-Start. Die bisherige /dashboard/funnels/new-Route
// zeigt jetzt die Vorlagen-Galerie; „Leer starten" führt hierher.
export default async function NewBlankFunnelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, company_name")
    .maybeSingle();

  if (!tenant) redirect("/dashboard");

  // notification_email ist seit B.4 NOT NULL in funnels — beim Anlegen mit User-E-Mail
  // vorbelegen, damit das Pflichtfeld nicht leer startet. User kann das im Editor ändern.
  const initialState = {
    ...DEFAULT_EDITOR_STATE,
    notificationEmail: user.email ?? "",
  };

  return (
    <FunnelEditorClient
      initialState={initialState}
      companyName={tenant.company_name ?? ""}
    />
  );
}
