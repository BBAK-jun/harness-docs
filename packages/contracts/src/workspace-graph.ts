import { z } from "@hono/zod-openapi";
import {
  aiProviderSchema,
  approvalAuthoritySchema,
  approvalCandidateSourceSchema,
  approvalDecisionSchema,
  documentTypeSchema,
  membershipStatusSchema,
  navigationAreaKeyValues,
  publishRecordSourceKindSchema,
  workspaceRoleSchema,
  type AIProvider,
  type ApprovalAuthority,
  type ApprovalCandidateSource,
  type ApprovalDecision,
  type DocumentType,
  type MembershipStatus,
  type WorkspaceRole,
} from "./enums";

export const navigationAreaValues = ["dashboard", ...navigationAreaKeyValues] as const;
export type NavigationArea = (typeof navigationAreaValues)[number];
export const navigationAreaSchema = z.enum(navigationAreaValues);

export const workspaceStatusValues = ["active", "provisioning", "archived"] as const;
export type WorkspaceStatus = (typeof workspaceStatusValues)[number];
export const workspaceStatusSchema = z.enum(workspaceStatusValues);

export const documentStatusValues = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;
export type DocumentStatus = (typeof documentStatusValues)[number];
export const documentStatusSchema = z.enum(documentStatusValues);

export const templateSourceValues = ["system", "workspace"] as const;
export type TemplateSource = (typeof templateSourceValues)[number];
export const templateSourceSchema = z.enum(templateSourceValues);

export const templateStatusValues = ["active", "archived"] as const;
export type TemplateStatus = (typeof templateStatusValues)[number];
export const templateStatusSchema = z.enum(templateStatusValues);

export const documentReviewStatusValues = [
  "idle",
  "review_requested",
  "changes_requested",
  "approved",
] as const;
export type DocumentReviewStatus = (typeof documentReviewStatusValues)[number];
export const documentReviewStatusSchema = z.enum(documentReviewStatusValues);

export const documentApprovalStateValues = [
  "not_requested",
  "pending",
  "approved",
  "changes_requested",
  "invalidated",
  "restored",
] as const;
export type DocumentApprovalState = (typeof documentApprovalStateValues)[number];
export const documentApprovalStateSchema = z.enum(documentApprovalStateValues);

export const publishStalenessStatusValues = ["current", "stale"] as const;
export type PublishStalenessStatus = (typeof publishStalenessStatusValues)[number];
export const publishStalenessStatusSchema = z.enum(publishStalenessStatusValues);

export const documentFreshnessReasonValues = [
  "linked_document_updated",
  "approval_invalidated",
  "publish_evaluation_pending",
] as const;
export type DocumentFreshnessReason = (typeof documentFreshnessReasonValues)[number];
export const documentFreshnessReasonSchema = z.enum(documentFreshnessReasonValues);

export const documentEditingLockStatusValues = ["active", "released", "expired"] as const;
export type DocumentEditingLockStatus = (typeof documentEditingLockStatusValues)[number];
export const documentEditingLockStatusSchema = z.enum(documentEditingLockStatusValues);

export const documentEditingReleaseReasonValues = [
  "manual_release",
  "timeout",
  "handoff",
  "publish_started",
] as const;
export type DocumentEditingReleaseReason = (typeof documentEditingReleaseReasonValues)[number];
export const documentEditingReleaseReasonSchema = z.enum(documentEditingReleaseReasonValues);

export const authoringIntentValues = [
  "create_document",
  "revise_document",
  "resolve_review",
  "prepare_publish",
] as const;
export type AuthoringIntent = (typeof authoringIntentValues)[number];
export const authoringIntentSchema = z.enum(authoringIntentValues);

export const contentSectionKindValues = [
  "summary",
  "narrative",
  "list",
  "checklist",
  "decision",
  "links",
] as const;
export type ContentSectionKind = (typeof contentSectionKindValues)[number];
export const contentSectionKindSchema = z.enum(contentSectionKindValues);

export const commentThreadStatusValues = ["open", "resolved"] as const;
export type CommentThreadStatus = (typeof commentThreadStatusValues)[number];
export const commentThreadStatusSchema = z.enum(commentThreadStatusValues);

export const commentMessageKindValues = ["comment", "system"] as const;
export type CommentMessageKind = (typeof commentMessageKindValues)[number];
export const commentMessageKindSchema = z.enum(commentMessageKindValues);

export const commentAnchorKindValues = ["paragraph", "block"] as const;
export type CommentAnchorKind = (typeof commentAnchorKindValues)[number];
export const commentAnchorKindSchema = z.enum(commentAnchorKindValues);

export const commentBlockKindValues = [
  "heading",
  "paragraph",
  "list_item",
  "checklist_item",
  "decision",
  "code_block",
] as const;
export type CommentBlockKind = (typeof commentBlockKindValues)[number];
export const commentBlockKindSchema = z.enum(commentBlockKindValues);

export const mentionDeliveryStatusValues = ["pending", "delivered", "read"] as const;
export type MentionDeliveryStatus = (typeof mentionDeliveryStatusValues)[number];
export const mentionDeliveryStatusSchema = z.enum(mentionDeliveryStatusValues);

export const publishArtifactKindValues = ["document", "template"] as const;
export type PublishArtifactKind = (typeof publishArtifactKindValues)[number];
export const publishArtifactKindSchema = z.enum(publishArtifactKindValues);

export const documentPrePublicationReadinessValues = [
  "ready",
  "attention_required",
  "blocked",
] as const;
export type DocumentPrePublicationReadiness =
  (typeof documentPrePublicationReadinessValues)[number];
export const documentPrePublicationReadinessSchema = z.enum(
  documentPrePublicationReadinessValues,
);

export const documentPrePublicationIssueSeverityValues = ["warning", "blocking"] as const;
export type DocumentPrePublicationIssueSeverity =
  (typeof documentPrePublicationIssueSeverityValues)[number];
export const documentPrePublicationIssueSeveritySchema = z.enum(
  documentPrePublicationIssueSeverityValues,
);

export const documentPrePublicationIssueKindValues = [
  "stale_rationale_required",
  "review_request_required",
  "approval_missing",
  "approval_pending",
  "changes_requested",
  "approval_invalidated",
  "active_edit_lock",
  "missing_repository_binding",
  "github_auth_required",
] as const;
export type DocumentPrePublicationIssueKind =
  (typeof documentPrePublicationIssueKindValues)[number];
export const documentPrePublicationIssueKindSchema = z.enum(
  documentPrePublicationIssueKindValues,
);

export const unresolvedApprovalStatusValues = ["missing", "pending", "rejected"] as const;
export type UnresolvedApprovalStatus = (typeof unresolvedApprovalStatusValues)[number];
export const unresolvedApprovalStatusSchema = z.enum(unresolvedApprovalStatusValues);

export const gitHubPublishEligibilityStatusValues = [
  "eligible",
  "eligible_with_warnings",
  "not_eligible",
] as const;
export type GitHubPublishEligibilityStatus =
  (typeof gitHubPublishEligibilityStatusValues)[number];
export const gitHubPublishEligibilityStatusSchema = z.enum(
  gitHubPublishEligibilityStatusValues,
);

export const publishFlowStageIdValues = [
  "scope",
  "freshness",
  "approvals",
  "memo",
  "github",
] as const;
export type PublishFlowStageId = (typeof publishFlowStageIdValues)[number];
export const publishFlowStageIdSchema = z.enum(publishFlowStageIdValues);

export const publishFlowStageStatusValues = [
  "pending",
  "ready",
  "attention",
  "complete",
] as const;
export type PublishFlowStageStatus = (typeof publishFlowStageStatusValues)[number];
export const publishFlowStageStatusSchema = z.enum(publishFlowStageStatusValues);

export const publishRecordStatusValues = [
  "draft",
  "ready_for_publish",
  "publishing",
  "published",
] as const;
export type PublishRecordStatus = (typeof publishRecordStatusValues)[number];
export const publishRecordStatusSchema = z.enum(publishRecordStatusValues);

export const publishNotificationKindValues = ["in_app", "webhook"] as const;
export type PublishNotificationKind = (typeof publishNotificationKindValues)[number];
export const publishNotificationKindSchema = z.enum(publishNotificationKindValues);

export const publishNotificationStatusValues = ["pending", "queued", "sent"] as const;
export type PublishNotificationStatus = (typeof publishNotificationStatusValues)[number];
export const publishNotificationStatusSchema = z.enum(publishNotificationStatusValues);

export const mentionSubjectKindValues = ["user", "role"] as const;
export type MentionSubjectKind = (typeof mentionSubjectKindValues)[number];
export const mentionSubjectKindSchema = z.enum(mentionSubjectKindValues);

export const mentionSourceKindValues = ["document_markdown", "comment_markdown"] as const;
export type MentionSourceKind = (typeof mentionSourceKindValues)[number];
export const mentionSourceKindSchema = z.enum(mentionSourceKindValues);

export const publishStaleRationaleEntryStatusValues = ["current", "outdated"] as const;
export type PublishStaleRationaleEntryStatus =
  (typeof publishStaleRationaleEntryStatusValues)[number];
export const publishStaleRationaleEntryStatusSchema = z.enum(
  publishStaleRationaleEntryStatusValues,
);

export const publishPreflightStatusValues = [
  "ready",
  "ready_with_warnings",
  "blocked",
] as const;
export type PublishPreflightStatus = (typeof publishPreflightStatusValues)[number];
export const publishPreflightStatusSchema = z.enum(publishPreflightStatusValues);

export const publishPreflightFindingKindValues = [
  "stale_rationale",
  "unresolved_approval",
] as const;
export type PublishPreflightFindingKind = (typeof publishPreflightFindingKindValues)[number];
export const publishPreflightFindingKindSchema = z.enum(
  publishPreflightFindingKindValues,
);

export interface LifecycleMetadata {
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export const lifecycleMetadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable().optional(),
});

export interface WorkspaceRepositoryBinding {
  owner: string;
  name: string;
  defaultBranch: string;
  installationId?: number | null;
}

export const workspaceRepositoryBindingSchema = z.object({
  owner: z.string(),
  name: z.string(),
  defaultBranch: z.string(),
  installationId: z.number().nullable().optional(),
});

export interface WorkspaceLifecycleMetadata extends LifecycleMetadata {
  status: WorkspaceStatus;
  provisionedAt?: string | null;
  lastOpenedAt?: string | null;
}

export const workspaceLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  status: workspaceStatusSchema,
  provisionedAt: z.string().nullable().optional(),
  lastOpenedAt: z.string().nullable().optional(),
});

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  docsRepository: WorkspaceRepositoryBinding;
  createdByUserId: string;
  leadMembershipId: string;
  membershipIds: string[];
  documentIds: string[];
  templateIds: string[];
  lifecycle: WorkspaceLifecycleMetadata;
}

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  docsRepository: workspaceRepositoryBindingSchema,
  createdByUserId: z.string(),
  leadMembershipId: z.string(),
  membershipIds: z.array(z.string()),
  documentIds: z.array(z.string()),
  templateIds: z.array(z.string()),
  lifecycle: workspaceLifecycleMetadataSchema,
});

export interface WorkspaceMembershipLifecycleMetadata extends LifecycleMetadata {
  status: MembershipStatus;
  invitedAt?: string | null;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  removedAt?: string | null;
}

export const workspaceMembershipLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  status: membershipStatusSchema,
  invitedAt: z.string().nullable().optional(),
  joinedAt: z.string().nullable().optional(),
  lastActiveAt: z.string().nullable().optional(),
  removedAt: z.string().nullable().optional(),
});

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedByUserId: string;
  notificationWebhookUrl?: string | null;
  lifecycle: WorkspaceMembershipLifecycleMetadata;
}

export const workspaceMembershipSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: workspaceRoleSchema,
  invitedByUserId: z.string(),
  notificationWebhookUrl: z.string().nullable().optional(),
  lifecycle: workspaceMembershipLifecycleMetadataSchema,
});

export interface DocumentEditingLockLifecycleMetadata extends LifecycleMetadata {
  status: DocumentEditingLockStatus;
  releasedAt?: string | null;
  expiredAt?: string | null;
}

export const documentEditingLockLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  status: documentEditingLockStatusSchema,
  releasedAt: z.string().nullable().optional(),
  expiredAt: z.string().nullable().optional(),
});

export interface DocumentEditingLock {
  id: string;
  workspaceId: string;
  documentId: string;
  lockedByMembershipId: string;
  acquiredFromArea: NavigationArea;
  inactivityTimeoutMinutes: number;
  acquiredAt: string;
  expiresAt: string;
  lastActivityAt: string;
  releasedByMembershipId?: string | null;
  releaseReason?: DocumentEditingReleaseReason | null;
  lifecycle: DocumentEditingLockLifecycleMetadata;
}

export const documentEditingLockSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  documentId: z.string(),
  lockedByMembershipId: z.string(),
  acquiredFromArea: navigationAreaSchema,
  inactivityTimeoutMinutes: z.number(),
  acquiredAt: z.string(),
  expiresAt: z.string(),
  lastActivityAt: z.string(),
  releasedByMembershipId: z.string().nullable().optional(),
  releaseReason: documentEditingReleaseReasonSchema.nullable().optional(),
  lifecycle: documentEditingLockLifecycleMetadataSchema,
});

export interface ContentStructureSection {
  id: string;
  title: string;
  kind: ContentSectionKind;
  summary: string;
  required: boolean;
  defaultMarkdown: string;
  guidance: string[];
  linkedDocumentTypeHints: DocumentType[];
}

export const contentStructureSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: contentSectionKindSchema,
  summary: z.string(),
  required: z.boolean(),
  defaultMarkdown: z.string(),
  guidance: z.array(z.string()),
  linkedDocumentTypeHints: z.array(documentTypeSchema),
});

export interface AuthoringContext {
  workspaceId: string;
  currentDocumentId?: string | null;
  templateId?: string | null;
  currentUserMembershipId: string;
  activeArea: NavigationArea;
  intent: AuthoringIntent;
  linkedDocumentIds: string[];
  invalidatedByDocumentIds: string[];
  referenceDocumentIds: string[];
}

export const authoringContextSchema = z.object({
  workspaceId: z.string(),
  currentDocumentId: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
  currentUserMembershipId: z.string(),
  activeArea: navigationAreaSchema,
  intent: authoringIntentSchema,
  linkedDocumentIds: z.array(z.string()),
  invalidatedByDocumentIds: z.array(z.string()),
  referenceDocumentIds: z.array(z.string()),
});

export interface TemplateLifecycleMetadata extends LifecycleMetadata {
  status: TemplateStatus;
  publishedAt?: string | null;
  lastPublishedCommitSha?: string | null;
}

export const templateLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  status: templateStatusSchema,
  publishedAt: z.string().nullable().optional(),
  lastPublishedCommitSha: z.string().nullable().optional(),
});

export interface DocumentTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  documentType: DocumentType;
  source: TemplateSource;
  version: number;
  createdByMembershipId: string;
  authoringContext: AuthoringContext;
  sections: ContentStructureSection[];
  lifecycle: TemplateLifecycleMetadata;
}

export const documentTemplateSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string(),
  documentType: documentTypeSchema,
  source: templateSourceSchema,
  version: z.number(),
  createdByMembershipId: z.string(),
  authoringContext: authoringContextSchema,
  sections: z.array(contentStructureSectionSchema),
  lifecycle: templateLifecycleMetadataSchema,
});

export interface MentionReference {
  subjectKind: MentionSubjectKind;
  rawText: string;
  normalizedKey: string;
  displayLabel: string;
  membershipId?: string | null;
  userId?: string | null;
  role?: WorkspaceRole | null;
}

export const mentionReferenceSchema = z.object({
  subjectKind: mentionSubjectKindSchema,
  rawText: z.string(),
  normalizedKey: z.string(),
  displayLabel: z.string(),
  membershipId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  role: workspaceRoleSchema.nullable().optional(),
});

export interface MentionParseRange {
  trigger: "@";
  startOffset: number;
  endOffset: number;
  line: number;
  column: number;
  blockId?: string | null;
}

export const mentionParseRangeSchema = z.object({
  trigger: z.literal("@"),
  startOffset: z.number(),
  endOffset: z.number(),
  line: z.number(),
  column: z.number(),
  blockId: z.string().nullable().optional(),
});

export interface MentionPrimitive {
  id: string;
  workspaceId: string;
  documentId: string;
  source: MentionSourceKind;
  reference: MentionReference;
  parse: MentionParseRange;
  createdAt: string;
}

export const mentionPrimitiveSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  documentId: z.string(),
  source: mentionSourceKindSchema,
  reference: mentionReferenceSchema,
  parse: mentionParseRangeSchema,
  createdAt: z.string(),
});

export interface DocumentContentMention extends MentionPrimitive {
  source: "document_markdown";
}

export const documentContentMentionSchema = mentionPrimitiveSchema.extend({
  source: z.literal("document_markdown"),
});

export interface DocumentCommentMention extends MentionPrimitive {
  source: "comment_markdown";
  threadId: string;
  commentId: string;
  deliveryStatus: MentionDeliveryStatus;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export const documentCommentMentionSchema = mentionPrimitiveSchema.extend({
  source: z.literal("comment_markdown"),
  threadId: z.string(),
  commentId: z.string(),
  deliveryStatus: mentionDeliveryStatusSchema,
  deliveredAt: z.string().nullable().optional(),
  readAt: z.string().nullable().optional(),
});

export interface DocumentCommentAnchor {
  documentId: string;
  kind: CommentAnchorKind;
  blockId: string;
  blockKind: CommentBlockKind;
  headingPath: string[];
  excerpt: string;
  startOffset?: number | null;
  endOffset?: number | null;
}

export const documentCommentAnchorSchema = z.object({
  documentId: z.string(),
  kind: commentAnchorKindSchema,
  blockId: z.string(),
  blockKind: commentBlockKindSchema,
  headingPath: z.array(z.string()),
  excerpt: z.string(),
  startOffset: z.number().nullable().optional(),
  endOffset: z.number().nullable().optional(),
});

export interface DocumentCommentLifecycleMetadata extends LifecycleMetadata {
  editedAt?: string | null;
  resolvedAt?: string | null;
}

export const documentCommentLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  editedAt: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
});

export interface DocumentComment {
  id: string;
  workspaceId: string;
  documentId: string;
  threadId: string;
  authorMembershipId: string;
  bodyMarkdown: string;
  kind: CommentMessageKind;
  mentions: DocumentCommentMention[];
  lifecycle: DocumentCommentLifecycleMetadata;
}

export const documentCommentSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  documentId: z.string(),
  threadId: z.string(),
  authorMembershipId: z.string(),
  bodyMarkdown: z.string(),
  kind: commentMessageKindSchema,
  mentions: z.array(documentCommentMentionSchema),
  lifecycle: documentCommentLifecycleMetadataSchema,
});

export interface DocumentCommentThreadLifecycleMetadata extends LifecycleMetadata {
  status: CommentThreadStatus;
  lastCommentAt: string;
  resolvedAt?: string | null;
  resolvedByMembershipId?: string | null;
  reopenedAt?: string | null;
}

export const documentCommentThreadLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  status: commentThreadStatusSchema,
  lastCommentAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
  resolvedByMembershipId: z.string().nullable().optional(),
  reopenedAt: z.string().nullable().optional(),
});

export interface DocumentCommentThread {
  id: string;
  workspaceId: string;
  documentId: string;
  anchor: DocumentCommentAnchor;
  participantMembershipIds: string[];
  commentIds: string[];
  linkedDocumentIds: string[];
  triggeredReviewDocumentIds: string[];
  lifecycle: DocumentCommentThreadLifecycleMetadata;
}

export const documentCommentThreadSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  documentId: z.string(),
  anchor: documentCommentAnchorSchema,
  participantMembershipIds: z.array(z.string()),
  commentIds: z.array(z.string()),
  linkedDocumentIds: z.array(z.string()),
  triggeredReviewDocumentIds: z.array(z.string()),
  lifecycle: documentCommentThreadLifecycleMetadataSchema,
});

export interface DocumentApprovalLifecycleMetadata extends LifecycleMetadata {
  state: DocumentApprovalState;
  requestedAt?: string | null;
  respondedAt?: string | null;
  invalidatedAt?: string | null;
  restoredAt?: string | null;
}

export const documentApprovalLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  state: documentApprovalStateSchema,
  requestedAt: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
  invalidatedAt: z.string().nullable().optional(),
  restoredAt: z.string().nullable().optional(),
});

export interface DocumentApproval {
  id: string;
  workspaceId: string;
  documentId: string;
  authority: ApprovalAuthority;
  source: ApprovalCandidateSource;
  membershipId?: string | null;
  githubCandidateLogin?: string | null;
  reviewerLabel: string;
  requestedByMembershipId?: string | null;
  decision: ApprovalDecision | null;
  decisionByMembershipId?: string | null;
  restorationByMembershipId?: string | null;
  restoredFromApprovalId?: string | null;
  invalidatedByDocumentId?: string | null;
  decisionNote?: string | null;
  lifecycle: DocumentApprovalLifecycleMetadata;
}

export const documentApprovalSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  documentId: z.string(),
  authority: approvalAuthoritySchema,
  source: approvalCandidateSourceSchema,
  membershipId: z.string().nullable().optional(),
  githubCandidateLogin: z.string().nullable().optional(),
  reviewerLabel: z.string(),
  requestedByMembershipId: z.string().nullable().optional(),
  decision: approvalDecisionSchema.nullable(),
  decisionByMembershipId: z.string().nullable().optional(),
  restorationByMembershipId: z.string().nullable().optional(),
  restoredFromApprovalId: z.string().nullable().optional(),
  invalidatedByDocumentId: z.string().nullable().optional(),
  decisionNote: z.string().nullable().optional(),
  lifecycle: documentApprovalLifecycleMetadataSchema,
});

export interface DocumentInvalidation {
  id: string;
  workspaceId: string;
  documentId: string;
  sourceDocumentId: string;
  reason: DocumentFreshnessReason;
  summary: string;
  detectedAt: string;
  affectsApprovalIds: string[];
  requiresReviewRequest: boolean;
}

export const documentInvalidationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  documentId: z.string(),
  sourceDocumentId: z.string(),
  reason: documentFreshnessReasonSchema,
  summary: z.string(),
  detectedAt: z.string(),
  affectsApprovalIds: z.array(z.string()),
  requiresReviewRequest: z.boolean(),
});

export interface DocumentFreshnessState {
  status: PublishStalenessStatus;
  evaluatedAt?: string | null;
  evaluatedByMembershipId?: string | null;
  staleSince?: string | null;
  rationaleRequired: boolean;
  summary: string;
  reasons: DocumentFreshnessReason[];
  invalidations: DocumentInvalidation[];
}

export const documentFreshnessStateSchema = z.object({
  status: publishStalenessStatusSchema,
  evaluatedAt: z.string().nullable().optional(),
  evaluatedByMembershipId: z.string().nullable().optional(),
  staleSince: z.string().nullable().optional(),
  rationaleRequired: z.boolean(),
  summary: z.string(),
  reasons: z.array(documentFreshnessReasonSchema),
  invalidations: z.array(documentInvalidationSchema),
});

export interface DocumentReviewState {
  status: DocumentReviewStatus;
  approvalState: DocumentApprovalState;
  requestedAt?: string | null;
  requestedByMembershipId?: string | null;
  lastReviewedAt?: string | null;
  lastReviewedByMembershipId?: string | null;
  approvedAt?: string | null;
  approverIds: string[];
  freshness: DocumentFreshnessState;
}

export const documentReviewStateSchema = z.object({
  status: documentReviewStatusSchema,
  approvalState: documentApprovalStateSchema,
  requestedAt: z.string().nullable().optional(),
  requestedByMembershipId: z.string().nullable().optional(),
  lastReviewedAt: z.string().nullable().optional(),
  lastReviewedByMembershipId: z.string().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  approverIds: z.array(z.string()),
  freshness: documentFreshnessStateSchema,
});

export interface DocumentLifecycleMetadata extends LifecycleMetadata {
  status: DocumentStatus;
  reviewStatus?: DocumentReviewStatus;
  reviewRequestedAt?: string | null;
  stalenessStatus?: PublishStalenessStatus;
  staleRationaleRequired?: boolean;
  staleEvaluatedAt?: string | null;
  review: DocumentReviewState;
  lastPublishedAt?: string | null;
  lastPublishedCommitSha?: string | null;
  activeEditLock?: DocumentEditingLock | null;
}

export const documentLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  status: documentStatusSchema,
  reviewStatus: documentReviewStatusSchema.optional(),
  reviewRequestedAt: z.string().nullable().optional(),
  stalenessStatus: publishStalenessStatusSchema.optional(),
  staleRationaleRequired: z.boolean().optional(),
  staleEvaluatedAt: z.string().nullable().optional(),
  review: documentReviewStateSchema,
  lastPublishedAt: z.string().nullable().optional(),
  lastPublishedCommitSha: z.string().nullable().optional(),
  activeEditLock: documentEditingLockSchema.nullable().optional(),
});

export interface PublishFlowStage {
  id: PublishFlowStageId;
  title: string;
  description: string;
  status: PublishFlowStageStatus;
  primaryAction: string;
  guidance: string[];
}

export const publishFlowStageSchema = z.object({
  id: publishFlowStageIdSchema,
  title: z.string(),
  description: z.string(),
  status: publishFlowStageStatusSchema,
  primaryAction: z.string(),
  guidance: z.array(z.string()),
});

export interface UnresolvedApprovalSnapshot {
  id: string;
  status: UnresolvedApprovalStatus;
  documentId: string;
  label: string;
  authority: ApprovalAuthority;
  summary: string;
  requiredAction: string;
  approvalId?: string | null;
  membershipId?: string | null;
  invalidationIds: string[];
}

export const unresolvedApprovalSnapshotSchema = z.object({
  id: z.string(),
  status: unresolvedApprovalStatusSchema,
  documentId: z.string(),
  label: z.string(),
  authority: approvalAuthoritySchema,
  summary: z.string(),
  requiredAction: z.string(),
  approvalId: z.string().nullable().optional(),
  membershipId: z.string().nullable().optional(),
  invalidationIds: z.array(z.string()),
});

export interface DocumentPrePublicationIssue {
  id: string;
  kind: DocumentPrePublicationIssueKind;
  severity: DocumentPrePublicationIssueSeverity;
  label: string;
  summary: string;
  requiredAction: string;
  relatedApprovalIds: string[];
  relatedInvalidationIds: string[];
}

export const documentPrePublicationIssueSchema = z.object({
  id: z.string(),
  kind: documentPrePublicationIssueKindSchema,
  severity: documentPrePublicationIssueSeveritySchema,
  label: z.string(),
  summary: z.string(),
  requiredAction: z.string(),
  relatedApprovalIds: z.array(z.string()),
  relatedInvalidationIds: z.array(z.string()),
});

export interface DocumentGitHubPublishEligibility {
  status: GitHubPublishEligibilityStatus;
  summary: string;
  repository?: WorkspaceRepositoryBinding | null;
  missingCapabilities: string[];
}

export const documentGitHubPublishEligibilitySchema = z.object({
  status: gitHubPublishEligibilityStatusSchema,
  summary: z.string(),
  repository: workspaceRepositoryBindingSchema.nullable().optional(),
  missingCapabilities: z.array(z.string()),
});

export interface DocumentPrePublicationState {
  readiness: DocumentPrePublicationReadiness;
  summary: string;
  evaluatedAt: string;
  evaluatedByMembershipId: string;
  publishRecordId?: string | null;
  stalePublishAllowed: boolean;
  staleRationaleRequired: boolean;
  unresolvedApprovalIds: string[];
  unresolvedApprovals?: UnresolvedApprovalSnapshot[];
  invalidationIds: string[];
  blockingIssues: DocumentPrePublicationIssue[];
  github: DocumentGitHubPublishEligibility;
}

export const documentPrePublicationStateSchema = z.object({
  readiness: documentPrePublicationReadinessSchema,
  summary: z.string(),
  evaluatedAt: z.string(),
  evaluatedByMembershipId: z.string(),
  publishRecordId: z.string().nullable().optional(),
  stalePublishAllowed: z.boolean(),
  staleRationaleRequired: z.boolean(),
  unresolvedApprovalIds: z.array(z.string()),
  unresolvedApprovals: z.array(unresolvedApprovalSnapshotSchema).optional(),
  invalidationIds: z.array(z.string()),
  blockingIssues: z.array(documentPrePublicationIssueSchema),
  github: documentGitHubPublishEligibilitySchema,
});

export interface PublishNotificationTarget {
  id: string;
  kind: PublishNotificationKind;
  label: string;
  membershipId?: string | null;
  destination?: string | null;
  status: PublishNotificationStatus;
}

export const publishNotificationTargetSchema = z.object({
  id: z.string(),
  kind: publishNotificationKindSchema,
  label: z.string(),
  membershipId: z.string().nullable().optional(),
  destination: z.string().nullable().optional(),
  status: publishNotificationStatusSchema,
});

export interface PublishRecordSource {
  kind: "workspace" | "document" | "template";
  workspaceId: string;
  documentId?: string | null;
  templateId?: string | null;
  label: string;
  changeSummary: string;
}

export const publishRecordSourceSchema = z.object({
  kind: publishRecordSourceKindSchema,
  workspaceId: z.string(),
  documentId: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
  label: z.string(),
  changeSummary: z.string(),
});

export interface PublishRepositoryMetadata {
  owner: string;
  name: string;
  defaultBranch: string;
  baseBranch: string;
  branchName: string;
  installationId?: number | null;
}

export const publishRepositoryMetadataSchema = z.object({
  owner: z.string(),
  name: z.string(),
  defaultBranch: z.string(),
  baseBranch: z.string(),
  branchName: z.string(),
  installationId: z.number().nullable().optional(),
});

export interface PublishCommitMetadata {
  sha?: string | null;
  message: string;
  authoredByMembershipId: string;
  authoredAt?: string | null;
}

export const publishCommitMetadataSchema = z.object({
  sha: z.string().nullable().optional(),
  message: z.string(),
  authoredByMembershipId: z.string(),
  authoredAt: z.string().nullable().optional(),
});

export interface PublishPullRequestMetadata {
  number?: number | null;
  title: string;
  url?: string | null;
  openedByMembershipId?: string | null;
  openedAt?: string | null;
}

export const publishPullRequestMetadataSchema = z.object({
  number: z.number().nullable().optional(),
  title: z.string(),
  url: z.string().nullable().optional(),
  openedByMembershipId: z.string().nullable().optional(),
  openedAt: z.string().nullable().optional(),
});

export interface PublishPreflightFinding {
  id: string;
  kind: PublishPreflightFindingKind;
  severity: DocumentPrePublicationIssueSeverity;
  label: string;
  summary: string;
  requiredAction: string;
  documentId?: string | null;
  approvalId?: string | null;
  invalidationId?: string | null;
  staleRationaleEntryId?: string | null;
}

export const publishPreflightFindingSchema = z.object({
  id: z.string(),
  kind: publishPreflightFindingKindSchema,
  severity: documentPrePublicationIssueSeveritySchema,
  label: z.string(),
  summary: z.string(),
  requiredAction: z.string(),
  documentId: z.string().nullable().optional(),
  approvalId: z.string().nullable().optional(),
  invalidationId: z.string().nullable().optional(),
  staleRationaleEntryId: z.string().nullable().optional(),
});

export interface PublishPreflightResult {
  status: PublishPreflightStatus;
  summary: string;
  staleDocumentIds: string[];
  unresolvedApprovalIds: string[];
  findings: PublishPreflightFinding[];
}

export const publishPreflightResultSchema = z.object({
  status: publishPreflightStatusSchema,
  summary: z.string(),
  staleDocumentIds: z.array(z.string()),
  unresolvedApprovalIds: z.array(z.string()),
  findings: z.array(publishPreflightFindingSchema),
});

export interface PublishAutomationMetadata {
  initiatedByMembershipId: string;
  repository: PublishRepositoryMetadata;
  commit: PublishCommitMetadata;
  pullRequest: PublishPullRequestMetadata;
  preflight: PublishPreflightResult;
}

export const publishAutomationMetadataSchema = z.object({
  initiatedByMembershipId: z.string(),
  repository: publishRepositoryMetadataSchema,
  commit: publishCommitMetadataSchema,
  pullRequest: publishPullRequestMetadataSchema,
  preflight: publishPreflightResultSchema,
});

export interface PublishRecordLifecycleMetadata extends LifecycleMetadata {
  status: PublishRecordStatus;
  validatedAt?: string | null;
  branchCreatedAt?: string | null;
  commitCreatedAt?: string | null;
  pullRequestCreatedAt?: string | null;
  pullRequestNumber?: number | null;
  publishedAt?: string | null;
}

export const publishRecordLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  status: publishRecordStatusSchema,
  validatedAt: z.string().nullable().optional(),
  branchCreatedAt: z.string().nullable().optional(),
  commitCreatedAt: z.string().nullable().optional(),
  pullRequestCreatedAt: z.string().nullable().optional(),
  pullRequestNumber: z.number().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});

export interface PublishStaleRationaleEntry {
  id: string;
  label: string;
  summary: string;
  status: PublishStaleRationaleEntryStatus;
  recordedAt: string;
  recordedByMembershipId: string;
  relatedDocumentId?: string | null;
  relatedInvalidationId?: string | null;
  relatedApprovalId?: string | null;
  supersededAt?: string | null;
  supersededByDocumentId?: string | null;
  supersededReason?: string | null;
}

export const publishStaleRationaleEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  summary: z.string(),
  status: publishStaleRationaleEntryStatusSchema,
  recordedAt: z.string(),
  recordedByMembershipId: z.string(),
  relatedDocumentId: z.string().nullable().optional(),
  relatedInvalidationId: z.string().nullable().optional(),
  relatedApprovalId: z.string().nullable().optional(),
  supersededAt: z.string().nullable().optional(),
  supersededByDocumentId: z.string().nullable().optional(),
  supersededReason: z.string().nullable().optional(),
});

export interface PublishArtifactRef {
  id: string;
  kind: PublishArtifactKind;
  targetId: string;
  label: string;
  documentType?: DocumentType | null;
  changeSummary: string;
  linkedDocumentIds: string[];
  stalenessStatus?: PublishStalenessStatus | null;
  unresolvedApprovalIds: string[];
  unresolvedApprovals?: UnresolvedApprovalSnapshot[];
  invalidationIds: string[];
}

export const publishArtifactRefSchema = z.object({
  id: z.string(),
  kind: publishArtifactKindSchema,
  targetId: z.string(),
  label: z.string(),
  documentType: documentTypeSchema.nullable().optional(),
  changeSummary: z.string(),
  linkedDocumentIds: z.array(z.string()),
  stalenessStatus: publishStalenessStatusSchema.nullable().optional(),
  unresolvedApprovalIds: z.array(z.string()),
  unresolvedApprovals: z.array(unresolvedApprovalSnapshotSchema).optional(),
  invalidationIds: z.array(z.string()),
});

export interface PublishRecord {
  id: string;
  workspaceId: string;
  source: PublishRecordSource;
  currentStageId: PublishFlowStageId;
  memoSuggestionId?: string | null;
  staleRationale: string;
  staleRationaleEntries: PublishStaleRationaleEntry[];
  stages: PublishFlowStage[];
  artifacts: PublishArtifactRef[];
  staleDocumentIds: string[];
  unresolvedApprovalIds: string[];
  unresolvedApprovals?: UnresolvedApprovalSnapshot[];
  invalidationIds: string[];
  notificationTargets: PublishNotificationTarget[];
  publication: PublishAutomationMetadata;
  lifecycle: PublishRecordLifecycleMetadata;
}

export const publishRecordSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  source: publishRecordSourceSchema,
  currentStageId: publishFlowStageIdSchema,
  memoSuggestionId: z.string().nullable().optional(),
  staleRationale: z.string(),
  staleRationaleEntries: z.array(publishStaleRationaleEntrySchema),
  stages: z.array(publishFlowStageSchema),
  artifacts: z.array(publishArtifactRefSchema),
  staleDocumentIds: z.array(z.string()),
  unresolvedApprovalIds: z.array(z.string()),
  unresolvedApprovals: z.array(unresolvedApprovalSnapshotSchema).optional(),
  invalidationIds: z.array(z.string()),
  notificationTargets: z.array(publishNotificationTargetSchema),
  publication: publishAutomationMetadataSchema,
  lifecycle: publishRecordLifecycleMetadataSchema,
});

export interface WorkspaceDocument {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  type: DocumentType;
  ownerMembershipId: string;
  createdByMembershipId: string;
  templateId: string;
  aiDraftSuggestionIds: string[];
  commentThreadIds: string[];
  markdownSource: string;
  mentions: DocumentContentMention[];
  linkedDocumentIds: string[];
  prePublication: DocumentPrePublicationState;
  lifecycle: DocumentLifecycleMetadata;
}

export const workspaceDocumentSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  slug: z.string(),
  type: documentTypeSchema,
  ownerMembershipId: z.string(),
  createdByMembershipId: z.string(),
  templateId: z.string(),
  aiDraftSuggestionIds: z.array(z.string()),
  commentThreadIds: z.array(z.string()),
  markdownSource: z.string(),
  mentions: z.array(documentContentMentionSchema),
  linkedDocumentIds: z.array(z.string()),
  prePublication: documentPrePublicationStateSchema,
  lifecycle: documentLifecycleMetadataSchema,
});

export interface AIDraftSuggestionLifecycleMetadata extends LifecycleMetadata {
  status: "proposed" | "reviewed" | "accepted" | "rejected";
  generatedAt: string;
  reviewedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
}

export type AIDraftSuggestionStatus =
  | "proposed"
  | "reviewed"
  | "accepted"
  | "rejected";

export const aiDraftSuggestionLifecycleStatusSchema = z.enum([
  "proposed",
  "reviewed",
  "accepted",
  "rejected",
]);

export const aiDraftSuggestionLifecycleMetadataSchema = lifecycleMetadataSchema.extend({
  status: aiDraftSuggestionLifecycleStatusSchema,
  generatedAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
  acceptedAt: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
});

export interface AIDraftSuggestionSection {
  sectionId: string;
  title: string;
  markdown: string;
  rationale: string;
}

export const aiDraftSuggestionSectionSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  markdown: z.string(),
  rationale: z.string(),
});

export interface AIDraftSuggestion {
  id: string;
  workspaceId: string;
  documentId: string;
  templateId: string;
  provider: AIProvider;
  kind: AIDraftSuggestionKind;
  summary: string;
  promptLabel: string;
  authoringContext: AuthoringContext;
  sections: AIDraftSuggestionSection[];
  suggestedLinkedDocumentIds: string[];
  lifecycle: AIDraftSuggestionLifecycleMetadata;
}

export type AIDraftSuggestionKind =
  | "document_content"
  | "document_links"
  | "approver_suggestions"
  | "publish_memo";

export const aiDraftSuggestionKindSchema = z.enum([
  "document_content",
  "document_links",
  "approver_suggestions",
  "publish_memo",
]);

export const aiDraftSuggestionSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  documentId: z.string(),
  templateId: z.string(),
  provider: aiProviderSchema,
  kind: aiDraftSuggestionKindSchema,
  summary: z.string(),
  promptLabel: z.string(),
  authoringContext: authoringContextSchema,
  sections: z.array(aiDraftSuggestionSectionSchema),
  suggestedLinkedDocumentIds: z.array(z.string()),
  lifecycle: aiDraftSuggestionLifecycleMetadataSchema,
});

export interface WorkspaceGraph {
  workspace: Workspace;
  memberships: WorkspaceMembership[];
  documents: WorkspaceDocument[];
  approvals: DocumentApproval[];
  documentLocks: DocumentEditingLock[];
  commentThreads: DocumentCommentThread[];
  comments: DocumentComment[];
  templates: DocumentTemplate[];
  aiDraftSuggestions: AIDraftSuggestion[];
  publishRecords: PublishRecord[];
}

export const workspaceGraphSchema = z.object({
  workspace: workspaceSchema,
  memberships: z.array(workspaceMembershipSchema),
  documents: z.array(workspaceDocumentSchema),
  approvals: z.array(documentApprovalSchema),
  documentLocks: z.array(documentEditingLockSchema),
  commentThreads: z.array(documentCommentThreadSchema),
  comments: z.array(documentCommentSchema),
  templates: z.array(documentTemplateSchema),
  aiDraftSuggestions: z.array(aiDraftSuggestionSchema),
  publishRecords: z.array(publishRecordSchema),
});
