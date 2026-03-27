import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { Hono } from "hono";
import { hc } from "hono/client";
import { cors } from "hono/cors";
import { z } from "zod";
import type { PublishPreflightEnvelopeDto, PublishPreflightView } from "./publish-governance";

export * from "./publish-governance";

export type NavigationAreaKey =
  | "documents"
  | "editor"
  | "comments"
  | "approvals"
  | "publish"
  | "ai";

export interface SessionUserDto {
  id: string;
  name: string;
  handle: string;
  avatarInitials: string;
  githubLogin: string;
  primaryEmail: string;
}

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
  role: "Lead" | "Editor" | "Reviewer";
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

export interface WorkspaceSessionDataSource {
  getBootstrapSession: () => Promise<BootstrapSessionDto>;
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
}

export interface PublishGovernanceAdapter {
  projectDocumentPublishPreflight: (params: {
    workspaceId: string;
    documentId: string;
    workspaceGraph: unknown;
    documents: unknown[];
  }) => PublishPreflightView | null;
}

export const intakePreviewRequestSchema = z.object({
  prompt: z.string().min(1),
  provider: z.enum(["Codex", "Claude"]),
});

export type IntakePreviewRequestDto = z.infer<typeof intakePreviewRequestSchema>;

export const workspaceUpdateRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  defaultBranch: z.string().min(1).optional(),
  lastActive: z.boolean().optional(),
});

export type WorkspaceUpdateRequestDto = z.infer<typeof workspaceUpdateRequestSchema>;

export const documentCreateRequestSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["PRD", "UX Flow", "Technical Spec", "Policy/Decision"]),
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
  authority: z.enum(["lead", "required_reviewer", "optional_reviewer"]),
  source: z.enum(["workspace_membership", "github_import"]),
  reviewerLabel: z.string().min(1),
  membershipId: z.string().nullable().optional(),
  githubCandidateLogin: z.string().nullable().optional(),
  requestedByMembershipId: z.string().nullable().optional(),
  decisionNote: z.string().optional(),
});

export type ApprovalRequestDto = z.infer<typeof approvalRequestSchema>;

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "changes_requested", "restored"]),
  decisionByMembershipId: z.string().min(1),
  decisionNote: z.string().optional(),
});

export type ApprovalDecisionDto = z.infer<typeof approvalDecisionSchema>;

export const publishRecordCreateRequestSchema = z
  .object({
    source: z.object({
      kind: z.enum(["workspace", "document", "template"]),
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

type ValidationTarget = "json" | "param";
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
  };
}

export interface CreateApiAppOptions {
  dataSource?: WorkspaceSessionDataSource;
  publishGovernanceAdapter?: PublishGovernanceAdapter;
}

const workspaceParamSchema = z.object({
  workspaceId: z.string(),
});

const workspaceDocumentParamSchema = z.object({
  workspaceId: z.string(),
  documentId: z.string(),
});

const workspaceApprovalParamSchema = z.object({
  workspaceId: z.string(),
  approvalId: z.string(),
});

const workspacePublishRecordParamSchema = z.object({
  workspaceId: z.string(),
  publishRecordId: z.string(),
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

export function successResponse<TData>(c: Context, data: TData, status: SuccessStatus = 200) {
  return c.json<ApiSuccessResponse<TData>>(
    {
      ok: true,
      data,
      error: null,
      meta: createResponseMeta(c, status),
    },
    status,
  );
}

export function errorResponse<TCode extends string, TDetails = unknown>(
  c: Context,
  status: ErrorStatus,
  code: TCode,
  message: string,
  details?: TDetails,
) {
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
  );
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

function validateRequest<TSchema extends z.ZodTypeAny>(target: ValidationTarget, schema: TSchema) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        422,
        "validation_error",
        `Invalid ${target} payload.`,
        result.error.issues,
      );
    }
  });
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
  const app = new Hono();

  app.use("*", cors());
  app.notFound((c) =>
    errorResponse(c, 404, "route_not_found", `Route '${c.req.path}' is not registered.`),
  );
  app.onError((error, c) =>
    errorResponse(
      c,
      500,
      "internal_server_error",
      error instanceof Error ? error.message : "Unexpected error while handling request.",
    ),
  );

  const routes = app
    .get("/health", (c) =>
      successResponse(c, {
        service: "harness-docs-api",
        status: "ok",
        transport: "hono-rpc",
      } satisfies HealthCheckDto),
    )
    .get("/api/session/bootstrap", async (c) =>
      successResponse(c, await dataSource.getBootstrapSession()),
    )
    .get("/api/workspaces", async (c) =>
      successResponse(c, {
        workspaces: (await dataSource.getBootstrapSession()).workspaces,
      } satisfies WorkspaceCatalogEnvelopeDto),
    )
    .get(
      "/api/workspaces/:workspaceId/graph",
      validateRequest("param", workspaceParamSchema),
      async (c) => {
        const { workspaceId } = c.req.valid("param");
        const workspaceGraph = await dataSource.getWorkspaceGraph(workspaceId);

        if (!workspaceGraph) {
          return workspaceNotFound(c, workspaceId);
        }

        return successResponse(c, {
          workspaceGraph,
        } satisfies WorkspaceGraphEnvelopeDto);
      },
    )
    .get(
      "/api/workspaces/:workspaceId/documents/:documentId/publish-preflight",
      validateRequest("param", workspaceDocumentParamSchema),
      async (c) => {
        const { workspaceId, documentId } = c.req.valid("param");
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
    )
    .get(
      "/api/workspaces/:workspaceId/documents",
      validateRequest("param", workspaceParamSchema),
      async (c) => {
        const { workspaceId } = c.req.valid("param");
        const documents = await dataSource.getWorkspaceDocuments(workspaceId);

        if (!documents) {
          return workspaceNotFound(c, workspaceId);
        }

        return successResponse(c, {
          documents,
        } satisfies WorkspaceDocumentsEnvelopeDto);
      },
    )
    .get(
      "/api/workspaces/:workspaceId/approvals",
      validateRequest("param", workspaceParamSchema),
      async (c) => {
        const { workspaceId } = c.req.valid("param");
        const approvals = await dataSource.getWorkspaceApprovals(workspaceId);

        if (!approvals) {
          return workspaceNotFound(c, workspaceId);
        }

        return successResponse(c, {
          approvals,
        } satisfies WorkspaceApprovalsEnvelopeDto);
      },
    )
    .get(
      "/api/workspaces/:workspaceId/publish-records",
      validateRequest("param", workspaceParamSchema),
      async (c) => {
        const { workspaceId } = c.req.valid("param");
        const publishRecords = await dataSource.getWorkspacePublishRecords(workspaceId);

        if (!publishRecords) {
          return workspaceNotFound(c, workspaceId);
        }

        return successResponse(c, {
          publishRecords,
        } satisfies WorkspacePublishRecordsEnvelopeDto);
      },
    )
    .patch(
      "/api/workspaces/:workspaceId",
      validateRequest("param", workspaceParamSchema),
      validateRequest("json", workspaceUpdateRequestSchema),
      async (c) => {
        const { workspaceId } = c.req.valid("param");
        const payload = c.req.valid("json");
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
    )
    .post(
      "/api/workspaces/:workspaceId/documents",
      validateRequest("param", workspaceParamSchema),
      validateRequest("json", documentCreateRequestSchema),
      async (c) => {
        const { workspaceId } = c.req.valid("param");
        const payload = c.req.valid("json");
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
    )
    .patch(
      "/api/workspaces/:workspaceId/documents/:documentId",
      validateRequest("param", workspaceDocumentParamSchema),
      validateRequest("json", documentUpdateRequestSchema),
      async (c) => {
        const { workspaceId, documentId } = c.req.valid("param");
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
          c.req.valid("json"),
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
    )
    .post(
      "/api/workspaces/:workspaceId/documents/:documentId/approvals/request",
      validateRequest("param", workspaceDocumentParamSchema),
      validateRequest("json", approvalRequestSchema),
      async (c) => {
        const { workspaceId, documentId } = c.req.valid("param");
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
          c.req.valid("json"),
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
    )
    .post(
      "/api/workspaces/:workspaceId/approvals/:approvalId/decision",
      validateRequest("param", workspaceApprovalParamSchema),
      validateRequest("json", approvalDecisionSchema),
      async (c) => {
        const { workspaceId, approvalId } = c.req.valid("param");
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
          c.req.valid("json"),
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
    )
    .post(
      "/api/workspaces/:workspaceId/publish-records",
      validateRequest("param", workspaceParamSchema),
      validateRequest("json", publishRecordCreateRequestSchema),
      async (c) => {
        const { workspaceId } = c.req.valid("param");
        const publishRecords = await dataSource.getWorkspacePublishRecords(workspaceId);

        if (!publishRecords) {
          return workspaceNotFound(c, workspaceId);
        }

        const mutation = await dataSource.createPublishRecord(workspaceId, c.req.valid("json"));

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
    )
    .post(
      "/api/workspaces/:workspaceId/publish-records/:publishRecordId/execute",
      validateRequest("param", workspacePublishRecordParamSchema),
      validateRequest("json", publishRecordExecuteRequestSchema),
      async (c) => {
        const { workspaceId, publishRecordId } = c.req.valid("param");
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
          c.req.valid("json"),
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
    )
    .post("/api/intake/preview", validateRequest("json", intakePreviewRequestSchema), (c) => {
      const payload = c.req.valid("json");

      return successResponse(c, {
        summary: `${payload.provider} should interview this prompt before proposing new specs.`,
        recommendedRoute: "workspace.discovery",
        recommendedArtifacts: ["PRD", "UX Flow", "Technical Spec", "Policy/Decision"],
        nextAction: `Start an intake interview for "${payload.prompt}".`,
      } satisfies IntakePreviewDto);
    });

  return routes;
}

export type AppType = ReturnType<typeof createApiApp>;

export function createRpcClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}
