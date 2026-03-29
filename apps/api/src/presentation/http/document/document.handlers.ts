import { documentCreateRequestSchema, documentUpdateRequestSchema } from "@harness-docs/contracts";
import { createDocumentUseCases } from "../../../application/document/useCases";
import type { ApiRouteDependencies } from "../../../application/ports";
import type { ApiContext } from "../../../infrastructure/lib/router";
import {
  parseJsonBody,
  parseParams,
  respondWithApplicationResult,
  workspaceDocumentParamSchema,
  workspaceParamSchema,
} from "../shared";

type DocumentHandlerDependencies = Pick<
  ApiRouteDependencies,
  "dataSource" | "publishGovernanceAdapter"
>;

export function createDocumentHandlers({
  dataSource,
  publishGovernanceAdapter,
}: DocumentHandlerDependencies) {
  const useCases = createDocumentUseCases({
    dataSource,
    publishGovernanceAdapter,
  });

  return {
    async getDocumentPublishPreflight(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceDocumentParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.getDocumentPublishPreflight(
          paramsResult.data.workspaceId,
          paramsResult.data.documentId,
        ),
      );
    },
    async listWorkspaceDocuments(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.listWorkspaceDocuments(paramsResult.data.workspaceId),
      );
    },
    async createDocument(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, documentCreateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.createDocument(paramsResult.data.workspaceId, payloadResult.data),
      );
    },
    async updateDocument(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceDocumentParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, documentUpdateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.updateDocument(
          paramsResult.data.workspaceId,
          paramsResult.data.documentId,
          payloadResult.data,
        ),
      );
    },
  };
}
