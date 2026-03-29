import {
  documentCreateRequestSchema,
  documentMutationEnvelopeSchema,
  documentUpdateRequestSchema,
  publishPreflightEnvelopeSchema,
  workspaceDocumentsEnvelopeSchema,
} from "@harness-docs/contracts";
import { createRoute } from "../../../infrastructure/lib/router";
import {
  createErrorEnvelopeSchema,
  createSuccessEnvelopeSchema,
  jsonContent,
  workspaceDocumentParamSchema,
  workspaceParamSchema,
} from "../shared";

const documentTags = ["documents"];
const publishTags = ["publish"];
const errorEnvelope = createErrorEnvelopeSchema();

export const getDocumentPublishPreflight = createRoute({
  method: "get",
  path: "/workspaces/{workspaceId}/documents/{documentId}/publish-preflight",
  tags: publishTags,
  request: {
    params: workspaceDocumentParamSchema,
  },
  responses: {
    200: {
      description: "Authoritative publish preflight state for a document.",
      content: jsonContent(createSuccessEnvelopeSchema(publishPreflightEnvelopeSchema)),
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
});

export const listWorkspaceDocuments = createRoute({
  method: "get",
  path: "/workspaces/{workspaceId}/documents",
  tags: documentTags,
  request: {
    params: workspaceParamSchema,
  },
  responses: {
    200: {
      description: "Workspace documents.",
      content: jsonContent(createSuccessEnvelopeSchema(workspaceDocumentsEnvelopeSchema)),
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

export const createDocument = createRoute({
  method: "post",
  path: "/workspaces/{workspaceId}/documents",
  tags: documentTags,
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
      content: jsonContent(createSuccessEnvelopeSchema(documentMutationEnvelopeSchema)),
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
});

export const updateDocument = createRoute({
  method: "patch",
  path: "/workspaces/{workspaceId}/documents/{documentId}",
  tags: documentTags,
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
      content: jsonContent(createSuccessEnvelopeSchema(documentMutationEnvelopeSchema)),
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
});
