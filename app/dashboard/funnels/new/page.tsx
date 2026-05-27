import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DEFAULT_EDITOR_STATE } from "@/components/tenant-editor/defaults";
import FunnelEditorClient from "./FunnelEditorClient";

export default async function NewFunnelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug, company_name, public_email, public_phone")
    .maybeSingle();

  if (!tenant) redirect("/dashboard");

  return (
    <FunnelEditorClient
      initialState={DEFAULT_EDITOR_STATE}
      companyName={tenant.company_name ?? ""}
      publicEmail={tenant.public_email ?? ""}
      publicPhone={tenant.public_phone ?? ""}
    />
  );
}
