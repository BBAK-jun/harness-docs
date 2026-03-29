import { approvalDecisionSchema, approvalRequestSchema } from "@harness-docs/contracts";
import { createApprovalUseCases } from "../../../application/approval/useCases";
import type { ApiRouteDependencies } from "../../../application/ports";
import type { ApiContext } from "../../../infrastructure/lib/router";
import {
  parseJsonBody,
  parseParams,
  respondWithApplicationResult,
  workspaceApprovalParamSchema,
  workspaceDocumentParamSchema,
  workspaceParamSchema,
} from "../shared";

type ApprovalHandlerDependencies = Pick<ApiRouteDependencies, "dataSource">;

export function createApprovalHandlers({ dataSource }: ApprovalHandlerDependencies) {
  const useCases = createApprovalUseCases({ dataSource });

  return {
    async listWorkspaceApprovals(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.listWorkspaceApprovals(paramsResult.data.workspaceId),
      );
    },
    async requestApproval(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceDocumentParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, approvalRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.requestApproval(
          paramsResult.data.workspaceId,
          paramsResult.data.documentId,
          payloadResult.data,
        ),
      );
    },
    async decideApproval(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceApprovalParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, approvalDecisionSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.decideApproval(
          paramsResult.data.workspaceId,
          paramsResult.data.approvalId,
          payloadResult.data,
        ),
      );
    },
  };
}
