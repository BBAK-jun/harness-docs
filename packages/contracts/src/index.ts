import { apiReference } from "@scalar/hono-api-reference";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context, Next, TypedResponse } from "hono";
import { hc } from "hono/client";
import { cors } from "hono/cors";
import {
  aiProviderSchema,
  approvalAuthoritySchema,
  approvalCandidateSourceSchema,
  approvalDecisionSchema as approvalDecisionValueSchema,
  authProviderSchema,
  documentTypeSchema,
  publishRecordSourceKindSchema,
  workspaceRoleSchema,
  type AuthProvider,
  type NavigationAreaKey,
  type WorkspaceRole,
} from "./enums";
import type { PublishPreflightEnvelopeDto, PublishPreflightView } from "./publish-governance";
import { publishPreflightEnvelopeSchema } from "./publish-governance";

export * from "./enums";
export * from "./publish-governance";

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
  workspaceGraphs: unknown[];
  lastActiveWorkspaceId: string | null;
}

export interface WorkspaceGraphEnvelopeDto {
  workspaceGraph: unknown;
}

export interface WorkspaceDocumentsEnvelopeDto {
  documents: unknown[];
}

export interface WorkspaceApprovalsEnvelopeDto {
  approvals: unknown[];
}

export interface WorkspacePublishRecordsEnvelopeDto {
  publishRecords: unknown[];
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
  workspaceGraph: unknown;
  lastActiveWorkspaceId: string | null;
}

export interface WorkspaceOnboardingEnvelopeDto {
  workspace: WorkspaceSummaryDto;
  bootstrap: BootstrapSessionDto;
  lastActiveWorkspaceId: string | null;
}

export interface DocumentMutationEnvelopeDto {
  document: unknown;
  workspaceGraph: unknown;
}

export interface ApprovalMutationEnvelopeDto {
  approval: unknown;
  workspaceGraph: unknown;
}

export interface PublishRecordMutationEnvelopeDto {
  publishRecord: unknown;
  workspaceGraph: unknown;
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
  publishRecord: unknown;
  execution: PublishExecutionResultDto;
  workspaceGraph: unknown;
}

export interface AuthSessionExchangeRequestDto {
  provider: AuthProvider;
  identity: {
    login: string;
    name: string;
    email: string | null;
  };
}

export interface WorkspaceSessionDataSource {
  getBootstrapSession: (viewerUserId?: string) => Promise<BootstrapSessionDto | null>;
  getWorkspaceGraph: (workspaceId: string) => Promise<unknown | null>;
  getWorkspaceDocuments: (workspaceId: string) => Promise<unknown[] | null>;
  getWorkspaceApprovals: (workspaceId: string) => Promise<unknown[] | null>;
  getWorkspacePublishRecords: (workspaceId: string) => Promise<unknown[] | null>;
  updateWorkspace: (
    workspaceId: string,
    input: WorkspaceUpdateRequestDto,
  ) => Promise<WorkspaceMutationEnvelopeDto | null>;
  createDocument: (
    workspaceId: string,
    input: DocumentCreateRequestDto,
  ) => Promise<DocumentMutationEnvelopeDto | null>;
  updateDocument: (
    workspaceId: string,
    documentId: string,
    input: DocumentUpdateRequestDto,
  ) => Promise<DocumentMutationEnvelopeDto | null>;
  requestApproval: (
    workspaceId: string,
    documentId: string,
    input: ApprovalRequestDto,
  ) => Promise<ApprovalMutationEnvelopeDto | null>;
  decideApproval: (
    workspaceId: string,
    approvalId: string,
    input: ApprovalDecisionDto,
  ) => Promise<ApprovalMutationEnvelopeDto | null>;
  createPublishRecord: (
    workspaceId: string,
    input: PublishRecordCreateRequestDto,
  ) => Promise<PublishRecordMutationEnvelopeDto | null>;
  executePublishRecord: (
    workspaceId: string,
    publishRecordId: string,
    input: PublishRecordExecuteRequestDto,
  ) => Promise<PublishExecutionEnvelopeDto | null>;
  createWorkspace: (
    input: WorkspaceCreateRequestDto,
    viewerUserId?: string,
  ) => Promise<WorkspaceOnboardingEnvelopeDto | null>;
  acceptWorkspaceInvitation: (
    input: WorkspaceInvitationAcceptRequestDto,
  ) => Promise<WorkspaceOnboardingEnvelopeDto | null>;
}

export interface PublishGovernanceAdapter {
  projectDocumentPublishPreflight: (params: {
    workspaceId: string;
    documentId: string;
    workspaceGraph: unknown;
    documents: unknown[];
  }) => PublishPreflightView | null;
}

export type WorkspaceRepositoryValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: string;
      message: string;
      details?: unknown;
    };

export interface WorkspaceRepositoryValidator {
  validateWorkspaceRepository: (input: {
    repositoryOwner: string;
    repositoryName: string;
    defaultBranch: string;
    viewer: SessionUserDto;
  }) => Promise<WorkspaceRepositoryValidationResult>;
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
  workspaceGraphs: z.array(z.unknown()),
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
  workspaceGraph: z.unknown(),
});

export const workspaceDocumentsEnvelopeSchema = z.object({
  documents: z.array(z.unknown()),
});

export const workspaceApprovalsEnvelopeSchema = z.object({
  approvals: z.array(z.unknown()),
});

export const workspacePublishRecordsEnvelopeSchema = z.object({
  publishRecords: z.array(z.unknown()),
});

export const intakePreviewSchema = z.object({
  summary: z.string(),
  recommendedRoute: z.string(),
  recommendedArtifacts: z.array(z.string()),
  nextAction: z.string(),
});

export const workspaceMutationEnvelopeSchema = z.object({
  workspace: workspaceSummarySchema,
  workspaceGraph: z.unknown(),
  lastActiveWorkspaceId: z.string().nullable(),
});

export const workspaceOnboardingEnvelopeSchema = z.object({
  workspace: workspaceSummarySchema,
  bootstrap: bootstrapSessionSchema,
  lastActiveWorkspaceId: z.string().nullable(),
});

export const documentMutationEnvelopeSchema = z.object({
  document: z.unknown(),
  workspaceGraph: z.unknown(),
});

export const approvalMutationEnvelopeSchema = z.object({
  approval: z.unknown(),
  workspaceGraph: z.unknown(),
});

export const publishRecordMutationEnvelopeSchema = z.object({
  publishRecord: z.unknown(),
  workspaceGraph: z.unknown(),
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
  publishRecord: z.unknown(),
  execution: publishExecutionResultSchema,
  workspaceGraph: z.unknown(),
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

function successEnvelopeSchema<TSchema extends z.ZodTypeAny>(dataSchema: TSchema) {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
    error: z.null(),
    meta: apiResponseMetaSchema,
  });
}

function errorEnvelopeSchema() {
  return z.object({
    ok: z.literal(false),
    data: z.null(),
    error: apiErrorDescriptorSchema,
    meta: apiResponseMetaSchema,
  });
}

function jsonContent<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return {
    "application/json": {
      schema,
    },
  };
}

function registerOpenApiRoute(
  app: OpenAPIHono,
  route: unknown,
  handler: unknown,
) {
  // @ts-expect-error Hono's route-specific response inference is stricter than the
  // shared envelope helpers used across workspace packages.
  app.openapi(route, handler);
}

export interface ApiAuthDataSource {
  exchangeSession: (input: AuthSessionExchangeRequestDto) => Promise<AuthenticatedApiSessionDto>;
  getSession: (sessionToken: string) => Promise<AuthenticatedApiSessionDto | null>;
  revokeSession: (sessionToken: string) => Promise<void>;
}

export interface GitHubOAuthDataSource {
  startAuthorization: (input: { requestOrigin: string }) => Promise<GitHubOAuthStartDto>;
  getAuthorizationAttempt: (attemptId: string) => Promise<GitHubOAuthAttemptDto | null>;
  completeAuthorization: (input: {
    requestOrigin: string;
    code: string | null;
    state: string | null;
    error: string | null;
    errorDescription: string | null;
  }) => Promise<{
    statusCode: 200 | 400 | 410 | 500;
    html: string;
  }>;
}

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

export const workspaceInvitationAcceptRequestSchema = z.object({
  workspaceId: z.string().min(1),
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

type SuccessStatus = 200;
type ErrorStatus = 404 | 422 | 500;
type StandardStatus = SuccessStatus | ErrorStatus;

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

function createDefaultDataSource(): WorkspaceSessionDataSource {
  const snapshot: BootstrapSessionDto = {
    user: {
      id: "usr_demo",
      name: "Demo User",
      handle: "@demo",
      avatarInitials: "DU",
      githubLogin: "demo",
      primaryEmail: "demo@example.com",
    },
    workspaces: defaultWorkspaceCatalog,
    workspaceGraphs: [],
    lastActiveWorkspaceId: defaultWorkspaceCatalog[0]?.id ?? null,
  };

  return {
    async getBootstrapSession() {
      return snapshot;
    },
    async getWorkspaceGraph() {
      return null;
    },
    async getWorkspaceDocuments() {
      return [];
    },
    async getWorkspaceApprovals() {
      return [];
    },
    async getWorkspacePublishRecords() {
      return [];
    },
    async updateWorkspace() {
      return null;
    },
    async createDocument() {
      return null;
    },
    async updateDocument() {
      return null;
    },
    async requestApproval() {
      return null;
    },
    async decideApproval() {
      return null;
    },
    async createPublishRecord() {
      return null;
    },
    async executePublishRecord() {
      return null;
    },
    async createWorkspace() {
      return null;
    },
    async acceptWorkspaceInvitation() {
      return null;
    },
  };
}

export interface CreateApiAppOptions {
  dataSource?: WorkspaceSessionDataSource;
  publishGovernanceAdapter?: PublishGovernanceAdapter;
  workspaceRepositoryValidator?: WorkspaceRepositoryValidator;
  authDataSource?: ApiAuthDataSource;
  gitHubOAuthDataSource?: GitHubOAuthDataSource;
}

const githubOAuthProvider: AuthenticationProviderDto = {
  id: "github_oauth",
  label: "GitHub OAuth",
  kind: "oauth",
};

const workspaceIdParamSchema = z
  .string()
  .openapi({ param: { name: "workspaceId", in: "path" }, example: "ws_harness_docs" });

const documentIdParamSchema = z
  .string()
  .openapi({ param: { name: "documentId", in: "path" }, example: "doc_123" });

const approvalIdParamSchema = z
  .string()
  .openapi({ param: { name: "approvalId", in: "path" }, example: "apr_123" });

const publishRecordIdParamSchema = z
  .string()
  .openapi({ param: { name: "publishRecordId", in: "path" }, example: "pub_123" });

const workspaceParamSchema = z.object({
  workspaceId: workspaceIdParamSchema,
});

const workspaceDocumentParamSchema = z.object({
  workspaceId: workspaceIdParamSchema,
  documentId: documentIdParamSchema,
});

const workspaceApprovalParamSchema = z.object({
  workspaceId: workspaceIdParamSchema,
  approvalId: approvalIdParamSchema,
});

const workspacePublishRecordParamSchema = z.object({
  workspaceId: workspaceIdParamSchema,
  publishRecordId: publishRecordIdParamSchema,
});

function createResponseMeta(c: Context, status: StandardStatus): ApiResponseMeta {
  return {
    requestId: c.req.header("x-request-id") ?? null,
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method,
    status,
  };
}

export function successResponse<TData>(
  c: Context,
  data: TData,
  status: SuccessStatus = 200,
): TypedResponse<ApiSuccessResponse<TData>, SuccessStatus, "json"> {
  return c.json<ApiSuccessResponse<TData>>(
    {
      ok: true,
      data,
      error: null,
      meta: createResponseMeta(c, status),
    },
    status,
  ) as unknown as TypedResponse<ApiSuccessResponse<TData>, SuccessStatus, "json">;
}

export function errorResponse<TCode extends string, TDetails = unknown>(
  c: Context,
  status: ErrorStatus,
  code: TCode,
  message: string,
  details?: TDetails,
): TypedResponse<ApiErrorResponse<TCode, TDetails>, ErrorStatus, "json"> {
  return c.json<ApiErrorResponse<TCode, TDetails>>(
    {
      ok: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
      meta: createResponseMeta(c, status),
    },
    status,
  ) as unknown as TypedResponse<ApiErrorResponse<TCode, TDetails>, ErrorStatus, "json">;
}

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

function parseParams<TSchema extends z.ZodTypeAny>(c: Context, schema: TSchema) {
  const result = schema.safeParse(c.req.param());

  if (!result.success) {
    return {
      ok: false as const,
      response: errorResponse(
        c,
        422,
        "validation_error",
        "Invalid param payload.",
        result.error.issues,
      ),
    };
  }

  return { ok: true as const, data: result.data };
}

async function parseJsonBody<TSchema extends z.ZodTypeAny>(c: Context, schema: TSchema) {
  const payload = await c.req.json().catch(() => undefined);
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      ok: false as const,
      response: errorResponse(
        c,
        422,
        "validation_error",
        "Invalid json payload.",
        result.error.issues,
      ),
    };
  }

  return { ok: true as const, data: result.data };
}

function readBearerToken(c: Context) {
  const authorization = c.req.header("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

async function requireSession(c: Context, authDataSource?: ApiAuthDataSource) {
  if (!authDataSource) {
    return { ok: true as const, session: null };
  }

  const token = readBearerToken(c);

  if (!token) {
    return {
      ok: false as const,
      response: errorResponse(
        c,
        422,
        "authentication_required",
        "A valid app session is required for this endpoint.",
      ),
    };
  }

  const session = await authDataSource.getSession(token);

  if (!session) {
    return {
      ok: false as const,
      response: errorResponse(
        c,
        422,
        "authentication_required",
        "A valid app session is required for this endpoint.",
      ),
    };
  }

  return { ok: true as const, session };
}

function signedOutSession(): SignedOutApiSessionDto {
  return {
    status: "signed_out",
    provider: githubOAuthProvider,
    user: null,
    sessionToken: null,
    expiresAt: null,
  };
}

function workspaceNotFound(c: Context, workspaceId: string) {
  return errorResponse(
    c,
    404,
    "workspace_not_found",
    `Workspace '${workspaceId}' is not registered.`,
  );
}

function documentNotFound(c: Context, documentId: string) {
  return errorResponse(c, 404, "document_not_found", `Document '${documentId}' is not registered.`);
}

function approvalNotFound(c: Context, approvalId: string) {
  return errorResponse(c, 404, "approval_not_found", `Approval '${approvalId}' is not registered.`);
}

function publishRecordNotFound(c: Context, publishRecordId: string) {
  return errorResponse(
    c,
    404,
    "publish_record_not_found",
    `Publish record '${publishRecordId}' is not registered.`,
  );
}

function findEntityById(items: unknown[] | null, id: string) {
  if (!Array.isArray(items)) {
    return null;
  }

  return (
    items.find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        (item as { id?: unknown }).id === id,
    ) ?? null
  );
}

export function createApiApp(options: CreateApiAppOptions = {}) {
  const dataSource = options.dataSource ?? createDefaultDataSource();
  const publishGovernanceAdapter = options.publishGovernanceAdapter;
  const workspaceRepositoryValidator = options.workspaceRepositoryValidator;
  const authDataSource = options.authDataSource;
  const gitHubOAuthDataSource = options.gitHubOAuthDataSource;
  const app = new OpenAPIHono();
  const errorEnvelope = errorEnvelopeSchema();

  app.use("*", cors());
  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: "Harness Docs API",
      version: "0.1.0",
      description:
        "Authoritative API for authentication, workspace onboarding, document workflow, approvals, and publish governance.",
    },
  });
  app.get(
    "/scalar",
    apiReference({
      pageTitle: "Harness Docs API Reference",
      url: "/doc",
    }),
  );
  if (authDataSource) {
    app.use("/api/session/bootstrap", async (c, next) => {
      const sessionResult = await requireSession(c, authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
    app.use("/api/workspaces", async (c, next) => {
      const sessionResult = await requireSession(c, authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
    app.use("/api/workspaces/*", async (c, next) => {
      const sessionResult = await requireSession(c, authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
    app.use("/api/workspace-invitations/accept", async (c, next) => {
      const sessionResult = await requireSession(c, authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      await next();
    });
  }
  app.notFound(
    (c: Context) =>
      errorResponse(c, 404, "route_not_found", `Route '${c.req.path}' is not registered.`) as unknown as Response,
  );
  app.onError(
    (error: unknown, c: Context) =>
      errorResponse(
        c,
        500,
        "internal_server_error",
        error instanceof Error ? error.message : "Unexpected error while handling request.",
      ) as unknown as Response,
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/health",
      tags: ["system"],
      responses: {
        200: {
          description: "Health check response.",
          content: jsonContent(successEnvelopeSchema(healthCheckSchema)),
        },
      },
    }),
    (c: Context) =>
      successResponse(c, {
        service: "harness-docs-api",
        status: "ok",
        transport: "hono-rpc",
      } satisfies HealthCheckDto),
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/auth/github/start",
      tags: ["auth"],
      responses: {
        200: {
          description: "GitHub OAuth authorization start payload.",
          content: jsonContent(successEnvelopeSchema(gitHubOAuthStartSchema)),
        },
        500: {
          description: "GitHub OAuth is not configured.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      if (!gitHubOAuthDataSource) {
        return errorResponse(
          c,
          500,
          "github_oauth_not_configured",
          "GitHub OAuth is not configured for this API instance.",
        );
      }

      return successResponse(
        c,
        await gitHubOAuthDataSource.startAuthorization({
          requestOrigin: new URL(c.req.url).origin,
        }),
      );
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/auth/github/attempts/{attemptId}",
      tags: ["auth"],
      request: {
        params: z.object({
          attemptId: z.string().openapi({
            param: { name: "attemptId", in: "path" },
            example: "gha_demo",
          }),
        }),
      },
      responses: {
        200: {
          description: "GitHub OAuth authorization attempt status.",
          content: jsonContent(successEnvelopeSchema(gitHubOAuthAttemptSchema)),
        },
        404: {
          description: "Authorization attempt is not registered.",
          content: jsonContent(errorEnvelope),
        },
        500: {
          description: "GitHub OAuth is not configured.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      if (!gitHubOAuthDataSource) {
        return errorResponse(
          c,
          500,
          "github_oauth_not_configured",
          "GitHub OAuth is not configured for this API instance.",
        );
      }

      const paramsResult = parseParams(c, z.object({ attemptId: z.string() }));

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const attempt = await gitHubOAuthDataSource.getAuthorizationAttempt(paramsResult.data.attemptId);

      if (!attempt) {
        return errorResponse(
          c,
          404,
          "github_oauth_attempt_not_found",
          `GitHub OAuth attempt '${paramsResult.data.attemptId}' is not registered.`,
        );
      }

      return successResponse(c, attempt);
    },
  );

  app.get("/api/auth/github/callback", async (c: Context) => {
    if (!gitHubOAuthDataSource) {
      return c.html(
        "<html><body><h1>GitHub OAuth Not Configured</h1><p>This API instance does not support GitHub OAuth.</p></body></html>",
        500,
      );
    }

    const query = c.req.query();
    const result = await gitHubOAuthDataSource.completeAuthorization({
      requestOrigin: new URL(c.req.url).origin,
      code: query.code ?? null,
      state: query.state ?? null,
      error: query.error ?? null,
      errorDescription: query.error_description ?? null,
    });

    return c.html(result.html, result.statusCode);
  });

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/auth/session/exchange",
      tags: ["auth"],
      request: {
        body: {
          required: true,
          content: jsonContent(authSessionExchangeRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Authenticated app session.",
          content: jsonContent(successEnvelopeSchema(authenticatedApiSessionSchema)),
        },
        422: {
          description: "Authentication exchange payload is invalid.",
          content: jsonContent(errorEnvelope),
        },
        500: {
          description: "Auth exchange is not configured.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      if (!authDataSource) {
        return errorResponse(
          c,
          500,
          "auth_data_source_missing",
          "Authentication session exchange is not configured for this API instance.",
        );
      }

      const payloadResult = await parseJsonBody(c, authSessionExchangeRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return successResponse(c, await authDataSource.exchangeSession(payloadResult.data));
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/auth/session",
      tags: ["auth"],
      responses: {
        200: {
          description: "Current authentication session snapshot.",
          content: jsonContent(successEnvelopeSchema(apiAuthenticationSessionSchema)),
        },
      },
    }),
    async (c: Context) => {
      if (!authDataSource) {
        return successResponse(c, signedOutSession());
      }

      const token = readBearerToken(c);

      if (!token) {
        return successResponse(c, signedOutSession());
      }

      return successResponse(c, (await authDataSource.getSession(token)) ?? signedOutSession());
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/auth/sign-out",
      tags: ["auth"],
      responses: {
        200: {
          description: "Signed-out session snapshot.",
          content: jsonContent(successEnvelopeSchema(signedOutApiSessionSchema)),
        },
      },
    }),
    async (c: Context) => {
      if (authDataSource) {
        const token = readBearerToken(c);

        if (token) {
          await authDataSource.revokeSession(token);
        }
      }

      return successResponse(c, signedOutSession());
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/session/bootstrap",
      tags: ["session"],
      responses: {
        200: {
          description: "Bootstrapped session with user and workspace catalog.",
          content: jsonContent(successEnvelopeSchema(bootstrapSessionSchema)),
        },
        422: {
          description: "Authentication is required.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const sessionResult = await requireSession(c, authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      const bootstrap = await dataSource.getBootstrapSession(sessionResult.session?.user.id);

      if (!bootstrap) {
        return errorResponse(
          c,
          422,
          "authentication_required",
          "A valid app session is required for this endpoint.",
        );
      }

      return successResponse(c, bootstrap);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/workspaces",
      tags: ["workspaces"],
      responses: {
        200: {
          description: "Workspace catalog for the signed-in user.",
          content: jsonContent(successEnvelopeSchema(workspaceCatalogEnvelopeSchema)),
        },
        422: {
          description: "Authentication is required.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const sessionResult = await requireSession(c, authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      const bootstrap = await dataSource.getBootstrapSession(sessionResult.session?.user.id);

      if (!bootstrap) {
        return errorResponse(
          c,
          422,
          "authentication_required",
          "A valid app session is required for this endpoint.",
        );
      }

      return successResponse(c, {
        workspaces: bootstrap.workspaces,
      } satisfies WorkspaceCatalogEnvelopeDto);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/workspaces",
      tags: ["workspaces", "onboarding"],
      request: {
        body: {
          required: true,
          content: jsonContent(workspaceCreateRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Workspace created and bootstrap refreshed.",
          content: jsonContent(successEnvelopeSchema(workspaceOnboardingEnvelopeSchema)),
        },
        422: {
          description: "Workspace creation failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const sessionResult = await requireSession(c, authDataSource);

      if (!sessionResult.ok) {
        return sessionResult.response;
      }

      const payloadResult = await parseJsonBody(c, workspaceCreateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const viewer = sessionResult.session?.user;

      if (!viewer) {
        return errorResponse(
          c,
          422,
          "authentication_required",
          "A valid app session is required for this endpoint.",
        );
      }

      if (
        workspaceRepositoryValidator &&
        payloadResult.data.docsRepoOwner &&
        payloadResult.data.docsRepoName
      ) {
        const validation = await workspaceRepositoryValidator.validateWorkspaceRepository({
          repositoryOwner: payloadResult.data.docsRepoOwner,
          repositoryName: payloadResult.data.docsRepoName,
          defaultBranch: payloadResult.data.docsRepoDefaultBranch,
          viewer,
        });

        if (!validation.ok) {
          return errorResponse(
            c,
            422,
            validation.code,
            validation.message,
            validation.details,
          );
        }
      }

      const mutation = await dataSource.createWorkspace(
        payloadResult.data,
        sessionResult.session?.user.id,
      );

      if (!mutation) {
        return errorResponse(c, 422, "workspace_create_failed", "Workspace could not be created.");
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/workspace-invitations/accept",
      tags: ["workspaces", "onboarding"],
      request: {
        body: {
          required: true,
          content: jsonContent(workspaceInvitationAcceptRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Workspace invitation accepted and bootstrap refreshed.",
          content: jsonContent(successEnvelopeSchema(workspaceOnboardingEnvelopeSchema)),
        },
        422: {
          description: "Invitation acceptance failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const payloadResult = await parseJsonBody(c, workspaceInvitationAcceptRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const mutation = await dataSource.acceptWorkspaceInvitation(payloadResult.data);

      if (!mutation) {
        return errorResponse(
          c,
          422,
          "workspace_invitation_accept_failed",
          "Workspace invitation could not be accepted.",
        );
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/workspaces/{workspaceId}/graph",
      tags: ["workspaces"],
      request: {
        params: workspaceParamSchema,
      },
      responses: {
        200: {
          description: "Workspace graph.",
          content: jsonContent(successEnvelopeSchema(workspaceGraphEnvelopeSchema)),
        },
        422: {
          description: "Path parameter payload is invalid.",
          content: jsonContent(errorEnvelope),
        },
        404: {
          description: "Workspace not found.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const { workspaceId } = paramsResult.data;
      const workspaceGraph = await dataSource.getWorkspaceGraph(workspaceId);

      if (!workspaceGraph) {
        return workspaceNotFound(c, workspaceId);
      }

      return successResponse(c, {
        workspaceGraph,
      } satisfies WorkspaceGraphEnvelopeDto);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/workspaces/{workspaceId}/documents/{documentId}/publish-preflight",
      tags: ["publish"],
      request: {
        params: workspaceDocumentParamSchema,
      },
      responses: {
        200: {
          description: "Authoritative publish preflight state for a document.",
          content: jsonContent(successEnvelopeSchema(publishPreflightEnvelopeSchema)),
        },
        422: {
          description: "Path parameter payload is invalid.",
          content: jsonContent(errorEnvelope),
        },
        404: {
          description: "Workspace, document, or preflight state not found.",
          content: jsonContent(errorEnvelope),
        },
        500: {
          description: "Publish governance adapter is missing.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceDocumentParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const { workspaceId, documentId } = paramsResult.data;
      const [workspaceGraph, documents] = await Promise.all([
        dataSource.getWorkspaceGraph(workspaceId),
        dataSource.getWorkspaceDocuments(workspaceId),
      ]);

      if (!workspaceGraph || !documents) {
        return workspaceNotFound(c, workspaceId);
      }

      if (!findEntityById(documents, documentId)) {
        return documentNotFound(c, documentId);
      }

      if (!publishGovernanceAdapter) {
        return errorResponse(
          c,
          500,
          "publish_governance_adapter_missing",
          "Publish governance projection is not configured for this API instance.",
        );
      }

      const preflight = publishGovernanceAdapter.projectDocumentPublishPreflight({
        workspaceId,
        documentId,
        workspaceGraph,
        documents,
      });

      if (!preflight) {
        return errorResponse(
          c,
          404,
          "publish_preflight_not_found",
          `Publish preflight for document '${documentId}' is not available.`,
        );
      }

      return successResponse(c, {
        preflight,
      } satisfies PublishPreflightEnvelopeDto);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/workspaces/{workspaceId}/documents",
      tags: ["documents"],
      request: {
        params: workspaceParamSchema,
      },
      responses: {
        200: {
          description: "Workspace documents.",
          content: jsonContent(successEnvelopeSchema(workspaceDocumentsEnvelopeSchema)),
        },
        422: {
          description: "Path parameter payload is invalid.",
          content: jsonContent(errorEnvelope),
        },
        404: {
          description: "Workspace not found.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const { workspaceId } = paramsResult.data;
      const documents = await dataSource.getWorkspaceDocuments(workspaceId);

      if (!documents) {
        return workspaceNotFound(c, workspaceId);
      }

      return successResponse(c, {
        documents,
      } satisfies WorkspaceDocumentsEnvelopeDto);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/workspaces/{workspaceId}/approvals",
      tags: ["approvals"],
      request: {
        params: workspaceParamSchema,
      },
      responses: {
        200: {
          description: "Workspace approvals.",
          content: jsonContent(successEnvelopeSchema(workspaceApprovalsEnvelopeSchema)),
        },
        422: {
          description: "Path parameter payload is invalid.",
          content: jsonContent(errorEnvelope),
        },
        404: {
          description: "Workspace not found.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const { workspaceId } = paramsResult.data;
      const approvals = await dataSource.getWorkspaceApprovals(workspaceId);

      if (!approvals) {
        return workspaceNotFound(c, workspaceId);
      }

      return successResponse(c, {
        approvals,
      } satisfies WorkspaceApprovalsEnvelopeDto);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "get",
      path: "/api/workspaces/{workspaceId}/publish-records",
      tags: ["publish"],
      request: {
        params: workspaceParamSchema,
      },
      responses: {
        200: {
          description: "Workspace publish records.",
          content: jsonContent(successEnvelopeSchema(workspacePublishRecordsEnvelopeSchema)),
        },
        422: {
          description: "Path parameter payload is invalid.",
          content: jsonContent(errorEnvelope),
        },
        404: {
          description: "Workspace not found.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const { workspaceId } = paramsResult.data;
      const publishRecords = await dataSource.getWorkspacePublishRecords(workspaceId);

      if (!publishRecords) {
        return workspaceNotFound(c, workspaceId);
      }

      return successResponse(c, {
        publishRecords,
      } satisfies WorkspacePublishRecordsEnvelopeDto);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "patch",
      path: "/api/workspaces/{workspaceId}",
      tags: ["workspaces"],
      request: {
        params: workspaceParamSchema,
        body: {
          required: true,
          content: jsonContent(workspaceUpdateRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Workspace updated.",
          content: jsonContent(successEnvelopeSchema(workspaceMutationEnvelopeSchema)),
        },
        404: {
          description: "Workspace not found.",
          content: jsonContent(errorEnvelope),
        },
        422: {
          description: "Workspace update failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, workspaceUpdateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const { workspaceId } = paramsResult.data;
      const payload = payloadResult.data;
      const workspaceGraph = await dataSource.getWorkspaceGraph(workspaceId);

      if (!workspaceGraph) {
        return workspaceNotFound(c, workspaceId);
      }

      const mutation = await dataSource.updateWorkspace(workspaceId, payload);

      if (!mutation) {
        return errorResponse(
          c,
          422,
          "workspace_update_failed",
          `Workspace '${workspaceId}' could not be updated.`,
        );
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/workspaces/{workspaceId}/documents",
      tags: ["documents"],
      request: {
        params: workspaceParamSchema,
        body: {
          required: true,
          content: jsonContent(documentCreateRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Document created.",
          content: jsonContent(successEnvelopeSchema(documentMutationEnvelopeSchema)),
        },
        404: {
          description: "Workspace not found.",
          content: jsonContent(errorEnvelope),
        },
        422: {
          description: "Document creation failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, documentCreateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const { workspaceId } = paramsResult.data;
      const payload = payloadResult.data;
      const workspaceGraph = await dataSource.getWorkspaceGraph(workspaceId);

      if (!workspaceGraph) {
        return workspaceNotFound(c, workspaceId);
      }

      const mutation = await dataSource.createDocument(workspaceId, payload);

      if (!mutation) {
        return errorResponse(
          c,
          422,
          "document_create_failed",
          `Document could not be created in workspace '${workspaceId}'.`,
        );
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "patch",
      path: "/api/workspaces/{workspaceId}/documents/{documentId}",
      tags: ["documents"],
      request: {
        params: workspaceDocumentParamSchema,
        body: {
          required: true,
          content: jsonContent(documentUpdateRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Document updated.",
          content: jsonContent(successEnvelopeSchema(documentMutationEnvelopeSchema)),
        },
        404: {
          description: "Workspace or document not found.",
          content: jsonContent(errorEnvelope),
        },
        422: {
          description: "Document update failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceDocumentParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, documentUpdateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const { workspaceId, documentId } = paramsResult.data;
      const documents = await dataSource.getWorkspaceDocuments(workspaceId);

      if (!documents) {
        return workspaceNotFound(c, workspaceId);
      }

      if (!findEntityById(documents, documentId)) {
        return documentNotFound(c, documentId);
      }

      const mutation = await dataSource.updateDocument(
        workspaceId,
        documentId,
        payloadResult.data,
      );

      if (!mutation) {
        return errorResponse(
          c,
          422,
          "document_update_failed",
          `Document '${documentId}' could not be updated.`,
        );
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/workspaces/{workspaceId}/documents/{documentId}/approvals/request",
      tags: ["approvals"],
      request: {
        params: workspaceDocumentParamSchema,
        body: {
          required: true,
          content: jsonContent(approvalRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Approval requested.",
          content: jsonContent(successEnvelopeSchema(approvalMutationEnvelopeSchema)),
        },
        404: {
          description: "Workspace or document not found.",
          content: jsonContent(errorEnvelope),
        },
        422: {
          description: "Approval request failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceDocumentParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, approvalRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const { workspaceId, documentId } = paramsResult.data;
      const documents = await dataSource.getWorkspaceDocuments(workspaceId);

      if (!documents) {
        return workspaceNotFound(c, workspaceId);
      }

      if (!findEntityById(documents, documentId)) {
        return documentNotFound(c, documentId);
      }

      const mutation = await dataSource.requestApproval(
        workspaceId,
        documentId,
        payloadResult.data,
      );

      if (!mutation) {
        return errorResponse(
          c,
          422,
          "approval_request_failed",
          `Approval request for document '${documentId}' could not be created.`,
        );
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/workspaces/{workspaceId}/approvals/{approvalId}/decision",
      tags: ["approvals"],
      request: {
        params: workspaceApprovalParamSchema,
        body: {
          required: true,
          content: jsonContent(approvalDecisionSchema),
        },
      },
      responses: {
        200: {
          description: "Approval decision recorded.",
          content: jsonContent(successEnvelopeSchema(approvalMutationEnvelopeSchema)),
        },
        404: {
          description: "Workspace or approval not found.",
          content: jsonContent(errorEnvelope),
        },
        422: {
          description: "Approval decision failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceApprovalParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, approvalDecisionSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const { workspaceId, approvalId } = paramsResult.data;
      const approvals = await dataSource.getWorkspaceApprovals(workspaceId);

      if (!approvals) {
        return workspaceNotFound(c, workspaceId);
      }

      if (!findEntityById(approvals, approvalId)) {
        return approvalNotFound(c, approvalId);
      }

      const mutation = await dataSource.decideApproval(
        workspaceId,
        approvalId,
        payloadResult.data,
      );

      if (!mutation) {
        return errorResponse(
          c,
          422,
          "approval_decision_failed",
          `Approval '${approvalId}' could not be updated.`,
        );
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/workspaces/{workspaceId}/publish-records",
      tags: ["publish"],
      request: {
        params: workspaceParamSchema,
        body: {
          required: true,
          content: jsonContent(publishRecordCreateRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Publish record prepared.",
          content: jsonContent(successEnvelopeSchema(publishRecordMutationEnvelopeSchema)),
        },
        404: {
          description: "Workspace not found.",
          content: jsonContent(errorEnvelope),
        },
        422: {
          description: "Publish record creation failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, publishRecordCreateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const { workspaceId } = paramsResult.data;
      const publishRecords = await dataSource.getWorkspacePublishRecords(workspaceId);

      if (!publishRecords) {
        return workspaceNotFound(c, workspaceId);
      }

      const mutation = await dataSource.createPublishRecord(workspaceId, payloadResult.data);

      if (!mutation) {
        return errorResponse(
          c,
          422,
          "publish_record_create_failed",
          `Publish preparation could not be created for workspace '${workspaceId}'.`,
        );
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/workspaces/{workspaceId}/publish-records/{publishRecordId}/execute",
      tags: ["publish"],
      request: {
        params: workspacePublishRecordParamSchema,
        body: {
          required: true,
          content: jsonContent(publishRecordExecuteRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Publish record executed and PR automation completed.",
          content: jsonContent(successEnvelopeSchema(publishExecutionEnvelopeSchema)),
        },
        404: {
          description: "Workspace or publish record not found.",
          content: jsonContent(errorEnvelope),
        },
        422: {
          description: "Publish execution failed.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const paramsResult = parseParams(c, workspacePublishRecordParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, publishRecordExecuteRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const { workspaceId, publishRecordId } = paramsResult.data;
      const publishRecords = await dataSource.getWorkspacePublishRecords(workspaceId);

      if (!publishRecords) {
        return workspaceNotFound(c, workspaceId);
      }

      if (!findEntityById(publishRecords, publishRecordId)) {
        return publishRecordNotFound(c, publishRecordId);
      }

      const mutation = await dataSource.executePublishRecord(
        workspaceId,
        publishRecordId,
        payloadResult.data,
      );

      if (!mutation) {
        return errorResponse(
          c,
          422,
          "publish_execute_failed",
          `Publish record '${publishRecordId}' could not be executed.`,
        );
      }

      return successResponse(c, mutation);
    },
  );

  registerOpenApiRoute(app,
    createRoute({
      method: "post",
      path: "/api/intake/preview",
      tags: ["intake"],
      request: {
        body: {
          required: true,
          content: jsonContent(intakePreviewRequestSchema),
        },
      },
      responses: {
        200: {
          description: "Prompt intake preview for AI-assisted workflow routing.",
          content: jsonContent(successEnvelopeSchema(intakePreviewSchema)),
        },
        422: {
          description: "Intake preview payload is invalid.",
          content: jsonContent(errorEnvelope),
        },
      },
    }),
    async (c: Context) => {
      const payloadResult = await parseJsonBody(c, intakePreviewRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const payload = payloadResult.data;

      return successResponse(c, {
        summary: `${payload.provider} should interview this prompt before proposing new specs.`,
        recommendedRoute: "workspace.discovery",
        recommendedArtifacts: ["PRD", "UX Flow", "Technical Spec", "Policy/Decision"],
        nextAction: `Start an intake interview for "${payload.prompt}".`,
      } satisfies IntakePreviewDto);
    },
  );

  return app;
}

export type AppType = ReturnType<typeof createApiApp>;

export function createRpcClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}
