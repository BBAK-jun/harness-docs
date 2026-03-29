import {
  apiAuthenticationSessionSchema,
  authSessionExchangeRequestSchema,
  authenticatedApiSessionSchema,
  gitHubOAuthAttemptSchema,
  gitHubOAuthStartSchema,
  signedOutApiSessionSchema,
} from "@harness-docs/contracts";
import { createRoute } from "../../../infrastructure/lib/router";
import {
  createErrorEnvelopeSchema,
  createSuccessEnvelopeSchema,
  githubAuthorizationAttemptParamSchema,
  jsonContent,
} from "../shared";

const tags = ["auth"];
const errorEnvelope = createErrorEnvelopeSchema();

export const startGitHubAuthorization = createRoute({
  method: "post",
  path: "/auth/github/authorizations",
  tags,
  responses: {
    200: {
      description: "GitHub OAuth authorization start payload.",
      content: jsonContent(createSuccessEnvelopeSchema(gitHubOAuthStartSchema)),
    },
    500: {
      description: "GitHub OAuth is not configured.",
      content: jsonContent(errorEnvelope),
    },
  },
});

export const getGitHubAuthorizationAttempt = createRoute({
  method: "get",
  path: "/auth/github/authorizations/{attemptId}",
  tags,
  request: {
    params: githubAuthorizationAttemptParamSchema,
  },
  responses: {
    200: {
      description: "GitHub OAuth authorization attempt status.",
      content: jsonContent(createSuccessEnvelopeSchema(gitHubOAuthAttemptSchema)),
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
});

export const createSession = createRoute({
  method: "post",
  path: "/auth/sessions",
  tags,
  request: {
    body: {
      required: true,
      content: jsonContent(authSessionExchangeRequestSchema),
    },
  },
  responses: {
    200: {
      description: "Authenticated app session.",
      content: jsonContent(createSuccessEnvelopeSchema(authenticatedApiSessionSchema)),
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
});

export const getSession = createRoute({
  method: "get",
  path: "/auth/session",
  tags,
  responses: {
    200: {
      description: "Current authentication session snapshot.",
      content: jsonContent(createSuccessEnvelopeSchema(apiAuthenticationSessionSchema)),
    },
  },
});

export const deleteSession = createRoute({
  method: "delete",
  path: "/auth/session",
  tags,
  responses: {
    200: {
      description: "Signed-out session snapshot.",
      content: jsonContent(createSuccessEnvelopeSchema(signedOutApiSessionSchema)),
    },
  },
});
