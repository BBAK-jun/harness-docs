import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const workspaceRoleEnum = pgEnum("workspace_role", ["Lead", "Editor", "Reviewer"]);
export const workspaceStatusEnum = pgEnum("workspace_status", [
  "active",
  "provisioning",
  "archived",
]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "invited",
  "suspended",
  "removed",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "PRD",
  "UX Flow",
  "Technical Spec",
  "Policy/Decision",
]);
export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
]);
export const documentReviewStatusEnum = pgEnum("document_review_status", [
  "idle",
  "review_requested",
  "changes_requested",
  "approved",
]);
export const documentApprovalStateEnum = pgEnum("document_approval_state", [
  "not_requested",
  "pending",
  "approved",
  "changes_requested",
  "invalidated",
  "restored",
]);
export const publishStalenessStatusEnum = pgEnum("publish_staleness_status", ["current", "stale"]);
export const templateSourceEnum = pgEnum("template_source", ["system", "workspace"]);
export const templateStatusEnum = pgEnum("template_status", ["active", "archived"]);
export const approvalAuthorityEnum = pgEnum("approval_authority", [
  "lead",
  "required_reviewer",
  "optional_reviewer",
]);
export const approvalCandidateSourceEnum = pgEnum("approval_candidate_source", [
  "workspace_membership",
  "github_import",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", [
  "approved",
  "changes_requested",
  "restored",
]);
export const publishArtifactKindEnum = pgEnum("publish_artifact_kind", ["document", "template"]);
export const publishRecordStatusEnum = pgEnum("publish_record_status", [
  "draft",
  "ready_for_publish",
  "publishing",
  "published",
]);
export const publishNotificationKindEnum = pgEnum("publish_notification_kind", [
  "in_app",
  "webhook",
]);
export const publishNotificationStatusEnum = pgEnum("publish_notification_status", [
  "pending",
  "queued",
  "sent",
]);
export const publishPreflightStatusEnum = pgEnum("publish_preflight_status", [
  "ready",
  "ready_with_warnings",
  "blocked",
]);
export const aiProviderEnum = pgEnum("ai_provider", ["Codex", "Claude"]);
export const aiDraftKindEnum = pgEnum("ai_draft_kind", [
  "document_content",
  "document_links",
  "approver_suggestions",
  "publish_memo",
]);
export const aiDraftStatusEnum = pgEnum("ai_draft_status", [
  "proposed",
  "reviewed",
  "accepted",
  "rejected",
]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    avatarInitials: text("avatar_initials").notNull(),
    githubLogin: text("github_login").notNull(),
    primaryEmail: text("primary_email").notNull(),
    ...timestamps,
  },
  (table) => ({
    handleIdx: uniqueIndex("users_handle_idx").on(table.handle),
    githubLoginIdx: uniqueIndex("users_github_login_idx").on(table.githubLogin),
    primaryEmailIdx: uniqueIndex("users_primary_email_idx").on(table.primaryEmail),
  }),
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    status: workspaceStatusEnum("status").notNull().default("active"),
    docsRepoOwner: text("docs_repo_owner").notNull(),
    docsRepoName: text("docs_repo_name").notNull(),
    docsRepoDefaultBranch: text("docs_repo_default_branch").notNull(),
    githubInstallationId: bigint("github_installation_id", { mode: "number" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    leadMembershipId: text("lead_membership_id"),
    provisionedAt: timestamp("provisioned_at", { withTimezone: true }),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("workspaces_slug_idx").on(table.slug),
    repoIdx: uniqueIndex("workspaces_repo_idx").on(table.docsRepoOwner, table.docsRepoName),
    createdByIdx: index("workspaces_created_by_idx").on(table.createdByUserId),
  }),
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").notNull().default("active"),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    notificationWebhookUrl: text("notification_webhook_url"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    workspaceUserIdx: uniqueIndex("workspace_memberships_workspace_user_idx").on(
      table.workspaceId,
      table.userId,
    ),
    workspaceRoleIdx: index("workspace_memberships_workspace_role_idx").on(
      table.workspaceId,
      table.role,
    ),
  }),
);

export const templates = pgTable(
  "templates",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    documentType: documentTypeEnum("document_type").notNull(),
    source: templateSourceEnum("source").notNull(),
    status: templateStatusEnum("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    createdByMembershipId: text("created_by_membership_id")
      .notNull()
      .references(() => workspaceMemberships.id),
    authoringContext: jsonb("authoring_context").notNull().default({}),
    sections: jsonb("sections").notNull().default([]),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastPublishedCommitSha: text("last_published_commit_sha"),
    ...timestamps,
  },
  (table) => ({
    workspaceNameIdx: uniqueIndex("templates_workspace_name_idx").on(table.workspaceId, table.name),
    workspaceTypeIdx: index("templates_workspace_type_idx").on(
      table.workspaceId,
      table.documentType,
    ),
  }),
);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    type: documentTypeEnum("type").notNull(),
    status: documentStatusEnum("status").notNull().default("draft"),
    reviewStatus: documentReviewStatusEnum("review_status").notNull().default("idle"),
    approvalState: documentApprovalStateEnum("approval_state").notNull().default("not_requested"),
    freshnessStatus: publishStalenessStatusEnum("freshness_status").notNull().default("current"),
    staleRationaleRequired: boolean("stale_rationale_required").notNull().default(false),
    currentMarkdownSource: text("current_markdown_source").notNull(),
    ownerMembershipId: text("owner_membership_id")
      .notNull()
      .references(() => workspaceMemberships.id),
    createdByMembershipId: text("created_by_membership_id")
      .notNull()
      .references(() => workspaceMemberships.id),
    templateId: text("template_id")
      .notNull()
      .references(() => templates.id),
    activePublishRecordId: text("active_publish_record_id"),
    reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    lastReviewedByMembershipId: text("last_reviewed_by_membership_id").references(
      () => workspaceMemberships.id,
    ),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    staleEvaluatedAt: timestamp("stale_evaluated_at", { withTimezone: true }),
    staleSummary: text("stale_summary"),
    staleReasons: jsonb("stale_reasons").notNull().default([]),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    lastPublishedCommitSha: text("last_published_commit_sha"),
    ...timestamps,
  },
  (table) => ({
    workspaceSlugIdx: uniqueIndex("documents_workspace_slug_idx").on(table.workspaceId, table.slug),
    workspaceTypeIdx: index("documents_workspace_type_idx").on(table.workspaceId, table.type),
    workspaceStatusIdx: index("documents_workspace_status_idx").on(table.workspaceId, table.status),
  }),
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    markdownSource: text("markdown_source").notNull(),
    changedByMembershipId: text("changed_by_membership_id")
      .notNull()
      .references(() => workspaceMemberships.id),
    changeSummary: text("change_summary"),
    linkedDocumentIdsSnapshot: jsonb("linked_document_ids_snapshot").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentVersionIdx: uniqueIndex("document_versions_document_version_idx").on(
      table.documentId,
      table.versionNumber,
    ),
  }),
);

export const documentLinks = pgTable(
  "document_links",
  {
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    targetDocumentId: text("target_document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    relationshipKind: text("relationship_kind").notNull().default("reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      name: "document_links_pk",
      columns: [table.sourceDocumentId, table.targetDocumentId],
    }),
    sourceIdx: index("document_links_source_idx").on(table.sourceDocumentId),
    targetIdx: index("document_links_target_idx").on(table.targetDocumentId),
  }),
);

export const documentLocks = pgTable(
  "document_locks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    lockedByMembershipId: text("locked_by_membership_id")
      .notNull()
      .references(() => workspaceMemberships.id),
    acquiredFromArea: text("acquired_from_area").notNull(),
    inactivityTimeoutMinutes: integer("inactivity_timeout_minutes").notNull().default(30),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
    releasedByMembershipId: text("released_by_membership_id").references(
      () => workspaceMemberships.id,
    ),
    releaseReason: text("release_reason"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    documentIdx: index("document_locks_document_idx").on(table.documentId),
    activeIdx: index("document_locks_active_idx").on(table.documentId, table.expiresAt),
  }),
);

export const documentInvalidations = pgTable(
  "document_invalidations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    summary: text("summary").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    affectsApprovalIds: jsonb("affects_approval_ids").notNull().default([]),
    requiresReviewRequest: boolean("requires_review_request").notNull().default(true),
  },
  (table) => ({
    documentIdx: index("document_invalidations_document_idx").on(table.documentId),
    sourceIdx: index("document_invalidations_source_idx").on(table.sourceDocumentId),
  }),
);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    authority: approvalAuthorityEnum("authority").notNull(),
    source: approvalCandidateSourceEnum("source").notNull(),
    state: documentApprovalStateEnum("state").notNull().default("pending"),
    membershipId: text("membership_id").references(() => workspaceMemberships.id),
    githubCandidateLogin: text("github_candidate_login"),
    reviewerLabel: text("reviewer_label").notNull(),
    requestedByMembershipId: text("requested_by_membership_id").references(
      () => workspaceMemberships.id,
    ),
    decision: approvalDecisionEnum("decision"),
    decisionByMembershipId: text("decision_by_membership_id").references(
      () => workspaceMemberships.id,
    ),
    restorationByMembershipId: text("restoration_by_membership_id").references(
      () => workspaceMemberships.id,
    ),
    restoredFromApprovalId: text("restored_from_approval_id"),
    invalidatedByDocumentId: text("invalidated_by_document_id").references(() => documents.id),
    decisionNote: text("decision_note"),
    requestedAt: timestamp("requested_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    restoredAt: timestamp("restored_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    documentIdx: index("approval_requests_document_idx").on(table.documentId),
    stateIdx: index("approval_requests_state_idx").on(table.workspaceId, table.state),
  }),
);

export const approvalEvents = pgTable(
  "approval_events",
  {
    id: text("id").primaryKey(),
    approvalId: text("approval_id")
      .notNull()
      .references(() => approvalRequests.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    actorMembershipId: text("actor_membership_id").references(() => workspaceMemberships.id),
    note: text("note"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    approvalIdx: index("approval_events_approval_idx").on(table.approvalId, table.createdAt),
  }),
);

export const publishRecords = pgTable(
  "publish_records",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceKind: text("source_kind").notNull(),
    sourceDocumentId: text("source_document_id").references(() => documents.id),
    sourceTemplateId: text("source_template_id").references(() => templates.id),
    sourceLabel: text("source_label").notNull(),
    changeSummary: text("change_summary").notNull(),
    currentStageId: text("current_stage_id").notNull(),
    memoSuggestionId: text("memo_suggestion_id"),
    staleRationale: text("stale_rationale").notNull().default(""),
    status: publishRecordStatusEnum("status").notNull().default("draft"),
    initiatedByMembershipId: text("initiated_by_membership_id")
      .notNull()
      .references(() => workspaceMemberships.id),
    repositoryOwner: text("repository_owner").notNull(),
    repositoryName: text("repository_name").notNull(),
    defaultBranch: text("default_branch").notNull(),
    baseBranch: text("base_branch").notNull(),
    branchName: text("branch_name").notNull(),
    githubInstallationId: bigint("github_installation_id", { mode: "number" }),
    commitSha: text("commit_sha"),
    commitMessage: text("commit_message").notNull(),
    pullRequestNumber: integer("pull_request_number"),
    pullRequestTitle: text("pull_request_title").notNull(),
    pullRequestUrl: text("pull_request_url"),
    preflightStatus: publishPreflightStatusEnum("preflight_status").notNull().default("ready"),
    preflightSummary: text("preflight_summary").notNull().default(""),
    staleRationaleEntries: jsonb("stale_rationale_entries").notNull().default([]),
    unresolvedApprovalsSnapshot: jsonb("unresolved_approvals_snapshot").notNull().default([]),
    invalidationIdsSnapshot: jsonb("invalidation_ids_snapshot").notNull().default([]),
    preflightSnapshot: jsonb("preflight_snapshot").notNull().default({}),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    branchCreatedAt: timestamp("branch_created_at", { withTimezone: true }),
    commitCreatedAt: timestamp("commit_created_at", { withTimezone: true }),
    pullRequestCreatedAt: timestamp("pull_request_created_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    workspaceIdx: index("publish_records_workspace_idx").on(table.workspaceId, table.createdAt),
    statusIdx: index("publish_records_status_idx").on(table.workspaceId, table.status),
  }),
);

export const publishRecordArtifacts = pgTable(
  "publish_record_artifacts",
  {
    id: text("id").primaryKey(),
    publishRecordId: text("publish_record_id")
      .notNull()
      .references(() => publishRecords.id, { onDelete: "cascade" }),
    artifactKind: publishArtifactKindEnum("artifact_kind").notNull(),
    targetDocumentId: text("target_document_id").references(() => documents.id),
    targetTemplateId: text("target_template_id").references(() => templates.id),
    label: text("label").notNull(),
    documentType: documentTypeEnum("document_type"),
    changeSummary: text("change_summary").notNull(),
    linkedDocumentIdsSnapshot: jsonb("linked_document_ids_snapshot").notNull().default([]),
    stalenessStatus: publishStalenessStatusEnum("staleness_status"),
    unresolvedApprovalIdsSnapshot: jsonb("unresolved_approval_ids_snapshot").notNull().default([]),
    invalidationIdsSnapshot: jsonb("invalidation_ids_snapshot").notNull().default([]),
  },
  (table) => ({
    publishRecordIdx: index("publish_record_artifacts_publish_record_idx").on(
      table.publishRecordId,
    ),
  }),
);

export const publishNotifications = pgTable(
  "publish_notifications",
  {
    id: text("id").primaryKey(),
    publishRecordId: text("publish_record_id")
      .notNull()
      .references(() => publishRecords.id, { onDelete: "cascade" }),
    kind: publishNotificationKindEnum("kind").notNull(),
    label: text("label").notNull(),
    membershipId: text("membership_id").references(() => workspaceMemberships.id),
    destination: text("destination"),
    status: publishNotificationStatusEnum("status").notNull().default("pending"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    publishRecordIdx: index("publish_notifications_publish_record_idx").on(table.publishRecordId),
  }),
);

export const aiDrafts = pgTable(
  "ai_drafts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => documents.id),
    templateId: text("template_id").references(() => templates.id),
    provider: aiProviderEnum("provider").notNull(),
    kind: aiDraftKindEnum("kind").notNull(),
    status: aiDraftStatusEnum("status").notNull().default("proposed"),
    summary: text("summary").notNull(),
    promptLabel: text("prompt_label").notNull(),
    authoringContext: jsonb("authoring_context").notNull().default({}),
    sections: jsonb("sections").notNull().default([]),
    suggestedLinkedDocumentIds: jsonb("suggested_linked_document_ids").notNull().default([]),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    workspaceDocumentIdx: index("ai_drafts_workspace_document_idx").on(
      table.workspaceId,
      table.documentId,
    ),
  }),
);
