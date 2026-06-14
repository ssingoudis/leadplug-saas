"use client";

import { EditorShell } from "@/components/editor/EditorShell";
import type { EditorState } from "@/types";

interface Props {
  initialState: EditorState;
  originalSlug: string;
  companyName: string;
  initialHideContactWarning: boolean;
}

export default function FunnelEditorClient(props: Props) {
  return (
    <EditorShell
      mode="edit"
      originalSlug={props.originalSlug}
      initialState={props.initialState}
      companyName={props.companyName}
      initialHideContactWarning={props.initialHideContactWarning}
    />
  );
}
