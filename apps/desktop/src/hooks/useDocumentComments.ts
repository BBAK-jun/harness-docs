import { useEffect, useMemo, useState } from "react";
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

function collectInitialCommentState(workspaceGraphs: WorkspaceGraph[]) {
  return workspaceGraphs;
}

export function useDocumentComments(initialWorkspaceGraphs: WorkspaceGraph[]) {
  const initialGraphs = useMemo(
    () => collectInitialCommentState(initialWorkspaceGraphs),
    [initialWorkspaceGraphs],
  );
  const [workspaceGraphs, setWorkspaceGraphs] = useState<WorkspaceGraph[]>(initialGraphs);

  useEffect(() => {
    setWorkspaceGraphs(initialGraphs);
  }, [initialGraphs]);

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

    setWorkspaceGraphs((current) =>
      current.map((graph) => {
        if (graph.workspace.id !== input.workspaceId) {
          return graph;
        }

        return {
          ...graph,
          documents: graph.documents.map((document) =>
            document.id === input.documentId
              ? {
                  ...document,
                  commentThreadIds: Array.from(
                    new Set([...document.commentThreadIds, nextThread.id]),
                  ),
                  lifecycle: {
                    ...document.lifecycle,
                    updatedAt: timestamp,
                  },
                }
              : document,
          ),
          commentThreads: [...graph.commentThreads, nextThread],
          comments: [...graph.comments, initialComment],
        };
      }),
    );

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

    setWorkspaceGraphs((current) =>
      current.map((graph) => {
        if (graph.workspace.id !== input.workspaceId) {
          return graph;
        }

        return {
          ...graph,
          commentThreads: graph.commentThreads.map((thread) =>
            thread.id === input.threadId
              ? {
                  ...thread,
                  participantMembershipIds: Array.from(
                    new Set([
                      ...thread.participantMembershipIds,
                      input.authorMembershipId,
                      ...(input.mentionedMembershipIds ?? []),
                    ]),
                  ),
                  commentIds: [...thread.commentIds, nextComment.id],
                  lifecycle: {
                    ...thread.lifecycle,
                    status: "open",
                    updatedAt: timestamp,
                    lastCommentAt: timestamp,
                  },
                }
              : thread,
          ),
          comments: [...graph.comments, nextComment],
        };
      }),
    );

    return nextComment;
  };

  return {
    workspaceGraphs,
    setWorkspaceGraphs,
    createBlockCommentThread,
    addCommentToThread,
  };
}
