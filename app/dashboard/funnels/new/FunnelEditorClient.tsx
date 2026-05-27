"use client";

import { FunnelEditorShell } from "@/components/tenant-editor/FunnelEditorShell";
import type { EditorState } from "@/types";

interface Props {
  initialState: EditorState;
  companyName: string;
}

export default function FunnelEditorClient(props: Props) {
  return <FunnelEditorShell mode="create" {...props} />;
}
