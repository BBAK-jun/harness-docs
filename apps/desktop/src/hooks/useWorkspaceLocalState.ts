import { useMemo } from "react";
import { useDocumentCommentActions } from "./useDocumentCommentActions";
import { useDocumentComments } from "./useDocumentComments";
import { useDocumentDrafts } from "./useDocumentDrafts";
import { useDocumentEditingLocks } from "./useDocumentEditingLocks";
import { useWorkspaceSelection } from "./useWorkspaceSelection";
import type { MembershipId } from "../types/domain-ui";

export function useWorkspaceLocalState(
  initialWorkspaceGraphs: Parameters<typeof useDocumentComments>[0],
  options: {
    activeWorkspaceId: string | null;
    selectedDocumentId: string | null;
    userId: string | null;
    activeMembershipId: MembershipId | null;
    onSelectedDocumentChange: (documentId: string) => void;
  },
) {
  const { workspaceGraphs, createBlockCommentThread } = useDocumentComments(initialWorkspaceGraphs);
  const locks = useDocumentEditingLocks(workspaceGraphs);
  const drafts = useDocumentDrafts(
    workspaceGraphs,
    {
      activeMembershipId: options.activeMembershipId,
      userId: options.userId,
    },
    locks,
  );
  const selection = useWorkspaceSelection(drafts.workspaceGraphs, {
    activeWorkspaceId: options.activeWorkspaceId,
    selectedDocumentId: options.selectedDocumentId,
    onSelectedDocumentChange: options.onSelectedDocumentChange,
  });
  const comments = useDocumentCommentActions({
    activeMembershipId: options.activeMembershipId,
    activeWorkspaceGraph: selection.activeWorkspaceGraph,
    createBlockCommentThread,
  });

  const activeDocumentSource = useMemo(() => {
    if (!selection.activeDocument) {
      return "";
    }

    return selection.activeDocument.markdownSource;
  }, [selection.activeDocument]);

  const activeDocumentLock = useMemo(() => {
    if (!selection.activeDocument) {
      return null;
    }

    return locks.getDocumentLockForDocument(selection.activeDocument.id);
  }, [locks, selection.activeDocument]);

  return {
    workspaceGraphs: drafts.workspaceGraphs,
    activeWorkspaceGraph: selection.activeWorkspaceGraph,
    activeDocument: selection.activeDocument,
    activeDocumentSource,
    activeDocumentLock,
    documentDrafts: drafts.documentDrafts,
    touchDocumentEditingLock: locks.touchDocumentEditingLock,
    handleDocumentSelect: selection.handleDocumentSelect,
    handleDocumentSourceChange: drafts.handleDocumentSourceChange,
    handleDocumentTitleChange: drafts.handleDocumentTitleChange,
    handleDocumentLinkedDocumentsChange: drafts.handleDocumentLinkedDocumentsChange,
    handleResetDocumentDraft: drafts.handleResetDocumentDraft,
    handleStartEditing: drafts.handleStartEditing,
    handleReleaseEditing: drafts.handleReleaseEditing,
    handleCreateBlockComment: comments.handleCreateBlockComment,
  };
}
