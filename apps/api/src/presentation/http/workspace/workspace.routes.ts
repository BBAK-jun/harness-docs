import {
  type WorkspaceCatalogEnvelopeDto,
  workspaceCatalogEnvelopeSchema,
  workspaceCreateRequestSchema,
  workspaceGraphEnvelopeSchema,
  workspaceInvitationCreateRequestSchema,
  workspaceInvitationAcceptRequestSchema,
  workspaceInvitationEnvelopeSchema,
  workspaceMutationEnvelopeSchema,
  workspaceOnboardingEnvelopeSchema,
  workspaceUpdateRequestSchema,
} from "@harness-docs/contracts";
import { createRoute } from "../../../infrastructure/lib/router";
import {
  createErrorEnvelopeSchema,
  createSuccessEnvelopeSchema,
  jsonContent,
  workspaceParamSchema,
} from "../shared";

const tags = ["workspaces"];
const onboardingTags = ["workspaces", "onboarding"];
const errorEnvelope = createErrorEnvelopeSchema();

export const listWorkspaces = createRoute({
  method: "get",
  path: "/workspaces",
  tags,
  responses: {
    200: {
      description: "Workspace catalog for the signed-in user.",
      content: jsonContent(createSuccessEnvelopeSchema(workspaceCatalogEnvelopeSchema)),
    },
    422: {
      description: "Authentication is required.",
      content: jsonContent(errorEnvelope),
    },
  },
});

export const createWorkspace = createRoute({
  method: "post",
  path: "/workspaces",
  tags: onboardingTags,
  request: {
    body: {
      required: true,
      content: jsonContent(workspaceCreateRequestSchema),
    },
  },
  responses: {
    200: {
      description: "Workspace created and bootstrap refreshed.",
      content: jsonContent(createSuccessEnvelopeSchema(workspaceOnboardingEnvelopeSchema)),
    },
    422: {
      description: "Workspace creation failed.",
      content: jsonContent(errorEnvelope),
    },
  },
});

export const createWorkspaceInvitation = createRoute({
  method: "post",
  path: "/workspaces/{workspaceId}/invitations",
  tags: onboardingTags,
  request: {
    params: workspaceParamSchema,
    body: {
      required: true,
      content: jsonContent(workspaceInvitationCreateRequestSchema),
    },
  },
  responses: {
    200: {
      description: "Workspace invitation created.",
      content: jsonContent(createSuccessEnvelopeSchema(workspaceInvitationEnvelopeSchema)),
    },
    422: {
      description: "Workspace invitation creation failed.",
      content: jsonContent(errorEnvelope),
    },
  },
});

export const acceptWorkspaceInvitation = createRoute({
  method: "post",
  path: "/workspace-invitations/acceptances",
  tags: onboardingTags,
  request: {
    body: {
      required: true,
      content: jsonContent(workspaceInvitationAcceptRequestSchema),
    },
  },
  responses: {
    200: {
      description: "Workspace invitation accepted and bootstrap refreshed.",
      content: jsonContent(createSuccessEnvelopeSchema(workspaceOnboardingEnvelopeSchema)),
    },
    422: {
      description: "Invitation acceptance failed.",
      content: jsonContent(errorEnvelope),
    },
  },
});

export const getWorkspaceGraph = createRoute({
  method: "get",
  path: "/workspaces/{workspaceId}/graph",
  tags,
  request: {
    params: workspaceParamSchema,
  },
  responses: {
    200: {
      description: "Workspace graph.",
      content: jsonContent(createSuccessEnvelopeSchema(workspaceGraphEnvelopeSchema)),
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
});

export const updateWorkspace = createRoute({
  method: "patch",
  path: "/workspaces/{workspaceId}",
  tags,
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
      content: jsonContent(createSuccessEnvelopeSchema(workspaceMutationEnvelopeSchema)),
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
});

export type { WorkspaceCatalogEnvelopeDto };
