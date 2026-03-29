import type {
  ApprovalDecisionDto,
  ApprovalMutationEnvelopeDto,
  ApprovalRequestDto,
  WorkspaceApprovalsEnvelopeDto,
} from "@harness-docs/contracts";
import type { WorkspaceSessionDataSource } from "../ports";
import {
  approvalNotFoundFailure,
  documentNotFoundFailure,
  workspaceNotFoundFailure,
} from "../shared/failures";
import { hasEntityWithId } from "../shared/entities";
import { fail, succeed } from "../shared/result";

type ApprovalUseCaseDependencies = {
  dataSource: WorkspaceSessionDataSource;
};

export function createApprovalUseCases({ dataSource }: ApprovalUseCaseDependencies) {
  return {
    async listWorkspaceApprovals(workspaceId: string) {
      const approvals = await dataSource.getWorkspaceApprovals(workspaceId);

      if (!approvals) {
        return workspaceNotFoundFailure(workspaceId);
      }

      return succeed<WorkspaceApprovalsEnvelopeDto>({ approvals });
    },
    async requestApproval(workspaceId: string, documentId: string, input: ApprovalRequestDto) {
      const documents = await dataSource.getWorkspaceDocuments(workspaceId);

      if (!documents) {
        return workspaceNotFoundFailure(workspaceId);
      }

      if (!hasEntityWithId(documents, documentId)) {
        return documentNotFoundFailure(documentId);
      }

      const mutation = await dataSource.requestApproval(workspaceId, documentId, input);

      if (!mutation) {
        return fail(
          422,
          "approval_request_failed",
          `Approval request for document '${documentId}' could not be created.`,
        );
      }

      return succeed<ApprovalMutationEnvelopeDto>(mutation);
    },
    async decideApproval(workspaceId: string, approvalId: string, input: ApprovalDecisionDto) {
      const approvals = await dataSource.getWorkspaceApprovals(workspaceId);

      if (!approvals) {
        return workspaceNotFoundFailure(workspaceId);
      }

      if (!hasEntityWithId(approvals, approvalId)) {
        return approvalNotFoundFailure(approvalId);
      }

      const mutation = await dataSource.decideApproval(workspaceId, approvalId, input);

      if (!mutation) {
        return fail(
          422,
          "approval_decision_failed",
          `Approval '${approvalId}' could not be updated.`,
        );
      }

      return succeed<ApprovalMutationEnvelopeDto>(mutation);
    },
  };
}
