import { z } from "@hono/zod-openapi";
import {
  aiProviderSchema,
  approvalAuthoritySchema,
  approvalCandidateSourceSchema,
  approvalDecisionSchema as approvalDecisionValueSchema,
  authProviderSchema,
  documentTypeSchema,
  workspaceInvitationRoleSchema,
  workspaceInvitationStatusSchema,
  publishRecordSourceKindSchema,
  workspaceRoleSchema,
  type AuthProvider,
  type NavigationAreaKey,
  type WorkspaceInvitationRole,
  type WorkspaceInvitationStatus,
  type WorkspaceRole,
} from "./enums";
import {
  workspaceGraphSchema,
  workspaceDocumentSchema,
  documentApprovalSchema,
  publishRecordSchema,
  type DocumentApproval,
  type PublishRecord,
  type WorkspaceDocument,
  type WorkspaceGraph,
} from "./workspace-graph";

export * from "./enums";
export * from "./publish-governance";
export * from "./workspace-graph";

export interface SessionUserDto {
  id: string;
  name: string;
  handle: string;
  avatarInitials: string;
  githubLogin: string;
  primaryEmail: string;
}

export interface AuthenticationProviderDto {
  id: AuthProvider;
  label: "GitHub OAuth";
  kind: "oauth";
}

export interface AuthenticatedApiSessionDto {
  status: "authenticated";
  provider: AuthenticationProviderDto;
  user: SessionUserDto;
  sessionToken: string;
  expiresAt: string;
}

export interface SignedOutApiSessionDto {
  status: "signed_out";
  provider: AuthenticationProviderDto;
  user: null;
  sessionToken: null;
  expiresAt: null;
}

export type ApiAuthenticationSessionDto = AuthenticatedApiSessionDto | SignedOutApiSessionDto;

export interface GitHubOAuthStartDto {
  attemptId: string;
  authorizationUrl: string;
  expiresAt: string;
  pollIntervalMs: number;
}

export interface GitHubOAuthPendingAttemptDto {
  status: "pending";
  expiresAt: string;
  completedAt: null;
  error: null;
  session: null;
}

export interface GitHubOAuthAuthenticatedAttemptDto {
  status: "authenticated";
  expiresAt: string;
  completedAt: string;
  error: null;
  session: AuthenticatedApiSessionDto;
}

export interface GitHubOAuthFailedAttemptDto {
  status: "failed" | "expired";
  expiresAt: string;
  completedAt: string | null;
  error: string;
  session: null;
}

export type GitHubOAuthAttemptDto =
  | GitHubOAuthPendingAttemptDto
  | GitHubOAuthAuthenticatedAttemptDto
  | GitHubOAuthFailedAttemptDto;

export interface WorkspaceAreaSummaryDto {
  title: string;
  description: string;
  primaryAction: string;
  highlights: string[];
}

export interface WorkspaceSummaryDto {
  id: string;
  name: string;
  repo: string;
  role: WorkspaceRole;
  description: string;
  openReviews: number;
  pendingDrafts: number;
  staleDocuments: number;
  areas: Record<NavigationAreaKey, WorkspaceAreaSummaryDto>;
}

export interface BootstrapSessionDto {
  user: SessionUserDto;
  workspaces: WorkspaceSummaryDto[];
  workspaceGraphs: WorkspaceGraph[];
  lastActiveWorkspaceId: string | null;
}

export interface WorkspaceGraphEnvelopeDto {
  workspaceGraph: WorkspaceGraph;
}

export interface WorkspaceDocumentsEnvelopeDto {
  documents: WorkspaceDocument[];
}

export interface WorkspaceApprovalsEnvelopeDto {
  approvals: DocumentApproval[];
}

export interface WorkspacePublishRecordsEnvelopeDto {
  publishRecords: PublishRecord[];
}

export interface ApiResponseMeta {
  requestId: string | null;
  timestamp: string;
  path: string;
  method: string;
  status: number;
}

export interface ApiErrorDescriptor<TCode extends string = string, TDetails = unknown> {
  code: TCode;
  message: string;
  details?: TDetails;
}

export interface ApiSuccessResponse<TData> {
  ok: true;
  data: TData;
  error: null;
  meta: ApiResponseMeta;
}

export interface ApiErrorResponse<TCode extends string = string, TDetails = unknown> {
  ok: false;
  data: null;
  error: ApiErrorDescriptor<TCode, TDetails>;
  meta: ApiResponseMeta;
}

export type ApiResponse<TData, TCode extends string = string, TDetails = unknown> =
  | ApiSuccessResponse<TData>
  | ApiErrorResponse<TCode, TDetails>;

export interface HealthCheckDto {
  service: string;
  status: "ok";
  transport: "hono-rpc";
}

export interface WorkspaceCatalogEnvelopeDto {
  workspaces: WorkspaceSummaryDto[];
}

export interface IntakePreviewDto {
  summary: string;
  recommendedRoute: string;
  recommendedArtifacts: string[];
  nextAction: string;
}

export interface WorkspaceMutationEnvelopeDto {
  workspace: WorkspaceSummaryDto;
  workspaceGraph: WorkspaceGraph;
  lastActiveWorkspaceId: string | null;
}

export interface WorkspaceOnboardingEnvelopeDto {
  workspace: WorkspaceSummaryDto;
  bootstrap: BootstrapSessionDto;
  lastActiveWorkspaceId: string | null;
}

export interface WorkspaceInvitationDto {
  id: string;
  workspaceId: string;
  invitationCode: string;
  role: WorkspaceInvitationRole;
  status: WorkspaceInvitationStatus;
  invitedByUserId: string;
  acceptedByUserId: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInvitationEnvelopeDto {
  invitation: WorkspaceInvitationDto;
}

export interface DocumentMutationEnvelopeDto {
  document: WorkspaceDocument;
  workspaceGraph: WorkspaceGraph;
}

export interface ApprovalMutationEnvelopeDto {
  approval: DocumentApproval;
  workspaceGraph: WorkspaceGraph;
}

export interface PublishRecordMutationEnvelopeDto {
  publishRecord: PublishRecord;
  workspaceGraph: WorkspaceGraph;
}

export interface PublishExecutionResultDto {
  repository: string;
  localRepoPath: string;
  branchName: string;
  commitSha: string | null;
  pullRequestNumber: number | null;
  pullRequestUrl: string | null;
  committedFiles: string[];
  startedAt: string;
  completedAt: string;
}

export interface PublishExecutionEnvelopeDto {
  publishRecord: PublishRecord;
  execution: PublishExecutionResultDto;
  workspaceGraph: WorkspaceGraph;
}

export interface AuthSessionExchangeRequestDto {
  provider: AuthProvider;
  identity: {
    login: string;
    name: string;
    email: string | null;
  };
}

export const workspaceAreaSummarySchema = z.object({
  title: z.string(),
  description: z.string(),
  primaryAction: z.string(),
  highlights: z.array(z.string()),
});

export const workspaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  repo: z.string(),
  role: workspaceRoleSchema,
  description: z.string(),
  openReviews: z.number(),
  pendingDrafts: z.number(),
  staleDocuments: z.number(),
  areas: z.record(z.string(), workspaceAreaSummarySchema),
});

export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarInitials: z.string(),
  githubLogin: z.string(),
  primaryEmail: z.string(),
});

export const bootstrapSessionSchema = z.object({
  user: sessionUserSchema,
  workspaces: z.array(workspaceSummarySchema),
  workspaceGraphs: z.array(workspaceGraphSchema),
  lastActiveWorkspaceId: z.string().nullable(),
});

export const healthCheckSchema = z.object({
  service: z.string(),
  status: z.literal("ok"),
  transport: z.literal("hono-rpc"),
});

export const workspaceCatalogEnvelopeSchema = z.object({
  workspaces: z.array(workspaceSummarySchema),
});

export const workspaceGraphEnvelopeSchema = z.object({
  workspaceGraph: workspaceGraphSchema,
});

export const workspaceDocumentsEnvelopeSchema = z.object({
  documents: z.array(workspaceDocumentSchema),
});

export const workspaceApprovalsEnvelopeSchema = z.object({
  approvals: z.array(documentApprovalSchema),
});

export const workspacePublishRecordsEnvelopeSchema = z.object({
  publishRecords: z.array(publishRecordSchema),
});

export const intakePreviewSchema = z.object({
  summary: z.string(),
  recommendedRoute: z.string(),
  recommendedArtifacts: z.array(z.string()),
  nextAction: z.string(),
});

export const workspaceMutationEnvelopeSchema = z.object({
  workspace: workspaceSummarySchema,
  workspaceGraph: workspaceGraphSchema,
  lastActiveWorkspaceId: z.string().nullable(),
});

export const workspaceOnboardingEnvelopeSchema = z.object({
  workspace: workspaceSummarySchema,
  bootstrap: bootstrapSessionSchema,
  lastActiveWorkspaceId: z.string().nullable(),
});

export const workspaceInvitationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  invitationCode: z.string(),
  role: workspaceInvitationRoleSchema,
  status: workspaceInvitationStatusSchema,
  invitedByUserId: z.string(),
  acceptedByUserId: z.string().nullable(),
  expiresAt: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workspaceInvitationEnvelopeSchema = z.object({
  invitation: workspaceInvitationSchema,
});

export const documentMutationEnvelopeSchema = z.object({
  document: workspaceDocumentSchema,
  workspaceGraph: workspaceGraphSchema,
});

export const approvalMutationEnvelopeSchema = z.object({
  approval: documentApprovalSchema,
  workspaceGraph: workspaceGraphSchema,
});

export const publishRecordMutationEnvelopeSchema = z.object({
  publishRecord: publishRecordSchema,
  workspaceGraph: workspaceGraphSchema,
});

export const publishExecutionResultSchema = z.object({
  repository: z.string(),
  localRepoPath: z.string(),
  branchName: z.string(),
  commitSha: z.string().nullable(),
  pullRequestNumber: z.number().nullable(),
  pullRequestUrl: z.string().nullable(),
  committedFiles: z.array(z.string()),
  startedAt: z.string(),
  completedAt: z.string(),
});

export const publishExecutionEnvelopeSchema = z.object({
  publishRecord: publishRecordSchema,
  execution: publishExecutionResultSchema,
  workspaceGraph: workspaceGraphSchema,
});

export const apiResponseMetaSchema = z.object({
  requestId: z.string().nullable(),
  timestamp: z.string(),
  path: z.string(),
  method: z.string(),
  status: z.number(),
});

export const apiErrorDescriptorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const authenticationProviderSchema = z.object({
  id: z.literal("github_oauth"),
  label: z.literal("GitHub OAuth"),
  kind: z.literal("oauth"),
});

export const authenticatedApiSessionSchema = z.object({
  status: z.literal("authenticated"),
  provider: authenticationProviderSchema,
  user: sessionUserSchema,
  sessionToken: z.string(),
  expiresAt: z.string(),
});

export const signedOutApiSessionSchema = z.object({
  status: z.literal("signed_out"),
  provider: authenticationProviderSchema,
  user: z.null(),
  sessionToken: z.null(),
  expiresAt: z.null(),
});

export const apiAuthenticationSessionSchema = z.discriminatedUnion("status", [
  authenticatedApiSessionSchema,
  signedOutApiSessionSchema,
]);

export const gitHubOAuthStartSchema = z.object({
  attemptId: z.string(),
  authorizationUrl: z.string().url(),
  expiresAt: z.string(),
  pollIntervalMs: z.number().int().positive(),
});

export const gitHubOAuthPendingAttemptSchema = z.object({
  status: z.literal("pending"),
  expiresAt: z.string(),
  completedAt: z.null(),
  error: z.null(),
  session: z.null(),
});

export const gitHubOAuthAuthenticatedAttemptSchema = z.object({
  status: z.literal("authenticated"),
  expiresAt: z.string(),
  completedAt: z.string(),
  error: z.null(),
  session: authenticatedApiSessionSchema,
});

export const gitHubOAuthFailedAttemptSchema = z.object({
  status: z.enum(["failed", "expired"]),
  expiresAt: z.string(),
  completedAt: z.string().nullable(),
  error: z.string(),
  session: z.null(),
});

export const gitHubOAuthAttemptSchema = z.discriminatedUnion("status", [
  gitHubOAuthPendingAttemptSchema,
  gitHubOAuthAuthenticatedAttemptSchema,
  gitHubOAuthFailedAttemptSchema,
]);

export const intakePreviewRequestSchema = z.object({
  prompt: z.string().min(1),
  provider: aiProviderSchema,
});

export type IntakePreviewRequestDto = z.infer<typeof intakePreviewRequestSchema>;

export const authSessionExchangeRequestSchema = z.object({
  provider: authProviderSchema,
  identity: z.object({
    login: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().nullable(),
  }),
});

export const workspaceUpdateRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  defaultBranch: z.string().min(1).optional(),
  lastActive: z.boolean().optional(),
});

export type WorkspaceUpdateRequestDto = z.infer<typeof workspaceUpdateRequestSchema>;

export const workspaceCreateRequestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  docsRepoOwner: z.string().min(1).optional(),
  docsRepoName: z.string().min(1).optional(),
  docsRepoDefaultBranch: z.string().min(1).default("main"),
});

export type WorkspaceCreateRequestDto = z.infer<typeof workspaceCreateRequestSchema>;

export const workspaceInvitationCreateRequestSchema = z.object({
  role: workspaceInvitationRoleSchema.default("Editor"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export type WorkspaceInvitationCreateRequestDto = z.infer<
  typeof workspaceInvitationCreateRequestSchema
>;

export const workspaceInvitationAcceptRequestSchema = z.object({
  invitationCode: z.string().min(1),
});

export type WorkspaceInvitationAcceptRequestDto = z.infer<
  typeof workspaceInvitationAcceptRequestSchema
>;

export const documentCreateRequestSchema = z.object({
  title: z.string().min(1),
  type: documentTypeSchema,
  templateId: z.string().min(1),
  ownerMembershipId: z.string().min(1),
  createdByMembershipId: z.string().min(1),
  markdownSource: z.string().optional(),
  linkedDocumentIds: z.array(z.string()).default([]),
});

export type DocumentCreateRequestDto = z.infer<typeof documentCreateRequestSchema>;

export const documentUpdateRequestSchema = z.object({
  title: z.string().min(1).optional(),
  markdownSource: z.string().optional(),
  linkedDocumentIds: z.array(z.string()).optional(),
});

export type DocumentUpdateRequestDto = z.infer<typeof documentUpdateRequestSchema>;

export const approvalRequestSchema = z.object({
  authority: approvalAuthoritySchema,
  source: approvalCandidateSourceSchema,
  reviewerLabel: z.string().min(1),
  membershipId: z.string().nullable().optional(),
  githubCandidateLogin: z.string().nullable().optional(),
  requestedByMembershipId: z.string().nullable().optional(),
  decisionNote: z.string().optional(),
});

export type ApprovalRequestDto = z.infer<typeof approvalRequestSchema>;

export const approvalDecisionSchema = z.object({
  decision: approvalDecisionValueSchema,
  decisionByMembershipId: z.string().min(1),
  decisionNote: z.string().optional(),
});

export type ApprovalDecisionDto = z.infer<typeof approvalDecisionSchema>;

export const publishRecordCreateRequestSchema = z
  .object({
    source: z.object({
      kind: publishRecordSourceKindSchema,
      documentId: z.string().nullable().optional(),
      templateId: z.string().nullable().optional(),
      label: z.string().min(1),
      changeSummary: z.string().min(1),
    }),
    initiatedByMembershipId: z.string().min(1),
    artifactDocumentIds: z.array(z.string()).default([]),
    artifactTemplateIds: z.array(z.string()).default([]),
    staleRationale: z.string().default(""),
  })
  .superRefine((value, ctx) => {
    if (value.artifactDocumentIds.length === 0 && value.artifactTemplateIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one artifact must be selected for publish preparation.",
        path: ["artifactDocumentIds"],
      });
    }
  });

export type PublishRecordCreateRequestDto = z.infer<typeof publishRecordCreateRequestSchema>;

export const publishRecordExecuteRequestSchema = z.object({
  initiatedByMembershipId: z.string().min(1),
  staleRationale: z.string().optional(),
  commitMessage: z.string().min(1).optional(),
  pullRequestTitle: z.string().min(1).optional(),
});

export type PublishRecordExecuteRequestDto = z.infer<typeof publishRecordExecuteRequestSchema>;

export const defaultWorkspaceCatalog: WorkspaceSummaryDto[] = [
  {
    id: "ws_harness_docs",
    name: "Harness Docs",
    repo: "org/harness-docs-specs",
    role: "Lead",
    description: "Primary workspace for the Harness Docs desktop foundation.",
    pendingDrafts: 6,
    openReviews: 4,
    staleDocuments: 2,
    areas: {
      documents: {
        title: "Document Library",
        description: "Browse role-specific docs and linked invalidations.",
        primaryAction: "Open document queue",
        highlights: ["Linked-doc traceability", "Template-aware creation", "Queue overview"],
      },
      editor: {
        title: "Markdown Editor",
        description: "Edit with explicit locks and live preview.",
        primaryAction: "Resume latest draft",
        highlights: ["Start Editing lock flow", "Split source and preview", "Idle release"],
      },
      comments: {
        title: "Comments and Mentions",
        description: "Track paragraph and block feedback.",
        primaryAction: "Open review threads",
        highlights: ["Paragraph comments", "@mention routing", "Review visibility"],
      },
      approvals: {
        title: "Approvals",
        description: "Manage app-native approvers and lead restoration.",
        primaryAction: "Review approver matrix",
        highlights: ["App-managed authority", "Decision history", "Lead restoration"],
      },
      publish: {
        title: "Publish Flow",
        description: "Prepare GitHub branch, commit, and pull request publication.",
        primaryAction: "Prepare publish memo",
        highlights: ["Stale publish allowed", "Rationale required", "PR automation"],
      },
      ai: {
        title: "AI Harness",
        description: "Launch Codex or Claude against internal workspace docs.",
        primaryAction: "Start AI task",
        highlights: ["Provider selection", "Action-button first UX", "Internal-doc search only"],
      },
    },
  },
];

export function unwrapApiResponse<TData>(payload: unknown): TData {
  if (payload && typeof payload === "object" && "ok" in payload) {
    const envelope = payload as ApiResponse<TData>;

    if (envelope.ok) {
      return envelope.data;
    }

    throw new Error(envelope.error.message);
  }

  throw new Error("Invalid API response envelope.");
}
