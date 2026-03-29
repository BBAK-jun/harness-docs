import {
  approvalDecisionSchema,
  approvalMutationEnvelopeSchema,
  approvalRequestSchema,
  workspaceApprovalsEnvelopeSchema,
} from "@harness-docs/contracts";
import { createRoute } from "../../../infrastructure/lib/router";
import {
  createErrorEnvelopeSchema,
  createSuccessEnvelopeSchema,
  jsonContent,
  workspaceApprovalParamSchema,
  workspaceDocumentParamSchema,
  workspaceParamSchema,
} from "../shared";

const tags = ["approvals"];
const errorEnvelope = createErrorEnvelopeSchema();

export const listWorkspaceApprovals = createRoute({
  method: "get",
  path: "/workspaces/{workspaceId}/approvals",
  tags,
  request: {
    params: workspaceParamSchema,
  },
  responses: {
    200: {
      description: "Workspace approvals.",
      content: jsonContent(createSuccessEnvelopeSchema(workspaceApprovalsEnvelopeSchema)),
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

export const requestApproval = createRoute({
  method: "post",
  path: "/workspaces/{workspaceId}/documents/{documentId}/approvals",
  tags,
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
      content: jsonContent(createSuccessEnvelopeSchema(approvalMutationEnvelopeSchema)),
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
});

export const decideApproval = createRoute({
  method: "patch",
  path: "/workspaces/{workspaceId}/approvals/{approvalId}",
  tags,
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
      content: jsonContent(createSuccessEnvelopeSchema(approvalMutationEnvelopeSchema)),
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
});
