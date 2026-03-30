// Desktop-local UI and interaction types. These do not belong in shared
// contracts because they model client-only entry points, form inputs, and
// ergonomic id aliases used by the desktop package.
import type {
  AIDraftSuggestionKind,
  AIProvider,
  AuthoringIntent,
  DocumentCommentAnchor,
} from "./contracts";

export type WorkspaceId = string;
export type MembershipId = string;
export type DocumentId = string;
export type UserId = string;
export type TemplateId = string;
export type AIDraftSuggestionId = string;
export type DocumentEditingLockId = string;
export type CommentThreadId = string;
export type CommentId = string;
export type MentionId = string;
export type CommentMentionId = MentionId;
export type DocumentBlockId = string;
export type ApprovalId = string;
export type DocumentInvalidationId = string;
export type PublishRecordId = string;

export type AIDraftSuggestionStatus = "proposed" | "reviewed" | "accepted" | "rejected";

export interface EditorAIDraftProposal {
  recommendation: string;
  draftMarkdown: string;
  notes: string | null;
}

export type AITaskEntryPointScope = "workspace" | "document" | "publish";
export type AITaskEntryPointContext =
  | "workspace_overview"
  | "document_library"
  | "document_workspace"
  | "publish_flow";

export interface DocumentBlockCommentAnchor extends Omit<DocumentCommentAnchor, "kind"> {
  kind: "block";
}

export interface CreateDocumentBlockCommentInput {
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  authorMembershipId: MembershipId;
  bodyMarkdown: string;
  anchor: DocumentBlockCommentAnchor;
  mentionedMembershipIds?: MembershipId[];
  linkedDocumentIds?: DocumentId[];
  triggeredReviewDocumentIds?: DocumentId[];
  createdAt?: string;
}

export interface CreateDocumentCommentReplyInput {
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  threadId: CommentThreadId;
  authorMembershipId: MembershipId;
  bodyMarkdown: string;
  mentionedMembershipIds?: MembershipId[];
  createdAt?: string;
}

export interface AITaskEntryPoint {
  id: string;
  workspaceId: WorkspaceId;
  documentId?: DocumentId | null;
  publishRecordId?: PublishRecordId | null;
  scope: AITaskEntryPointScope;
  discoverableFrom: AITaskEntryPointContext[];
  provider: AIProvider;
  kind: AIDraftSuggestionKind;
  title: string;
  description: string;
  triggerLabel: string;
  contextLabel: string;
  suggestedIntent: AuthoringIntent;
  referenceDocumentIds: DocumentId[];
  invalidatedByDocumentIds: DocumentId[];
  existingSuggestionIds: AIDraftSuggestionId[];
}
