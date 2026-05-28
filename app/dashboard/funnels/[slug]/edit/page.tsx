import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { dbToEditorState, type DbPageRow, type DbFieldRow } from "@/lib/editorUtils";
import FunnelEditorClient from "./FunnelEditorClient";
import FunnelEditorClientV2 from "./FunnelEditorClientV2";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function EditFunnelPage({ params, searchParams }: Props) {
  const { slug } = await params;
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

  // RLS sorgt dafuer, dass nur eigene Funnels sichtbar sind.
  const { data: funnelRow } = await supabase
    .from("funnels")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!funnelRow) notFound();

  const { data: pageRows } = await supabase
    .from("pages")
    .select("id, funnel_id, page_type, sort_order")
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

  if (useV2) {
    return (
      <FunnelEditorClientV2
        initialState={initialState}
        originalSlug={slug}
        companyName={tenant.company_name ?? ""}
      />
    );
  }

  return (
    <FunnelEditorClient
      initialState={initialState}
      originalSlug={slug}
      companyName={tenant.company_name ?? ""}
    />
  );
}
