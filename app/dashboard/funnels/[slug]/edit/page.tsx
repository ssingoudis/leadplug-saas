import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { dbToEditorState, type DbPageRow, type DbFieldRow } from "@/lib/editorUtils";
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
    .select("id, company_name")
    .maybeSingle();

  if (!tenant) redirect("/dashboard");

  // RLS sorgt dafuer, dass nur eigene Funnels sichtbar sind.
  const { data: funnelRow } = await supabase
    .from("funnels")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!funnelRow) notFound();

  const { data: pageRows } = await supabase
    .from("pages")
    .select("id, funnel_id, page_type, sort_order, config")
    .eq("funnel_id", funnelRow.id)
    .order("sort_order", { ascending: true });

  const pageIds = (pageRows ?? []).map((p) => p.id);
  const { data: fieldRows } = pageIds.length > 0
    ? await supabase
        .from("fields")
        .select("id, page_id, field_key, field_type, label, subtitle, placeholder, visible, required, sort_order, options, config")
        .in("page_id", pageIds)
    : { data: [] as DbFieldRow[] };

  const initialState = dbToEditorState(funnelRow, (pageRows ?? []) as DbPageRow[], (fieldRows ?? []) as DbFieldRow[]);

  return (
    <FunnelEditorClient
      initialState={initialState}
      originalSlug={slug}
      companyName={tenant.company_name ?? ""}
    />
  );
}
