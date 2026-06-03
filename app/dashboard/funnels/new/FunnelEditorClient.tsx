"use client";

import { EditorShell } from "@/components/tenant-editor/v2/EditorShell";
import type { EditorState } from "@/types";

interface Props {
  initialState: EditorState;
  companyName: string;
}

export default function FunnelEditorClient(props: Props) {
  return <EditorShell mode="create" {...props} />;
}
