"use client";

import { EditorShellV2 } from "@/components/tenant-editor/v2/EditorShellV2";
import type { EditorState } from "@/types";

interface Props {
  initialState: EditorState;
  companyName: string;
}

export default function FunnelEditorClientV2(props: Props) {
  return <EditorShellV2 mode="create" {...props} />;
}
