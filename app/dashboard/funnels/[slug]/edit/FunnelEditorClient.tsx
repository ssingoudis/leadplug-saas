"use client";

import { EditorShellV2 } from "@/components/tenant-editor/v2/EditorShellV2";
import type { EditorState } from "@/types";

interface Props {
  initialState: EditorState;
  originalSlug: string;
  companyName: string;
}

export default function FunnelEditorClientV2(props: Props) {
  return (
    <EditorShellV2
      mode="edit"
      originalSlug={props.originalSlug}
      initialState={props.initialState}
      companyName={props.companyName}
    />
  );
}
