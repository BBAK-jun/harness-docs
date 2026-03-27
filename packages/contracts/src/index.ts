import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { Hono } from "hono";
import { hc } from "hono/client";
import { cors } from "hono/cors";
import { z } from "zod";

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

export interface ApiErrorDescriptor<
  TCode extends string = string,
  TDetails = unknown
> {
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

export interface ApiErrorResponse<
  TCode extends string = string,
  TDetails = unknown
> {
  ok: false;
  data: null;
  error: ApiErrorDescriptor<TCode, TDetails>;
  meta: ApiResponseMeta;
}

export type ApiResponse<
  TData,
  TCode extends string = string,
  TDetails = unknown
> = ApiSuccessResponse<TData> | ApiErrorResponse<TCode, TDetails>;

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

export interface WorkspaceSessionDataSource {
  getBootstrapSession: () => BootstrapSessionDto;
  getWorkspaceGraph: (workspaceId: string) => unknown | null;
  getWorkspaceDocuments: (workspaceId: string) => unknown[] | null;
  getWorkspaceApprovals: (workspaceId: string) => unknown[] | null;
  getWorkspacePublishRecords: (workspaceId: string) => unknown[] | null;
}

export const intakePreviewRequestSchema = z.object({
  prompt: z.string().min(1),
  provider: z.enum(["Codex", "Claude"])
});

export type IntakePreviewRequestDto = z.infer<typeof intakePreviewRequestSchema>;

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
        highlights: ["Linked-doc traceability", "Template-aware creation", "Queue overview"]
      },
      editor: {
        title: "Markdown Editor",
        description: "Edit with explicit locks and live preview.",
        primaryAction: "Resume latest draft",
        highlights: ["Start Editing lock flow", "Split source and preview", "Idle release"]
      },
      comments: {
        title: "Comments and Mentions",
        description: "Track paragraph and block feedback.",
        primaryAction: "Open review threads",
        highlights: ["Paragraph comments", "@mention routing", "Review visibility"]
      },
      approvals: {
        title: "Approvals",
        description: "Manage app-native approvers and lead restoration.",
        primaryAction: "Review approver matrix",
        highlights: ["App-managed authority", "Decision history", "Lead restoration"]
      },
      publish: {
        title: "Publish Flow",
        description: "Prepare GitHub branch, commit, and pull request publication.",
        primaryAction: "Prepare publish memo",
        highlights: ["Stale publish allowed", "Rationale required", "PR automation"]
      },
      ai: {
        title: "AI Harness",
        description: "Launch Codex or Claude against internal workspace docs.",
        primaryAction: "Start AI task",
        highlights: ["Provider selection", "Action-button first UX", "Internal-doc search only"]
      }
    }
  }
];

function createDefaultDataSource(): WorkspaceSessionDataSource {
  const snapshot: BootstrapSessionDto = {
    user: {
      id: "usr_demo",
      name: "Demo User",
      handle: "@demo",
      avatarInitials: "DU",
      githubLogin: "demo",
      primaryEmail: "demo@example.com"
    },
    workspaces: defaultWorkspaceCatalog,
    workspaceGraphs: [],
    lastActiveWorkspaceId: defaultWorkspaceCatalog[0]?.id ?? null
  };

  return {
    getBootstrapSession: () => snapshot,
    getWorkspaceGraph: () => null,
    getWorkspaceDocuments: () => [],
    getWorkspaceApprovals: () => [],
    getWorkspacePublishRecords: () => []
  };
}

export interface CreateApiAppOptions {
  dataSource?: WorkspaceSessionDataSource;
}

function createResponseMeta(c: Context, status: StandardStatus): ApiResponseMeta {
  return {
    requestId: c.req.header("x-request-id") ?? null,
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method,
    status
  };
}

export function successResponse<TData>(c: Context, data: TData, status: SuccessStatus = 200) {
  return c.json<ApiSuccessResponse<TData>>(
    {
      ok: true,
      data,
      error: null,
      meta: createResponseMeta(c, status)
    },
    status
  );
}

export function errorResponse<TCode extends string, TDetails = unknown>(
  c: Context,
  status: ErrorStatus,
  code: TCode,
  message: string,
  details?: TDetails
) {
  return c.json<ApiErrorResponse<TCode, TDetails>>(
    {
      ok: false,
      data: null,
      error: {
        code,
        message,
        details
      },
      meta: createResponseMeta(c, status)
    },
    status
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

function validateRequest<TSchema extends z.ZodTypeAny>(
  target: ValidationTarget,
  schema: TSchema
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        422,
        "validation_error",
        `Invalid ${target} payload.`,
        result.error.issues
      );
    }
  });
}

function workspaceNotFound(c: Context, workspaceId: string) {
  return errorResponse(
    c,
    404,
    "workspace_not_found",
    `Workspace '${workspaceId}' is not registered.`
  );
}

export function createApiApp(options: CreateApiAppOptions = {}) {
  const dataSource = options.dataSource ?? createDefaultDataSource();
  const app = new Hono();

  app.use("*", cors());
  app.notFound((c) =>
    errorResponse(c, 404, "route_not_found", `Route '${c.req.path}' is not registered.`)
  );
  app.onError((error, c) =>
    errorResponse(
      c,
      500,
      "internal_server_error",
      error instanceof Error ? error.message : "Unexpected error while handling request."
    )
  );

  const routes = app
    .get("/health", (c) =>
      successResponse(
        c,
        {
          service: "harness-docs-api",
          status: "ok",
          transport: "hono-rpc"
        } satisfies HealthCheckDto
      )
    )
    .get("/api/session/bootstrap", (c) => successResponse(c, dataSource.getBootstrapSession()))
    .get("/api/workspaces", (c) =>
      successResponse(
        c,
        {
          workspaces: dataSource.getBootstrapSession().workspaces
        } satisfies WorkspaceCatalogEnvelopeDto
      )
    )
    .get(
      "/api/workspaces/:workspaceId/graph",
      validateRequest(
        "param",
        z.object({
          workspaceId: z.string()
        })
      ),
      (c) => {
        const { workspaceId } = c.req.valid("param");
        const workspaceGraph = dataSource.getWorkspaceGraph(workspaceId);

        if (!workspaceGraph) {
          return workspaceNotFound(c, workspaceId);
        }

        return successResponse(c, {
          workspaceGraph
        } satisfies WorkspaceGraphEnvelopeDto);
      }
    )
    .get(
      "/api/workspaces/:workspaceId/documents",
      validateRequest(
        "param",
        z.object({
          workspaceId: z.string()
        })
      ),
      (c) => {
        const { workspaceId } = c.req.valid("param");
        const documents = dataSource.getWorkspaceDocuments(workspaceId);

        if (!documents) {
          return workspaceNotFound(c, workspaceId);
        }

        return successResponse(c, {
          documents
        } satisfies WorkspaceDocumentsEnvelopeDto);
      }
    )
    .get(
      "/api/workspaces/:workspaceId/approvals",
      validateRequest(
        "param",
        z.object({
          workspaceId: z.string()
        })
      ),
      (c) => {
        const { workspaceId } = c.req.valid("param");
        const approvals = dataSource.getWorkspaceApprovals(workspaceId);

        if (!approvals) {
          return workspaceNotFound(c, workspaceId);
        }

        return successResponse(c, {
          approvals
        } satisfies WorkspaceApprovalsEnvelopeDto);
      }
    )
    .get(
      "/api/workspaces/:workspaceId/publish-records",
      validateRequest(
        "param",
        z.object({
          workspaceId: z.string()
        })
      ),
      (c) => {
        const { workspaceId } = c.req.valid("param");
        const publishRecords = dataSource.getWorkspacePublishRecords(workspaceId);

        if (!publishRecords) {
          return workspaceNotFound(c, workspaceId);
        }

        return successResponse(c, {
          publishRecords
        } satisfies WorkspacePublishRecordsEnvelopeDto);
      }
    )
    .post(
      "/api/intake/preview",
      validateRequest("json", intakePreviewRequestSchema),
      (c) => {
        const payload = c.req.valid("json");

        return successResponse(
          c,
          {
            summary: `${payload.provider} should interview this prompt before proposing new specs.`,
            recommendedRoute: "workspace.discovery",
            recommendedArtifacts: ["PRD", "UX Flow", "Technical Spec", "Policy/Decision"],
            nextAction: `Start an intake interview for "${payload.prompt}".`
          } satisfies IntakePreviewDto
        );
      }
    );

  return routes;
}

export type AppType = ReturnType<typeof createApiApp>;

export function createRpcClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}
