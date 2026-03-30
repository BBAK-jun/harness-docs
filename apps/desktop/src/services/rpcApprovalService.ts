import type {
  ApprovalDecisionDto,
  ApprovalMutationEnvelopeDto,
  ApprovalRequestDto,
} from "../types/contracts";
import type { ApprovalService } from "../domain/approvals";
import { harnessRpcClient } from "../lib/rpc/client";
import { createAuthorizationHeader, unwrapRpcResponse } from "../lib/rpc/response";

interface CreateRpcApprovalServiceOptions {
  fallbackService: ApprovalService;
  getSessionToken?: () => Promise<string | null> | string | null;
}

export function createRpcApprovalService({
  fallbackService,
  getSessionToken,
}: CreateRpcApprovalServiceOptions): ApprovalService {
  return {
    ...fallbackService,
    async requestApproval(workspaceId, documentId, input) {
      const sessionToken = await getSessionToken?.();
      const response = await harnessRpcClient.api.workspaces[":workspaceId"].documents[
        ":documentId"
      ].approvals.$post(
        {
          param: { workspaceId, documentId },
          json: input,
        },
        {
          headers: createAuthorizationHeader(sessionToken),
        },
      );

      const payload = await unwrapRpcResponse<ApprovalMutationEnvelopeDto>(
        response,
        "Approval request failed",
      );

      return {
        approval: payload.approval,
        workspaceGraph: payload.workspaceGraph,
      };
    },
    async decideApproval(workspaceId, approvalId, input) {
      const sessionToken = await getSessionToken?.();
      const response = await harnessRpcClient.api.workspaces[":workspaceId"].approvals[
        ":approvalId"
      ].$patch(
        {
          param: { workspaceId, approvalId },
          json: input,
        },
        {
          headers: createAuthorizationHeader(sessionToken),
        },
      );

      const payload = await unwrapRpcResponse<ApprovalMutationEnvelopeDto>(
        response,
        "Approval decision failed",
      );

      return {
        approval: payload.approval,
        workspaceGraph: payload.workspaceGraph,
      };
    },
  };
}
