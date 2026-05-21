import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { dbToEditorState } from "@/lib/editorUtils";
import FunnelEditorClient from "./FunnelEditorClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditFunnelPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("slug, company_name, public_email, public_phone")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!tenant) redirect("/dashboard");

  // Funnel laden + Ownership prüfen
  const { data: funnelRow } = await admin
    .from("funnels")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!funnelRow || funnelRow.tenant_slug !== tenant.slug) notFound();

  const { data: questionRows } = await admin
    .from("funnel_questions")
    .select("*")
    .eq("funnel_slug", slug)
    .order("sort_order", { ascending: true });

  const initialState = dbToEditorState(funnelRow, questionRows ?? []);

  return (
    <FunnelEditorClient
      initialState={initialState}
      originalSlug={slug}
      companyName={tenant.company_name ?? ""}
      publicEmail={tenant.public_email ?? ""}
      publicPhone={tenant.public_phone ?? ""}
    />
  );
}
