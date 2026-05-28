import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DEFAULT_EDITOR_STATE } from "@/components/tenant-editor/defaults";
import FunnelEditorClient from "./FunnelEditorClient";
import FunnelEditorClientV2 from "./FunnelEditorClientV2";

interface Props {
  searchParams: Promise<{ v?: string }>;
}

export default async function NewFunnelPage({ searchParams }: Props) {
  const { v } = await searchParams;
  const useV2 = v === "2";
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

  if (useV2) {
    return (
      <FunnelEditorClientV2
        initialState={initialState}
        companyName={tenant.company_name ?? ""}
      />
    );
  }

  return (
    <FunnelEditorClient
      initialState={initialState}
      companyName={tenant.company_name ?? ""}
    />
  );
}
