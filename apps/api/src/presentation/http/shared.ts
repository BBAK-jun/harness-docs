import { z } from "@hono/zod-openapi";
import type { Context, TypedResponse } from "hono";
import type {
  ApiErrorResponse,
  ApiResponse,
  ApiResponseMeta,
  ApiSuccessResponse,
  AuthenticationProviderDto,
} from "@harness-docs/contracts";
import type { ApiAuthDataSource } from "../../application/ports";
import type { ApplicationResult } from "../../application/shared/result";

type SuccessStatus = 200;
type ErrorStatus = 404 | 422 | 500;
type StandardStatus = SuccessStatus | ErrorStatus;

export const workspaceIdParamSchema = z
  .string()
  .openapi({ param: { name: "workspaceId", in: "path" }, example: "ws_harness_docs" });

export const documentIdParamSchema = z
  .string()
  .openapi({ param: { name: "documentId", in: "path" }, example: "doc_123" });

export const approvalIdParamSchema = z
  .string()
  .openapi({ param: { name: "approvalId", in: "path" }, example: "apr_123" });

export const publishRecordIdParamSchema = z
  .string()
  .openapi({ param: { name: "publishRecordId", in: "path" }, example: "pub_123" });

export const authorizationAttemptIdParamSchema = z
  .string()
  .openapi({ param: { name: "attemptId", in: "path" }, example: "gha_demo" });

export const workspaceParamSchema = z.object({
  workspaceId: workspaceIdParamSchema,
});

export const workspaceDocumentParamSchema = z.object({
  workspaceId: workspaceIdParamSchema,
  documentId: documentIdParamSchema,
});

export const workspaceApprovalParamSchema = z.object({
  workspaceId: workspaceIdParamSchema,
  approvalId: approvalIdParamSchema,
});

export const workspacePublishRecordParamSchema = z.object({
  workspaceId: workspaceIdParamSchema,
  publishRecordId: publishRecordIdParamSchema,
});

export const githubAuthorizationAttemptParamSchema = z.object({
  attemptId: authorizationAttemptIdParamSchema,
});

export function createSuccessEnvelopeSchema<TSchema extends z.ZodType>(dataSchema: TSchema) {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
    error: z.null(),
    meta: apiResponseMetaSchema,
  });
}

export function createErrorEnvelopeSchema() {
  return z.object({
    ok: z.literal(false),
    data: z.null(),
    error: apiErrorDescriptorSchema,
    meta: apiResponseMetaSchema,
  });
}

export function jsonContent<TSchema extends z.ZodType>(schema: TSchema) {
  return {
    "application/json": {
      schema,
    },
  };
}

export const authenticationProviderSchema = z.object({
  id: z.literal("github_oauth"),
  label: z.literal("GitHub OAuth"),
  kind: z.literal("oauth"),
});

export const githubOAuthProvider: AuthenticationProviderDto = {
  id: "github_oauth",
  label: "GitHub OAuth",
  kind: "oauth",
};

const apiResponseMetaSchema = z.object({
  requestId: z.string().nullable(),
  timestamp: z.string(),
  path: z.string(),
  method: z.string(),
  status: z.number(),
});

const apiErrorDescriptorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
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

export function respondWithApplicationResult<TData>(c: Context, result: ApplicationResult<TData>) {
  if (result.ok) {
    return successResponse(c, result.data);
  }

  return errorResponse(
    c,
    result.error.status,
    result.error.code,
    result.error.message,
    result.error.details,
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

export function parseParams<TSchema extends z.ZodType>(c: Context, schema: TSchema) {
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

export async function parseJsonBody<TSchema extends z.ZodType>(c: Context, schema: TSchema) {
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

export function readBearerToken(c: Context) {
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

export async function requireSession(c: Context, authDataSource?: ApiAuthDataSource) {
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
