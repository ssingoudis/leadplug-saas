import { createClient } from "@/lib/supabase/server";
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

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug, company_name, public_email, public_phone")
    .maybeSingle();

  if (!tenant) redirect("/dashboard");

  // RLS sorgt dafuer, dass nur eigene Funnels sichtbar sind.
  const { data: funnelRow } = await supabase
    .from("funnels")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!funnelRow) notFound();

  const { data: questionRows } = await supabase
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
