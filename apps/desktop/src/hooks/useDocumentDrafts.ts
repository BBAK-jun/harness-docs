import { useMemo, useState } from "react";
import type {
  DocumentEditingLock,
  DocumentEditingReleaseReason,
  NavigationArea,
  WorkspaceDocument,
  WorkspaceGraph,
} from "../types/contracts";
import type { MembershipId } from "../types/domain-ui";

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) => entry === right[index]);
}

function removeRecordEntry<TValue>(record: Record<string, TValue>, key: string) {
  const nextRecord = { ...record };

  delete nextRecord[key];

  return nextRecord;
}

function applyDocumentDrafts(
  workspaceGraphs: WorkspaceGraph[],
  draftState: {
    documentDrafts: Record<string, string>;
    documentLinkedDocumentDrafts: Record<string, string[]>;
    documentTitleDrafts: Record<string, string>;
    documentUpdatedAtByDocumentId: Record<string, string>;
  },
) {
  return workspaceGraphs.map((graph) => ({
    ...graph,
    documents: graph.documents.map((document) => {
      const nextMarkdownSource = draftState.documentDrafts[document.id];
      const nextTitle = draftState.documentTitleDrafts[document.id];
      const nextLinkedDocumentIds = draftState.documentLinkedDocumentDrafts[document.id];
      const nextUpdatedAt = draftState.documentUpdatedAtByDocumentId[document.id];

      if (
        nextMarkdownSource === undefined &&
        nextTitle === undefined &&
        nextLinkedDocumentIds === undefined &&
        nextUpdatedAt === undefined
      ) {
        return document;
      }

      return {
        ...document,
        title: nextTitle ?? document.title,
        markdownSource: nextMarkdownSource ?? document.markdownSource,
        linkedDocumentIds: nextLinkedDocumentIds ?? document.linkedDocumentIds,
        lifecycle:
          nextUpdatedAt !== undefined
            ? {
                ...document.lifecycle,
                updatedAt: nextUpdatedAt,
              }
            : document.lifecycle,
      };
    }),
  }));
}

interface DocumentLockDraftDependencies {
  acquireDocumentEditingLock: (input: {
    document: WorkspaceDocument;
    membershipId: MembershipId;
    area?: NavigationArea;
  }) => boolean;
  getActiveLockForDocument: (documentId: string) => DocumentEditingLock | null;
  releaseDocumentEditingLock: (input: {
    documentId: string;
    membershipId: MembershipId;
    reason?: DocumentEditingReleaseReason;
  }) => boolean;
  touchDocumentEditingLock: (input: {
    documentId: string;
    membershipId: MembershipId;
  }) => void;
}

interface UseDocumentDraftsOptions {
  activeMembershipId: MembershipId | null;
  userId: string | null;
}

export function useDocumentDrafts(
  workspaceGraphs: WorkspaceGraph[],
  options: UseDocumentDraftsOptions,
  locks: DocumentLockDraftDependencies,
) {
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, string>>({});
  const [documentTitleDrafts, setDocumentTitleDrafts] = useState<Record<string, string>>({});
  const [documentLinkedDocumentDrafts, setDocumentLinkedDocumentDrafts] = useState<
    Record<string, string[]>
  >({});
  const [documentUpdatedAtByDocumentId, setDocumentUpdatedAtByDocumentId] = useState<
    Record<string, string>
  >({});

  const workspaceGraphsWithDrafts = useMemo(
    () =>
      applyDocumentDrafts(workspaceGraphs, {
        documentDrafts,
        documentLinkedDocumentDrafts,
        documentTitleDrafts,
        documentUpdatedAtByDocumentId,
      }),
    [
      documentDrafts,
      documentLinkedDocumentDrafts,
      documentTitleDrafts,
      documentUpdatedAtByDocumentId,
      workspaceGraphs,
    ],
  );

  const getBaseDocument = (documentId: string, workspaceId: string) =>
    workspaceGraphs
      .find((graph) => graph.workspace.id === workspaceId)
      ?.documents.find((document) => document.id === documentId) ?? null;

  const handleDocumentSourceChange = (document: WorkspaceDocument, nextSource: string) => {
    const workspaceGraph = workspaceGraphs.find(
      (graph) => graph.workspace.id === document.workspaceId,
    );
    const baseDocument = getBaseDocument(document.id, document.workspaceId);
    const currentMembership =
      workspaceGraph?.memberships.find(
        (membership) =>
          membership.userId === options.userId && membership.lifecycle.status === "active",
      ) ?? null;
    const activeLock = locks.getActiveLockForDocument(document.id);

    if (
      !baseDocument ||
      !currentMembership ||
      activeLock?.lockedByMembershipId !== currentMembership.id
    ) {
      return;
    }

    locks.touchDocumentEditingLock({
      documentId: document.id,
      membershipId: currentMembership.id,
    });

    const hasTitleDraft = documentTitleDrafts[document.id] !== undefined;
    const hasLinkedDocumentDraft = documentLinkedDocumentDrafts[document.id] !== undefined;
    const hasSourceDraft = nextSource !== baseDocument.markdownSource;

    setDocumentDrafts((current) =>
      hasSourceDraft
        ? { ...current, [document.id]: nextSource }
        : removeRecordEntry(current, document.id),
    );
    setDocumentUpdatedAtByDocumentId((current) =>
      hasSourceDraft || hasTitleDraft || hasLinkedDocumentDraft
        ? {
            ...current,
            [document.id]: new Date().toISOString(),
          }
        : removeRecordEntry(current, document.id),
    );
  };

  const handleDocumentTitleChange = (document: WorkspaceDocument, nextTitle: string) => {
    const baseDocument = getBaseDocument(document.id, document.workspaceId);
    const activeLock = locks.getActiveLockForDocument(document.id);

    if (
      !baseDocument ||
      !options.activeMembershipId ||
      activeLock?.lockedByMembershipId !== options.activeMembershipId
    ) {
      return;
    }

    locks.touchDocumentEditingLock({
      documentId: document.id,
      membershipId: options.activeMembershipId,
    });

    const hasTitleDraft = nextTitle !== baseDocument.title;
    const hasSourceDraft = documentDrafts[document.id] !== undefined;
    const hasLinkedDocumentDraft = documentLinkedDocumentDrafts[document.id] !== undefined;

    setDocumentTitleDrafts((current) =>
      hasTitleDraft
        ? { ...current, [document.id]: nextTitle }
        : removeRecordEntry(current, document.id),
    );
    setDocumentUpdatedAtByDocumentId((current) =>
      hasTitleDraft || hasSourceDraft || hasLinkedDocumentDraft
        ? {
            ...current,
            [document.id]: new Date().toISOString(),
          }
        : removeRecordEntry(current, document.id),
    );
  };

  const handleDocumentLinkedDocumentsChange = (
    document: WorkspaceDocument,
    nextLinkedDocumentIds: string[],
  ) => {
    const baseDocument = getBaseDocument(document.id, document.workspaceId);
    const activeLock = locks.getActiveLockForDocument(document.id);

    if (
      !baseDocument ||
      !options.activeMembershipId ||
      activeLock?.lockedByMembershipId !== options.activeMembershipId
    ) {
      return;
    }

    locks.touchDocumentEditingLock({
      documentId: document.id,
      membershipId: options.activeMembershipId,
    });

    const hasLinkedDocumentDraft = !areStringArraysEqual(
      nextLinkedDocumentIds,
      baseDocument.linkedDocumentIds,
    );
    const hasSourceDraft = documentDrafts[document.id] !== undefined;
    const hasTitleDraft = documentTitleDrafts[document.id] !== undefined;

    setDocumentLinkedDocumentDrafts((current) =>
      hasLinkedDocumentDraft
        ? {
            ...current,
            [document.id]: nextLinkedDocumentIds,
          }
        : removeRecordEntry(current, document.id),
    );
    setDocumentUpdatedAtByDocumentId((current) =>
      hasLinkedDocumentDraft || hasSourceDraft || hasTitleDraft
        ? {
            ...current,
            [document.id]: new Date().toISOString(),
          }
        : removeRecordEntry(current, document.id),
    );
  };

  const handleResetDocumentDraft = (document: WorkspaceDocument) => {
    setDocumentDrafts((current) => removeRecordEntry(current, document.id));
    setDocumentTitleDrafts((current) => removeRecordEntry(current, document.id));
    setDocumentLinkedDocumentDrafts((current) => removeRecordEntry(current, document.id));
    setDocumentUpdatedAtByDocumentId((current) => removeRecordEntry(current, document.id));
  };

  const handleStartEditing = (document: WorkspaceDocument) => {
    if (!options.activeMembershipId) {
      return;
    }

    locks.acquireDocumentEditingLock({
      document,
      membershipId: options.activeMembershipId,
      area: "editor",
    });
  };

  const handleReleaseEditing = (document: WorkspaceDocument) => {
    if (!options.activeMembershipId) {
      return;
    }

    locks.releaseDocumentEditingLock({
      documentId: document.id,
      membershipId: options.activeMembershipId,
      reason: "manual_release",
    });
  };

  return {
    workspaceGraphs: workspaceGraphsWithDrafts,
    documentDrafts,
    handleDocumentLinkedDocumentsChange,
    handleDocumentSourceChange,
    handleDocumentTitleChange,
    handleReleaseEditing,
    handleResetDocumentDraft,
    handleStartEditing,
  };
}
