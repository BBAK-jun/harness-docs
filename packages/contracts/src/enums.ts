import { z } from "@hono/zod-openapi";

export const navigationAreaKeyValues = [
  "documents",
  "editor",
  "comments",
  "approvals",
  "publish",
  "ai",
] as const;
export type NavigationAreaKey = (typeof navigationAreaKeyValues)[number];

export const workspaceRoleValues = ["Lead", "Editor", "Reviewer"] as const;
export const workspaceRoleSchema = z.enum(workspaceRoleValues);
export type WorkspaceRole = (typeof workspaceRoleValues)[number];

export const membershipStatusValues = ["active", "invited", "suspended", "removed"] as const;
export const membershipStatusSchema = z.enum(membershipStatusValues);
export type MembershipStatus = (typeof membershipStatusValues)[number];

export const documentTypeValues = ["PRD", "UX Flow", "Technical Spec", "Policy/Decision"] as const;
export const documentTypeSchema = z.enum(documentTypeValues);
export type DocumentType = (typeof documentTypeValues)[number];

export const documentStoredStatusValues = ["draft", "publishing", "published_pr_created"] as const;
export const documentStoredStatusSchema = z.enum(documentStoredStatusValues);
export type DocumentStoredStatus = (typeof documentStoredStatusValues)[number];

export const documentFreshnessStatusValues = [
  "fresh",
  "stale",
  "sync_required",
  "validation_required",
  "metadata_refresh_required",
] as const;
export const documentFreshnessStatusSchema = z.enum(documentFreshnessStatusValues);
export type DocumentFreshnessStatus = (typeof documentFreshnessStatusValues)[number];

export const staleReasonCodeValues = [
  "updated_at_older_than_7_days",
  "source_has_newer_changes_than_last_synced_at",
  "last_synced_at_missing",
] as const;
export const staleReasonCodeSchema = z.enum(staleReasonCodeValues);
export type StaleReasonCode = (typeof staleReasonCodeValues)[number];

export const issueSeverityValues = ["info", "warning", "blocking"] as const;
export const issueSeveritySchema = z.enum(issueSeverityValues);
export type IssueSeverity = (typeof issueSeverityValues)[number];

export const documentValidationStatusValues = ["not_run", "passed", "failed"] as const;
export const documentValidationStatusSchema = z.enum(documentValidationStatusValues);
export type DocumentValidationStatus = (typeof documentValidationStatusValues)[number];

export const documentMetadataStatusValues = ["not_checked", "current", "outdated"] as const;
export const documentMetadataStatusSchema = z.enum(documentMetadataStatusValues);
export type DocumentMetadataStatus = (typeof documentMetadataStatusValues)[number];

export const publishEligibilityStatusValues = [
  "allowed",
  "requires_rationale",
  "blocked",
] as const;
export const publishEligibilityStatusSchema = z.enum(publishEligibilityStatusValues);
export type PublishEligibilityStatus = (typeof publishEligibilityStatusValues)[number];

export const publishBlockingIssueCodeValues = [
  "validation_failed",
  "metadata_refresh_required",
  "approval_missing",
  "approval_changes_requested",
  "document_not_found",
] as const;
export const publishBlockingIssueCodeSchema = z.enum(publishBlockingIssueCodeValues);
export type PublishBlockingIssueCode = (typeof publishBlockingIssueCodeValues)[number];

export const approvalAuthorityValues = [
  "lead",
  "required_reviewer",
  "optional_reviewer",
] as const;
export const approvalAuthoritySchema = z.enum(approvalAuthorityValues);
export type ApprovalAuthority = (typeof approvalAuthorityValues)[number];

export const approvalCandidateSourceValues = ["workspace_membership", "github_import"] as const;
export const approvalCandidateSourceSchema = z.enum(approvalCandidateSourceValues);
export type ApprovalCandidateSource = (typeof approvalCandidateSourceValues)[number];

export const approvalDecisionValues = ["approved", "changes_requested", "restored"] as const;
export const approvalDecisionSchema = z.enum(approvalDecisionValues);
export type ApprovalDecision = (typeof approvalDecisionValues)[number];

export const publishRecordSourceKindValues = ["workspace", "document", "template"] as const;
export const publishRecordSourceKindSchema = z.enum(publishRecordSourceKindValues);
export type PublishRecordSourceKind = (typeof publishRecordSourceKindValues)[number];

export const aiProviderValues = ["Codex", "Claude"] as const;
export const aiProviderSchema = z.enum(aiProviderValues);
export type AIProvider = (typeof aiProviderValues)[number];

export const authProviderValues = ["github_oauth"] as const;
export const authProviderSchema = z.enum(authProviderValues);
export type AuthProvider = (typeof authProviderValues)[number];
