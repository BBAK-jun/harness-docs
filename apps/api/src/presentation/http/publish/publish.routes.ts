import {
  publishExecutionEnvelopeSchema,
  publishRecordCreateRequestSchema,
  publishRecordExecuteRequestSchema,
  publishRecordMutationEnvelopeSchema,
  workspacePublishRecordsEnvelopeSchema,
} from "@harness-docs/contracts";
import { createRoute } from "../../../infrastructure/lib/router";
import {
  createErrorEnvelopeSchema,
  createSuccessEnvelopeSchema,
  jsonContent,
  workspaceParamSchema,
  workspacePublishRecordParamSchema,
} from "../shared";

const tags = ["publish"];
const errorEnvelope = createErrorEnvelopeSchema();

export const listWorkspacePublishRecords = createRoute({
  method: "get",
  path: "/workspaces/{workspaceId}/publish-records",
  tags,
  request: {
    params: workspaceParamSchema,
  },
  responses: {
    200: {
      description: "Workspace publish records.",
      content: jsonContent(createSuccessEnvelopeSchema(workspacePublishRecordsEnvelopeSchema)),
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

export const createPublishRecord = createRoute({
  method: "post",
  path: "/workspaces/{workspaceId}/publish-records",
  tags,
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
      content: jsonContent(createSuccessEnvelopeSchema(publishRecordMutationEnvelopeSchema)),
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
});

export const executePublishRecord = createRoute({
  method: "post",
  path: "/workspaces/{workspaceId}/publish-records/{publishRecordId}/executions",
  tags,
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
      content: jsonContent(createSuccessEnvelopeSchema(publishExecutionEnvelopeSchema)),
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
});
