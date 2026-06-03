"use client";

import { EditorShell } from "@/components/tenant-editor/v2/EditorShell";
import type { EditorState } from "@/types";

interface Props {
  initialState: EditorState;
  originalSlug: string;
  companyName: string;
}

export default function FunnelEditorClient(props: Props) {
  return (
    <EditorShell
      mode="edit"
      originalSlug={props.originalSlug}
      initialState={props.initialState}
      companyName={props.companyName}
    />
  );
}
