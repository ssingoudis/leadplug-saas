"use client";

import { FunnelEditorShell } from "@/components/tenant-editor/FunnelEditorShell";
import type { EditorState } from "@/types";

interface Props {
  initialState: EditorState;
  originalSlug: string;
  companyName: string;
  publicEmail: string;
  publicPhone: string;
}

export default function FunnelEditorClient(props: Props) {
  return (
    <FunnelEditorShell
      mode="edit"
      originalSlug={props.originalSlug}
      initialState={props.initialState}
      companyName={props.companyName}
      publicEmail={props.publicEmail}
      publicPhone={props.publicPhone}
    />
  );
}
