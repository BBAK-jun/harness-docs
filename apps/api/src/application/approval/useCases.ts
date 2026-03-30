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

      if (
        input.membershipId &&
        input.requestedByMembershipId &&
        input.membershipId === input.requestedByMembershipId
      ) {
        return fail(
          422,
          "approval_self_request_not_allowed",
          "Approval requester and reviewer must be different memberships.",
        );
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

      const targetApproval = approvals.find((approval) => approval.id === approvalId);

      if (!targetApproval) {
        return approvalNotFoundFailure(approvalId);
      }

      if (
        !targetApproval.membershipId ||
        targetApproval.membershipId !== input.decisionByMembershipId
      ) {
        return fail(
          422,
          "approval_decision_forbidden",
          "Only the assigned reviewer membership can record this approval decision.",
        );
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
