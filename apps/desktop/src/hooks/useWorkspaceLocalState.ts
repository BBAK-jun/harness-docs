import { useEffect, useMemo, useRef, useState } from "react";
import { useDocumentComments } from "./useDocumentComments";
import { useDocumentEditingLocks } from "./useDocumentEditingLocks";
import type {
  CommentBlockKind,
  ContentSectionKind,
  WorkspaceDocument,
  WorkspaceGraph,
} from "../types/contracts";
import type { DocumentBlockCommentAnchor } from "../types/domain-ui";

function mapSectionKindToBlockKind(kind: ContentSectionKind | undefined): CommentBlockKind {
  switch (kind) {
    case "list":
      return "list_item";
    case "checklist":
      return "checklist_item";
    case "decision":
      return "decision";
    default:
      return "paragraph";
  }
}

function buildDefaultBlockCommentAnchor(
  workspaceGraph: WorkspaceGraph,
  document: WorkspaceDocument,
): DocumentBlockCommentAnchor {
  const template = workspaceGraph.templates.find((entry) => entry.id === document.templateId);
  const section = template?.sections[0];
  const excerpt =
    document.markdownSource
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#")) ?? document.title;

  return {
    documentId: document.id,
    kind: "block",
    blockId: section?.id ?? `${document.slug}_block`,
    blockKind: mapSectionKindToBlockKind(section?.kind),
    headingPath: [section?.title ?? document.title],
    excerpt,
    startOffset: null,
    endOffset: null,
  };
}

function buildSelectedDocumentMap(workspaceGraphs: WorkspaceGraph[]) {
  return Object.fromEntries(
    workspaceGraphs.map((graph) => [graph.workspace.id, graph.documents[0]?.id ?? ""]),
  );
}

export function useWorkspaceLocalState(
  initialWorkspaceGraphs: WorkspaceGraph[],
  options: {
    activeWorkspaceId: string | null;
    selectedDocumentId: string | null;
    userId: string | null;
    activeMembershipId: string | null;
    onSelectedDocumentChange: (documentId: string) => void;
  },
) {
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Record<string, string>>({});
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, string>>({});
  const lastInteractionTouchMsRef = useRef(0);
  const { workspaceGraphs, createBlockCommentThread } = useDocumentComments(initialWorkspaceGraphs);
  const {
    getDocumentLockForDocument,
    getActiveLockForDocument,
    acquireDocumentEditingLock,
    releaseDocumentEditingLock,
    touchDocumentEditingLock,
  } = useDocumentEditingLocks(workspaceGraphs);

  useEffect(() => {
    setSelectedDocumentIds(buildSelectedDocumentMap(initialWorkspaceGraphs));
  }, [initialWorkspaceGraphs]);

  const activeWorkspaceGraph = useMemo(
    () =>
      workspaceGraphs.find((graph) => graph.workspace.id === options.activeWorkspaceId) ?? null,
    [options.activeWorkspaceId, workspaceGraphs],
  );

  const activeDocument = useMemo(() => {
    if (!activeWorkspaceGraph) {
      return null;
    }

    const selectedDocumentId =
      options.selectedDocumentId ?? selectedDocumentIds[activeWorkspaceGraph.workspace.id];

    return (
      activeWorkspaceGraph.documents.find((document) => document.id === selectedDocumentId) ??
      activeWorkspaceGraph.documents[0] ??
      null
    );
  }, [activeWorkspaceGraph, options.selectedDocumentId, selectedDocumentIds]);

  const activeDocumentSource = useMemo(() => {
    if (!activeDocument) {
      return "";
    }

    return documentDrafts[activeDocument.id] ?? activeDocument.markdownSource;
  }, [activeDocument, documentDrafts]);

  const activeDocumentLock = useMemo(() => {
    if (!activeDocument) {
      return null;
    }

    return getDocumentLockForDocument(activeDocument.id);
  }, [activeDocument, getDocumentLockForDocument]);

  const handleDocumentSelect = (documentId: string) => {
    if (!activeWorkspaceGraph) {
      return;
    }

    setSelectedDocumentIds((current) => ({
      ...current,
      [activeWorkspaceGraph.workspace.id]: documentId,
    }));
    options.onSelectedDocumentChange(documentId);
  };

  const handleDocumentSourceChange = (document: WorkspaceDocument, nextSource: string) => {
    const workspaceGraph = workspaceGraphs.find(
      (graph) => graph.workspace.id === document.workspaceId,
    );
    const currentMembership =
      workspaceGraph?.memberships.find(
        (membership) =>
          membership.userId === options.userId && membership.lifecycle.status === "active",
      ) ?? null;
    const activeLock = getActiveLockForDocument(document.id);

    if (!currentMembership || activeLock?.lockedByMembershipId !== currentMembership.id) {
      return;
    }

    touchDocumentEditingLock({
      documentId: document.id,
      membershipId: currentMembership.id,
    });

    setDocumentDrafts((current) => ({
      ...current,
      [document.id]: nextSource,
    }));
  };

  const handleStartEditing = (document: WorkspaceDocument) => {
    if (!options.activeMembershipId) {
      return;
    }

    acquireDocumentEditingLock({
      document,
      membershipId: options.activeMembershipId,
      area: "editor",
    });
  };

  const handleReleaseEditing = (document: WorkspaceDocument) => {
    if (!options.activeMembershipId) {
      return;
    }

    releaseDocumentEditingLock({
      documentId: document.id,
      membershipId: options.activeMembershipId,
      reason: "manual_release",
    });
  };

  const handleCreateBlockComment = (document: WorkspaceDocument, bodyMarkdown: string) => {
    if (
      !options.activeMembershipId ||
      !activeWorkspaceGraph ||
      bodyMarkdown.trim().length === 0
    ) {
      return;
    }

    createBlockCommentThread({
      workspaceId: document.workspaceId,
      documentId: document.id,
      authorMembershipId: options.activeMembershipId,
      bodyMarkdown,
      anchor: buildDefaultBlockCommentAnchor(activeWorkspaceGraph, document),
      linkedDocumentIds: document.linkedDocumentIds,
      triggeredReviewDocumentIds: document.linkedDocumentIds,
    });
  };

  return {
    workspaceGraphs,
    activeWorkspaceGraph,
    activeDocument,
    activeDocumentSource,
    activeDocumentLock,
    documentDrafts,
    lastInteractionTouchMsRef,
    touchDocumentEditingLock,
    handleDocumentSelect,
    handleDocumentSourceChange,
    handleStartEditing,
    handleReleaseEditing,
    handleCreateBlockComment,
  };
}
