import { useMemo } from "react";
import type { WorkspaceShellModel } from "./useWorkspaceShell";

export function useApprovalsPage(shell: WorkspaceShellModel) {
  const approvals = useMemo(() => {
    if (!shell.activeWorkspaceGraph || !shell.activeDocument) {
      return [];
    }

    return shell.activeWorkspaceGraph.approvals.filter(
      (approval) => approval.documentId === shell.activeDocument?.id,
    );
  }, [shell.activeDocument, shell.activeWorkspaceGraph]);

  return {
    approvals,
  };
}
