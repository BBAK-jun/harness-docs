import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApprovalDecision, ApprovalRequestDto, DocumentApproval } from "../types/contracts";
import { desktopMutationKeys, desktopQueryKeys } from "../queries/queryKeys";
import type { WorkspaceShellModel } from "./useWorkspaceShell";
import { loadBootstrapState } from "./useAppBootstrap";
import {
  canCurrentMembershipDecideApproval,
  hasOpenApprovalForMembership,
  pickSuggestedApprovalReviewer,
} from "./approvalActionUtils";
import { showErrorToast, toErrorMessage } from "../lib/errorToast";

type ApprovalDecisionAction = Extract<ApprovalDecision, "approved" | "changes_requested">;

export function useApprovalsPage(shell: WorkspaceShellModel) {
  const queryClient = useQueryClient();
  const [decisionTargetApprovalId, setDecisionTargetApprovalId] = useState<string | null>(null);
  const approvals = useMemo(() => {
    if (!shell.activeWorkspaceGraph || !shell.activeDocument) {
      return [];
    }

    return shell.activeWorkspaceGraph.approvals.filter(
      (approval) => approval.documentId === shell.activeDocument?.id,
    );
  }, [shell.activeDocument, shell.activeWorkspaceGraph]);
  const suggestedReviewer = useMemo(() => {
    if (!shell.activeWorkspaceGraph) {
      return null;
    }

    return pickSuggestedApprovalReviewer(shell.activeWorkspaceGraph, shell.activeMembershipId);
  }, [shell.activeMembershipId, shell.activeWorkspaceGraph]);

  const refreshBootstrap = async () => {
    const nextBootstrap = await loadBootstrapState(shell.services);
    queryClient.setQueryData(desktopQueryKeys.bootstrap(), nextBootstrap);
    return nextBootstrap;
  };

  const refreshBootstrapAfterMutation = async () => {
    try {
      await refreshBootstrap();
    } catch (error) {
      showErrorToast({
        title: "승인 상태 새로고침 실패",
        description: `서버에는 반영되었지만 화면 상태를 다시 읽지 못했습니다. ${toErrorMessage(error)}`,
      });
    }
  };

  const requestApprovalMutation = useMutation({
    mutationKey: desktopMutationKeys.approvals.request(),
    mutationFn: async ({
      workspaceId,
      documentId,
      input,
    }: {
      workspaceId: string;
      documentId: string;
      input: ApprovalRequestDto;
    }) => shell.services.approvals.requestApproval(workspaceId, documentId, input),
    onSuccess: async () => {
      await refreshBootstrapAfterMutation();
    },
    onError: (error) => {
      showErrorToast({
        title: "승인 요청 실패",
        description: toErrorMessage(error),
      });
    },
  });

  const decisionMutation = useMutation({
    mutationKey: desktopMutationKeys.approvals.decide(),
    mutationFn: async ({
      workspaceId,
      approvalId,
      decision,
    }: {
      workspaceId: string;
      approvalId: string;
      decision: ApprovalDecisionAction;
    }) =>
      shell.services.approvals.decideApproval(workspaceId, approvalId, {
        decision,
        decisionByMembershipId: shell.activeMembershipId ?? "",
      }),
    onSuccess: async () => {
      await refreshBootstrapAfterMutation();
    },
    onError: (error) => {
      showErrorToast({
        title: "승인 결정 실패",
        description: toErrorMessage(error),
      });
    },
    onSettled: () => {
      setDecisionTargetApprovalId(null);
    },
  });

  const hasOpenSuggestedApproval = useMemo(() => {
    if (!suggestedReviewer) {
      return false;
    }

    return hasOpenApprovalForMembership(approvals, suggestedReviewer.membershipId);
  }, [approvals, suggestedReviewer]);

  const requestApprovalDisabledReason =
    !shell.activeWorkspaceGraph || !shell.activeDocument
      ? "문서를 선택해야 승인 요청을 보낼 수 있습니다."
      : !shell.activeMembershipId
        ? "활성 멤버십이 있어야 승인 요청을 보낼 수 있습니다."
        : !suggestedReviewer
          ? "요청 가능한 승인자를 찾지 못했습니다."
          : hasOpenSuggestedApproval
            ? `${suggestedReviewer.reviewerLabel}에게 이미 미해결 승인 요청이 있습니다.`
            : requestApprovalMutation.isPending
              ? "승인 요청을 보내는 중입니다."
              : null;

  const handleRequestApproval = async () => {
    if (
      !shell.activeWorkspaceGraph ||
      !shell.activeDocument ||
      !shell.activeMembershipId ||
      !suggestedReviewer ||
      requestApprovalDisabledReason
    ) {
      return;
    }

    try {
      await requestApprovalMutation.mutateAsync({
        workspaceId: shell.activeWorkspaceGraph.workspace.id,
        documentId: shell.activeDocument.id,
        input: {
          authority: suggestedReviewer.authority,
          source: "workspace_membership",
          reviewerLabel: suggestedReviewer.reviewerLabel,
          membershipId: suggestedReviewer.membershipId,
          requestedByMembershipId: shell.activeMembershipId,
        },
      });
    } catch {
      return;
    }
  };

  const handleApprovalDecision = async (approvalId: string, decision: ApprovalDecisionAction) => {
    if (!shell.activeWorkspaceId || !shell.activeMembershipId || decisionMutation.isPending) {
      return;
    }

    const targetApproval = approvals.find((approval) => approval.id === approvalId) ?? null;

    if (
      !targetApproval ||
      !canCurrentMembershipDecideApproval(targetApproval, shell.activeMembershipId)
    ) {
      return;
    }

    setDecisionTargetApprovalId(approvalId);

    try {
      await decisionMutation.mutateAsync({
        workspaceId: shell.activeWorkspaceId,
        approvalId,
        decision,
      });
    } catch {
      return;
    }
  };

  return {
    approvals,
    requestApprovalLabel: suggestedReviewer
      ? `${suggestedReviewer.reviewerLabel}에게 승인 요청`
      : "승인 요청",
    requestApprovalDisabledReason,
    isRequestingApproval: requestApprovalMutation.isPending,
    canCurrentMemberDecide: (approval: DocumentApproval) =>
      canCurrentMembershipDecideApproval(approval, shell.activeMembershipId),
    isDecisionPendingFor: (approvalId: string) =>
      decisionMutation.isPending && decisionTargetApprovalId === approvalId,
    handleRequestApproval,
    handleApprovalDecision,
  };
}
