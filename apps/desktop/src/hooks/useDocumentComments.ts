import { useMemo, useState } from "react";
import type {
  DocumentComment,
  DocumentCommentMention,
  DocumentCommentThread,
  WorkspaceGraph,
} from "../types/contracts";
import type {
  CreateDocumentBlockCommentInput,
  CreateDocumentCommentReplyInput,
  MembershipId,
} from "../types/domain-ui";

function buildCommentId(documentId: string, now: number) {
  return `cmt_${documentId}_${now}`;
}

function buildThreadId(documentId: string, blockId: string, now: number) {
  return `thread_${documentId}_${blockId}_${now}`;
}

function appendUniqueIds(currentIds: string[] | undefined, nextIds: string[]) {
  return Array.from(new Set([...(currentIds ?? []), ...nextIds]));
}

function mergeEntitiesById<T extends { id: string }>(base: T[], overlays: T[]) {
  const overlayById = new Map(overlays.map((entry) => [entry.id, entry]));
  const mergedBase = base.map((entry) => overlayById.get(entry.id) ?? entry);
  const baseIds = new Set(base.map((entry) => entry.id));

  return mergedBase.concat(overlays.filter((entry) => !baseIds.has(entry.id)));
}

function createMentions(
  membershipIds: MembershipId[] | undefined,
  commentId: string,
  threadId: string,
  workspaceId: string,
  documentId: string,
  createdAt: string,
  seed: string,
): DocumentCommentMention[] {
  return (membershipIds ?? []).map((membershipId, index) => ({
    id: `men_${seed}_${index + 1}`,
    workspaceId,
    documentId,
    source: "comment_markdown",
    threadId,
    commentId,
    reference: {
      subjectKind: "user",
      rawText: `@${membershipId}`,
      normalizedKey: membershipId.toLowerCase(),
      displayLabel: membershipId,
      membershipId,
    },
    parse: {
      trigger: "@",
      startOffset: -1,
      endOffset: -1,
      line: 1,
      column: 1,
      blockId: null,
    },
    createdAt,
    deliveryStatus: "pending",
    deliveredAt: null,
    readAt: null,
  }));
}

function createComment(input: {
  workspaceId: string;
  documentId: string;
  threadId: string;
  authorMembershipId: MembershipId;
  bodyMarkdown: string;
  mentionedMembershipIds?: MembershipId[];
  createdAt: string;
  idSeed: string;
}): DocumentComment {
  const idSeedParts = input.idSeed.split("_");
  const seedTimestamp = Number(idSeedParts[idSeedParts.length - 1] ?? Date.now());
  const commentId = buildCommentId(input.documentId, seedTimestamp);

  return {
    id: commentId,
    workspaceId: input.workspaceId,
    documentId: input.documentId,
    threadId: input.threadId,
    authorMembershipId: input.authorMembershipId,
    bodyMarkdown: input.bodyMarkdown.trim(),
    kind: "comment",
    mentions: createMentions(
      input.mentionedMembershipIds,
      commentId,
      input.threadId,
      input.workspaceId,
      input.documentId,
      input.createdAt,
      input.idSeed,
    ),
    lifecycle: {
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    },
  };
}

export function useDocumentComments(initialWorkspaceGraphs: WorkspaceGraph[]) {
  const [documentCommentThreadIdsByDocumentId, setDocumentCommentThreadIdsByDocumentId] = useState<
    Record<string, string[]>
  >({});
  const [documentUpdatedAtByDocumentId, setDocumentUpdatedAtByDocumentId] = useState<
    Record<string, string>
  >({});
  const [commentThreadsById, setCommentThreadsById] = useState<
    Record<string, DocumentCommentThread>
  >({});
  const [commentsById, setCommentsById] = useState<Record<string, DocumentComment>>({});

  const workspaceGraphs = useMemo(
    () =>
      initialWorkspaceGraphs.map((graph) => {
        const commentThreadOverlays = Object.values(commentThreadsById).filter(
          (thread) => thread.workspaceId === graph.workspace.id,
        );
        const commentOverlays = Object.values(commentsById).filter(
          (comment) => comment.workspaceId === graph.workspace.id,
        );

        return {
          ...graph,
          documents: graph.documents.map((document) => {
            const extraThreadIds = documentCommentThreadIdsByDocumentId[document.id] ?? [];
            const nextUpdatedAt = documentUpdatedAtByDocumentId[document.id];
            const hasThreadChanges = extraThreadIds.some(
              (threadId) => !document.commentThreadIds.includes(threadId),
            );

            if (!hasThreadChanges && !nextUpdatedAt) {
              return document;
            }

            return {
              ...document,
              commentThreadIds: hasThreadChanges
                ? appendUniqueIds(document.commentThreadIds, extraThreadIds)
                : document.commentThreadIds,
              lifecycle: nextUpdatedAt
                ? {
                    ...document.lifecycle,
                    updatedAt: nextUpdatedAt,
                  }
                : document.lifecycle,
            };
          }),
          commentThreads: mergeEntitiesById(graph.commentThreads, commentThreadOverlays),
          comments: mergeEntitiesById(graph.comments, commentOverlays),
        };
      }),
    [
      commentThreadsById,
      commentsById,
      documentCommentThreadIdsByDocumentId,
      documentUpdatedAtByDocumentId,
      initialWorkspaceGraphs,
    ],
  );

  const createBlockCommentThread = (input: CreateDocumentBlockCommentInput) => {
    const timestamp = input.createdAt ?? new Date().toISOString();
    const now = Date.parse(timestamp);
    const idSeed = `${input.documentId}_${now}`;
    const threadId = buildThreadId(input.documentId, input.anchor.blockId, now);
    const initialComment = createComment({
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      threadId,
      authorMembershipId: input.authorMembershipId,
      bodyMarkdown: input.bodyMarkdown,
      mentionedMembershipIds: input.mentionedMembershipIds,
      createdAt: timestamp,
      idSeed,
    });

    const nextThread: DocumentCommentThread = {
      id: threadId,
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      anchor: input.anchor,
      participantMembershipIds: Array.from(
        new Set([input.authorMembershipId, ...(input.mentionedMembershipIds ?? [])]),
      ),
      commentIds: [initialComment.id],
      linkedDocumentIds: input.linkedDocumentIds ?? [],
      triggeredReviewDocumentIds: input.triggeredReviewDocumentIds ?? [],
      lifecycle: {
        status: "open",
        createdAt: timestamp,
        updatedAt: timestamp,
        lastCommentAt: timestamp,
      },
    };

    setDocumentCommentThreadIdsByDocumentId((current) => ({
      ...current,
      [input.documentId]: appendUniqueIds(current[input.documentId], [nextThread.id]),
    }));
    setDocumentUpdatedAtByDocumentId((current) => ({
      ...current,
      [input.documentId]: timestamp,
    }));
    setCommentThreadsById((current) => ({
      ...current,
      [nextThread.id]: nextThread,
    }));
    setCommentsById((current) => ({
      ...current,
      [initialComment.id]: initialComment,
    }));

    return {
      thread: nextThread,
      comment: initialComment,
    };
  };

  const addCommentToThread = (input: CreateDocumentCommentReplyInput) => {
    const timestamp = input.createdAt ?? new Date().toISOString();
    const now = Date.parse(timestamp);
    const idSeed = `${input.threadId}_${now}`;
    const nextComment = createComment({
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      threadId: input.threadId,
      authorMembershipId: input.authorMembershipId,
      bodyMarkdown: input.bodyMarkdown,
      mentionedMembershipIds: input.mentionedMembershipIds,
      createdAt: timestamp,
      idSeed,
    });
    const existingThread =
      workspaceGraphs
        .find((graph) => graph.workspace.id === input.workspaceId)
        ?.commentThreads.find((thread) => thread.id === input.threadId) ?? null;

    if (!existingThread) {
      return nextComment;
    }

    const nextThread: DocumentCommentThread = {
      ...existingThread,
      participantMembershipIds: Array.from(
        new Set([
          ...existingThread.participantMembershipIds,
          input.authorMembershipId,
          ...(input.mentionedMembershipIds ?? []),
        ]),
      ),
      commentIds: [...existingThread.commentIds, nextComment.id],
      lifecycle: {
        ...existingThread.lifecycle,
        status: "open",
        updatedAt: timestamp,
        lastCommentAt: timestamp,
      },
    };

    setCommentThreadsById((current) => ({
      ...current,
      [nextThread.id]: nextThread,
    }));
    setCommentsById((current) => ({
      ...current,
      [nextComment.id]: nextComment,
    }));

    return nextComment;
  };

  return {
    workspaceGraphs,
    createBlockCommentThread,
    addCommentToThread,
  };
}
