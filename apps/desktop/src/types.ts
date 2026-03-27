export type NavigationArea =
  | "documents"
  | "editor"
  | "comments"
  | "approvals"
  | "publish"
  | "ai";

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

export type WorkspaceRole = "Lead" | "Editor" | "Reviewer";
export type WorkspaceStatus = "active" | "provisioning" | "archived";
export type MembershipStatus = "active" | "invited" | "suspended" | "removed";
export type DocumentType =
  | "PRD"
  | "UX Flow"
  | "Technical Spec"
  | "Policy/Decision";
export type DocumentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";
export type TemplateSource = "system" | "workspace";
export type TemplateStatus = "active" | "archived";
export type DocumentReviewStatus =
  | "idle"
  | "review_requested"
  | "changes_requested"
  | "approved";
export type DocumentApprovalState =
  | "not_requested"
  | "pending"
  | "approved"
  | "changes_requested"
  | "invalidated"
  | "restored";
export type DocumentApprovalAuthority = "lead" | "required_reviewer" | "optional_reviewer";
export type ApprovalCandidateSource = "workspace_membership" | "github_import";
export type ApprovalDecision = "approved" | "changes_requested" | "restored";
export type PublishStalenessStatus = "current" | "stale";
export type DocumentFreshnessReason =
  | "linked_document_updated"
  | "approval_invalidated"
  | "publish_evaluation_pending";
export type DocumentEditingLockStatus = "active" | "released" | "expired";
export type DocumentEditingReleaseReason =
  | "manual_release"
  | "timeout"
  | "handoff"
  | "publish_started";
export type AIProvider = "Codex" | "Claude";
export type AITaskEntryPointScope = "workspace" | "document" | "publish";
export type AITaskEntryPointContext =
  | "workspace_overview"
  | "document_library"
  | "document_workspace"
  | "publish_flow";
export type AIDraftSuggestionStatus =
  | "proposed"
  | "reviewed"
  | "accepted"
  | "rejected";
export type AIDraftSuggestionKind =
  | "document_content"
  | "document_links"
  | "approver_suggestions"
  | "publish_memo";
export type AuthoringIntent =
  | "create_document"
  | "revise_document"
  | "resolve_review"
  | "prepare_publish";
export type ContentSectionKind =
  | "summary"
  | "narrative"
  | "list"
  | "checklist"
  | "decision"
  | "links";
export type CommentThreadStatus = "open" | "resolved";
export type CommentMessageKind = "comment" | "system";
export type CommentAnchorKind = "paragraph" | "block";
export type CommentBlockKind =
  | "heading"
  | "paragraph"
  | "list_item"
  | "checklist_item"
  | "decision"
  | "code_block";
export type MentionDeliveryStatus = "pending" | "delivered" | "read";
export type PublishArtifactKind = "document" | "template";
export type DocumentPrePublicationReadiness =
  | "ready"
  | "attention_required"
  | "blocked";
export type DocumentPrePublicationIssueSeverity = "warning" | "blocking";
export type DocumentPrePublicationIssueKind =
  | "stale_rationale_required"
  | "review_request_required"
  | "approval_missing"
  | "approval_pending"
  | "changes_requested"
  | "approval_invalidated"
  | "active_edit_lock"
  | "missing_repository_binding"
  | "github_auth_required";
export type UnresolvedApprovalStatus = "missing" | "pending" | "rejected";
export type GitHubPublishEligibilityStatus =
  | "eligible"
  | "eligible_with_warnings"
  | "not_eligible";
export type PublishFlowStageId =
  | "scope"
  | "freshness"
  | "approvals"
  | "memo"
  | "github";
export type PublishFlowStageStatus = "pending" | "ready" | "attention" | "complete";
export type PublishRecordStatus =
  | "draft"
  | "ready_for_publish"
  | "publishing"
  | "published";
export type PublishNotificationKind = "in_app" | "webhook";
export type PublishNotificationStatus = "pending" | "queued" | "sent";
export type MentionSubjectKind = "user" | "role";
export type MentionSourceKind = "document_markdown" | "comment_markdown";
export type PublishRecordSourceKind = "workspace" | "document" | "template";
export type PublishStaleRationaleEntryStatus = "current" | "outdated";
export type PublishPreflightStatus = "ready" | "ready_with_warnings" | "blocked";
export type PublishPreflightFindingKind = "stale_rationale" | "unresolved_approval";

export interface SessionUser {
  id: UserId;
  name: string;
  handle: string;
  avatarInitials: string;
  githubLogin: string;
  primaryEmail: string;
}

export interface WorkspaceSummary {
  id: WorkspaceId;
  name: string;
  repo: string;
  role: WorkspaceRole;
  description: string;
  openReviews: number;
  pendingDrafts: number;
  staleDocuments: number;
  areas: Record<NavigationArea, WorkspaceAreaSummary>;
}

export interface WorkspaceAreaSummary {
  title: string;
  description: string;
  primaryAction: string;
  highlights: string[];
}

export interface LifecycleMetadata {
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface WorkspaceLifecycleMetadata extends LifecycleMetadata {
  status: WorkspaceStatus;
  provisionedAt?: string | null;
  lastOpenedAt?: string | null;
}

export interface TemplateLifecycleMetadata extends LifecycleMetadata {
  status: TemplateStatus;
  publishedAt?: string | null;
  lastPublishedCommitSha?: string | null;
}

export interface AIDraftSuggestionLifecycleMetadata extends LifecycleMetadata {
  status: AIDraftSuggestionStatus;
  generatedAt: string;
  reviewedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
}

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

export interface AuthoringContext {
  workspaceId: WorkspaceId;
  currentDocumentId?: DocumentId | null;
  templateId?: TemplateId | null;
  currentUserMembershipId: MembershipId;
  activeArea: NavigationArea;
  intent: AuthoringIntent;
  linkedDocumentIds: DocumentId[];
  invalidatedByDocumentIds: DocumentId[];
  referenceDocumentIds: DocumentId[];
}

export interface WorkspaceRepositoryBinding {
  owner: string;
  name: string;
  defaultBranch: string;
  installationId?: number | null;
}

export interface Workspace {
  id: WorkspaceId;
  name: string;
  slug: string;
  description: string;
  docsRepository: WorkspaceRepositoryBinding;
  createdByUserId: UserId;
  leadMembershipId: MembershipId;
  membershipIds: MembershipId[];
  documentIds: DocumentId[];
  templateIds: TemplateId[];
  lifecycle: WorkspaceLifecycleMetadata;
}

export interface WorkspaceMembershipLifecycleMetadata extends LifecycleMetadata {
  status: MembershipStatus;
  invitedAt?: string | null;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  removedAt?: string | null;
}

export interface WorkspaceMembership {
  id: MembershipId;
  workspaceId: WorkspaceId;
  userId: UserId;
  role: WorkspaceRole;
  invitedByUserId: UserId;
  notificationWebhookUrl?: string | null;
  lifecycle: WorkspaceMembershipLifecycleMetadata;
}

export interface DocumentEditingLockLifecycleMetadata extends LifecycleMetadata {
  status: DocumentEditingLockStatus;
  releasedAt?: string | null;
  expiredAt?: string | null;
}

export interface DocumentEditingLock {
  id: DocumentEditingLockId;
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  lockedByMembershipId: MembershipId;
  acquiredFromArea: NavigationArea;
  inactivityTimeoutMinutes: number;
  acquiredAt: string;
  expiresAt: string;
  lastActivityAt: string;
  releasedByMembershipId?: MembershipId | null;
  releaseReason?: DocumentEditingReleaseReason | null;
  lifecycle: DocumentEditingLockLifecycleMetadata;
}

export interface DocumentCommentAnchor {
  documentId: DocumentId;
  kind: CommentAnchorKind;
  blockId: DocumentBlockId;
  blockKind: CommentBlockKind;
  headingPath: string[];
  excerpt: string;
  startOffset?: number | null;
  endOffset?: number | null;
}

export interface DocumentBlockCommentAnchor
  extends Omit<DocumentCommentAnchor, "kind"> {
  kind: "block";
}

export interface MentionReference {
  subjectKind: MentionSubjectKind;
  rawText: string;
  normalizedKey: string;
  displayLabel: string;
  membershipId?: MembershipId | null;
  userId?: UserId | null;
  role?: WorkspaceRole | null;
}

export interface MentionParseRange {
  trigger: "@";
  startOffset: number;
  endOffset: number;
  line: number;
  column: number;
  blockId?: DocumentBlockId | null;
}

export interface MentionPrimitive {
  id: MentionId;
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  source: MentionSourceKind;
  reference: MentionReference;
  parse: MentionParseRange;
  createdAt: string;
}

export interface DocumentContentMention extends MentionPrimitive {
  source: "document_markdown";
}

export interface DocumentCommentMention extends MentionPrimitive {
  id: CommentMentionId;
  source: "comment_markdown";
  threadId: CommentThreadId;
  commentId: CommentId;
  deliveryStatus: MentionDeliveryStatus;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export interface DocumentCommentLifecycleMetadata extends LifecycleMetadata {
  editedAt?: string | null;
  resolvedAt?: string | null;
}

export interface DocumentComment {
  id: CommentId;
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  threadId: CommentThreadId;
  authorMembershipId: MembershipId;
  bodyMarkdown: string;
  kind: CommentMessageKind;
  mentions: DocumentCommentMention[];
  lifecycle: DocumentCommentLifecycleMetadata;
}

export interface DocumentCommentThreadLifecycleMetadata extends LifecycleMetadata {
  status: CommentThreadStatus;
  lastCommentAt: string;
  resolvedAt?: string | null;
  resolvedByMembershipId?: MembershipId | null;
  reopenedAt?: string | null;
}

export interface DocumentCommentThread {
  id: CommentThreadId;
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  anchor: DocumentCommentAnchor;
  participantMembershipIds: MembershipId[];
  commentIds: CommentId[];
  linkedDocumentIds: DocumentId[];
  triggeredReviewDocumentIds: DocumentId[];
  lifecycle: DocumentCommentThreadLifecycleMetadata;
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

export interface DocumentApprovalLifecycleMetadata extends LifecycleMetadata {
  state: DocumentApprovalState;
  requestedAt?: string | null;
  respondedAt?: string | null;
  invalidatedAt?: string | null;
  restoredAt?: string | null;
}

export interface DocumentApproval {
  id: ApprovalId;
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  authority: DocumentApprovalAuthority;
  source: ApprovalCandidateSource;
  membershipId?: MembershipId | null;
  githubCandidateLogin?: string | null;
  reviewerLabel: string;
  requestedByMembershipId?: MembershipId | null;
  decision: ApprovalDecision | null;
  decisionByMembershipId?: MembershipId | null;
  restorationByMembershipId?: MembershipId | null;
  restoredFromApprovalId?: ApprovalId | null;
  invalidatedByDocumentId?: DocumentId | null;
  decisionNote?: string | null;
  lifecycle: DocumentApprovalLifecycleMetadata;
}

export interface DocumentInvalidation {
  id: DocumentInvalidationId;
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  sourceDocumentId: DocumentId;
  reason: DocumentFreshnessReason;
  summary: string;
  detectedAt: string;
  affectsApprovalIds: ApprovalId[];
  requiresReviewRequest: boolean;
}

export interface DocumentFreshnessState {
  status: PublishStalenessStatus;
  evaluatedAt?: string | null;
  evaluatedByMembershipId?: MembershipId | null;
  staleSince?: string | null;
  rationaleRequired: boolean;
  summary: string;
  reasons: DocumentFreshnessReason[];
  invalidations: DocumentInvalidation[];
}

export interface DocumentReviewState {
  status: DocumentReviewStatus;
  approvalState: DocumentApprovalState;
  requestedAt?: string | null;
  requestedByMembershipId?: MembershipId | null;
  lastReviewedAt?: string | null;
  lastReviewedByMembershipId?: MembershipId | null;
  approvedAt?: string | null;
  approverIds: ApprovalId[];
  freshness: DocumentFreshnessState;
}

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

export interface PublishFlowStage {
  id: PublishFlowStageId;
  title: string;
  description: string;
  status: PublishFlowStageStatus;
  primaryAction: string;
  guidance: string[];
}

export interface PublishArtifactRef {
  id: string;
  kind: PublishArtifactKind;
  targetId: DocumentId | TemplateId;
  label: string;
  documentType?: DocumentType | null;
  changeSummary: string;
  linkedDocumentIds: DocumentId[];
  stalenessStatus?: PublishStalenessStatus | null;
  unresolvedApprovalIds: ApprovalId[];
  unresolvedApprovals?: UnresolvedApprovalSnapshot[];
  invalidationIds: DocumentInvalidationId[];
}

export interface UnresolvedApprovalSnapshot {
  id: string;
  status: UnresolvedApprovalStatus;
  documentId: DocumentId;
  label: string;
  authority: DocumentApprovalAuthority;
  summary: string;
  requiredAction: string;
  approvalId?: ApprovalId | null;
  membershipId?: MembershipId | null;
  invalidationIds: DocumentInvalidationId[];
}

export interface DocumentPrePublicationIssue {
  id: string;
  kind: DocumentPrePublicationIssueKind;
  severity: DocumentPrePublicationIssueSeverity;
  label: string;
  summary: string;
  requiredAction: string;
  relatedApprovalIds: ApprovalId[];
  relatedInvalidationIds: DocumentInvalidationId[];
}

export interface DocumentGitHubPublishEligibility {
  status: GitHubPublishEligibilityStatus;
  summary: string;
  repository?: WorkspaceRepositoryBinding | null;
  missingCapabilities: string[];
}

export interface DocumentPrePublicationState {
  readiness: DocumentPrePublicationReadiness;
  summary: string;
  evaluatedAt: string;
  evaluatedByMembershipId: MembershipId;
  publishRecordId?: PublishRecordId | null;
  stalePublishAllowed: boolean;
  staleRationaleRequired: boolean;
  unresolvedApprovalIds: ApprovalId[];
  unresolvedApprovals?: UnresolvedApprovalSnapshot[];
  invalidationIds: DocumentInvalidationId[];
  blockingIssues: DocumentPrePublicationIssue[];
  github: DocumentGitHubPublishEligibility;
}

export interface PublishNotificationTarget {
  id: string;
  kind: PublishNotificationKind;
  label: string;
  membershipId?: MembershipId | null;
  destination?: string | null;
  status: PublishNotificationStatus;
}

export interface PublishRecordSource {
  kind: PublishRecordSourceKind;
  workspaceId: WorkspaceId;
  documentId?: DocumentId | null;
  templateId?: TemplateId | null;
  label: string;
  changeSummary: string;
}

export interface PublishRepositoryMetadata {
  owner: string;
  name: string;
  defaultBranch: string;
  baseBranch: string;
  branchName: string;
  installationId?: number | null;
}

export interface PublishCommitMetadata {
  sha?: string | null;
  message: string;
  authoredByMembershipId: MembershipId;
  authoredAt?: string | null;
}

export interface PublishPullRequestMetadata {
  number?: number | null;
  title: string;
  url?: string | null;
  openedByMembershipId?: MembershipId | null;
  openedAt?: string | null;
}

export interface PublishPreflightFinding {
  id: string;
  kind: PublishPreflightFindingKind;
  severity: DocumentPrePublicationIssueSeverity;
  label: string;
  summary: string;
  requiredAction: string;
  documentId?: DocumentId | null;
  approvalId?: ApprovalId | null;
  invalidationId?: DocumentInvalidationId | null;
  staleRationaleEntryId?: string | null;
}

export interface PublishPreflightResult {
  status: PublishPreflightStatus;
  summary: string;
  staleDocumentIds: DocumentId[];
  unresolvedApprovalIds: ApprovalId[];
  findings: PublishPreflightFinding[];
}

export interface PublishAutomationMetadata {
  initiatedByMembershipId: MembershipId;
  repository: PublishRepositoryMetadata;
  commit: PublishCommitMetadata;
  pullRequest: PublishPullRequestMetadata;
  preflight: PublishPreflightResult;
}

export interface PublishRecordLifecycleMetadata extends LifecycleMetadata {
  status: PublishRecordStatus;
  validatedAt?: string | null;
  branchCreatedAt?: string | null;
  commitCreatedAt?: string | null;
  pullRequestCreatedAt?: string | null;
  pullRequestNumber?: number | null;
  publishedAt?: string | null;
}

export interface PublishStaleRationaleEntry {
  id: string;
  label: string;
  summary: string;
  status: PublishStaleRationaleEntryStatus;
  recordedAt: string;
  recordedByMembershipId: MembershipId;
  relatedDocumentId?: DocumentId | null;
  relatedInvalidationId?: DocumentInvalidationId | null;
  relatedApprovalId?: ApprovalId | null;
  supersededAt?: string | null;
  supersededByDocumentId?: DocumentId | null;
  supersededReason?: string | null;
}

export interface PublishRecord {
  id: PublishRecordId;
  workspaceId: WorkspaceId;
  source: PublishRecordSource;
  currentStageId: PublishFlowStageId;
  memoSuggestionId?: AIDraftSuggestionId | null;
  staleRationale: string;
  staleRationaleEntries: PublishStaleRationaleEntry[];
  stages: PublishFlowStage[];
  artifacts: PublishArtifactRef[];
  staleDocumentIds: DocumentId[];
  unresolvedApprovalIds: ApprovalId[];
  unresolvedApprovals?: UnresolvedApprovalSnapshot[];
  invalidationIds: DocumentInvalidationId[];
  notificationTargets: PublishNotificationTarget[];
  publication: PublishAutomationMetadata;
  lifecycle: PublishRecordLifecycleMetadata;
}

export interface WorkspaceDocument {
  id: DocumentId;
  workspaceId: WorkspaceId;
  title: string;
  slug: string;
  type: DocumentType;
  ownerMembershipId: MembershipId;
  createdByMembershipId: MembershipId;
  templateId: TemplateId;
  aiDraftSuggestionIds: AIDraftSuggestionId[];
  commentThreadIds: CommentThreadId[];
  markdownSource: string;
  mentions: DocumentContentMention[];
  linkedDocumentIds: DocumentId[];
  prePublication: DocumentPrePublicationState;
  lifecycle: DocumentLifecycleMetadata;
}

export interface DocumentTemplate {
  id: TemplateId;
  workspaceId: WorkspaceId;
  name: string;
  description: string;
  documentType: DocumentType;
  source: TemplateSource;
  version: number;
  createdByMembershipId: MembershipId;
  authoringContext: AuthoringContext;
  sections: ContentStructureSection[];
  lifecycle: TemplateLifecycleMetadata;
}

export interface AIDraftSuggestionSection {
  sectionId: string;
  title: string;
  markdown: string;
  rationale: string;
}

export interface AIDraftSuggestion {
  id: AIDraftSuggestionId;
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  templateId: TemplateId;
  provider: AIProvider;
  kind: AIDraftSuggestionKind;
  summary: string;
  promptLabel: string;
  authoringContext: AuthoringContext;
  sections: AIDraftSuggestionSection[];
  suggestedLinkedDocumentIds: DocumentId[];
  lifecycle: AIDraftSuggestionLifecycleMetadata;
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
