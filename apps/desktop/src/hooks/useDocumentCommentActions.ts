import type {
  CommentBlockKind,
  ContentSectionKind,
  WorkspaceDocument,
  WorkspaceGraph,
} from "../types/contracts";
import type {
  CreateDocumentBlockCommentInput,
  DocumentBlockCommentAnchor,
  MembershipId,
} from "../types/domain-ui";

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

interface UseDocumentCommentActionsOptions {
  activeMembershipId: MembershipId | null;
  activeWorkspaceGraph: WorkspaceGraph | null;
  createBlockCommentThread: (input: CreateDocumentBlockCommentInput) => unknown;
}

export function useDocumentCommentActions(options: UseDocumentCommentActionsOptions) {
  const handleCreateBlockComment = (document: WorkspaceDocument, bodyMarkdown: string) => {
    if (
      !options.activeMembershipId ||
      !options.activeWorkspaceGraph ||
      bodyMarkdown.trim().length === 0
    ) {
      return;
    }

    options.createBlockCommentThread({
      workspaceId: document.workspaceId,
      documentId: document.id,
      authorMembershipId: options.activeMembershipId,
      bodyMarkdown,
      anchor: buildDefaultBlockCommentAnchor(options.activeWorkspaceGraph, document),
      linkedDocumentIds: document.linkedDocumentIds,
      triggeredReviewDocumentIds: document.linkedDocumentIds,
    });
  };

  return {
    handleCreateBlockComment,
  };
}
