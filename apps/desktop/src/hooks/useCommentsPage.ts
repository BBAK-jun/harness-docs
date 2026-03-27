import { useMemo } from "react";
import type { WorkspaceShellModel } from "./useWorkspaceShell";

export function useCommentsPage(shell: WorkspaceShellModel) {
  const threads = useMemo(() => {
    if (!shell.activeWorkspaceGraph || !shell.activeDocument) {
      return [];
    }

    return shell.activeWorkspaceGraph.commentThreads.filter(
      (thread) => thread.documentId === shell.activeDocument?.id,
    );
  }, [shell.activeDocument, shell.activeWorkspaceGraph]);

  return {
    threads,
  };
}
