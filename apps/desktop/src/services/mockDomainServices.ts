import type {
  ApprovalService,
  DocumentApprovalBundle,
  WorkspaceApprovalPolicy,
} from "../domain/approvals";
import type { AITaskExecutionInput, AITaskExecutionResult, AITaskService } from "../domain/aiTasks";
import type {
  PublishAutomationContract,
  PublishExecutionResult,
  PublishingService,
  WorkspacePublishingSnapshot,
} from "../domain/publishing";
import { toPublishPreflightView } from "../lib/publishGovernanceView";
import type {
  WorkspaceMemberProfile,
  WorkspaceMembershipCapabilities,
  WorkspaceMembershipService,
  WorkspaceMembershipSnapshot,
} from "../domain/workspaceMembership";
import { mockSession } from "../data/mockSession";
import type {
  AIDraftSuggestion,
  PublishRecord,
  UserId,
  WorkspaceGraph,
  WorkspaceId,
  WorkspaceMembership,
} from "../types";

const mockUserDirectory = {
  usr_mina_cho: {
    name: "Mina Cho",
    githubLogin: "mina-cho",
  },
  usr_lee_park: {
    name: "Lee Park",
    githubLogin: "lee-park",
  },
  usr_sam_kim: {
    name: "Sam Kim",
    githubLogin: "sam-kim",
  },
  usr_ava_shah: {
    name: "Ava Shah",
    githubLogin: "ava-shah",
  },
  usr_dan_ng: {
    name: "Dan Ng",
    githubLogin: "dan-ng",
  },
  usr_noah_rivera: {
    name: "Noah Rivera",
    githubLogin: "noah-rivera",
  },
} as const;

function getWorkspaceGraph(workspaceId: WorkspaceId): WorkspaceGraph {
  const graph = mockSession.workspaceGraphs.find((entry) => entry.workspace.id === workspaceId);

  if (!graph) {
    throw new Error(`Workspace graph not found for ${workspaceId}.`);
  }

  return graph;
}

function getMembershipCapabilities(
  role: WorkspaceMembership["role"],
): WorkspaceMembershipCapabilities {
  switch (role) {
    case "Lead":
      return {
        canEditDocuments: true,
        canManageApprovals: true,
        canPublish: true,
        canAdministerWorkspace: true,
      };
    case "Editor":
      return {
        canEditDocuments: true,
        canManageApprovals: false,
        canPublish: true,
        canAdministerWorkspace: false,
      };
    case "Reviewer":
      return {
        canEditDocuments: false,
        canManageApprovals: true,
        canPublish: false,
        canAdministerWorkspace: false,
      };
  }
}

function formatMemberProfile(
  membership: WorkspaceMembership,
  currentUserId: UserId,
): WorkspaceMemberProfile {
  const user = mockUserDirectory[membership.userId as keyof typeof mockUserDirectory] ?? {
    name: membership.userId.replace(/^usr_/, "").replace(/_/g, " "),
    githubLogin: membership.userId.replace(/^usr_/, "").replace(/_/g, "-"),
  };

  return {
    membership,
    displayName: user.name,
    githubLogin: user.githubLogin,
    isCurrentUser: membership.userId === currentUserId,
    capabilities: getMembershipCapabilities(membership.role),
  };
}

function buildWorkspaceMembershipSnapshot(
  graph: WorkspaceGraph,
  userId: UserId,
): WorkspaceMembershipSnapshot {
  const activeMembership =
    graph.memberships.find(
      (membership) => membership.userId === userId && membership.lifecycle.status === "active",
    ) ?? null;

  return {
    workspaceId: graph.workspace.id,
    repository: graph.workspace.docsRepository,
    leadMembershipId: graph.workspace.leadMembershipId,
    currentUserMembershipId: activeMembership?.id ?? null,
    roles: ["Lead", "Editor", "Reviewer"],
    members: graph.memberships.map((membership) => formatMemberProfile(membership, userId)),
  };
}

function buildApprovalBundle(
  graph: WorkspaceGraph,
  documentId: string,
): DocumentApprovalBundle | null {
  const document = graph.documents.find((entry) => entry.id === documentId);

  if (!document) {
    return null;
  }

  const approvals = graph.approvals.filter((approval) => approval.documentId === documentId);
  const invalidations = document.lifecycle.review.freshness.invalidations;
  const unresolvedApprovals = document.prePublication.unresolvedApprovals ?? [];

  return {
    workspaceId: graph.workspace.id,
    documentId: document.id,
    documentTitle: document.title,
    review: document.lifecycle.review,
    approvals,
    invalidations,
    unresolvedApprovals,
  };
}

function buildWorkspacePublishingSnapshot(graph: WorkspaceGraph): WorkspacePublishingSnapshot {
  const activePublishRecord = graph.publishRecords[0] ?? null;

  return {
    workspaceId: graph.workspace.id,
    repository: graph.workspace.docsRepository,
    activePublishRecord,
    publishRecords: graph.publishRecords,
    staleDocumentIds: activePublishRecord?.staleDocumentIds ?? [],
    unresolvedApprovalIds: activePublishRecord?.unresolvedApprovalIds ?? [],
  };
}

const publishAutomationContract: PublishAutomationContract = {
  sourceOfTruth: "app",
  versionControlProvider: "github",
  repositoryMapping: "one_workspace_to_one_repo",
  automatedSteps: ["create_branch", "create_commit", "create_pull_request"],
  stalePublishPolicy: {
    evaluatedAtPublishTime: true,
    allowStalePublish: true,
    requireRationale: true,
    preserveUnresolvedState: true,
  },
  templateVersioning: "templates_versioned_and_published",
};

export function createMockWorkspaceMembershipService(): WorkspaceMembershipService {
  return {
    async listForUser(userId) {
      return mockSession.workspaceGraphs
        .filter((graph) => graph.memberships.some((membership) => membership.userId === userId))
        .map((graph) => buildWorkspaceMembershipSnapshot(graph, userId));
    },
    async getWorkspaceMemberships(workspaceId, userId) {
      return buildWorkspaceMembershipSnapshot(getWorkspaceGraph(workspaceId), userId);
    },
  };
}

export function createMockApprovalService(): ApprovalService {
  return {
    async getWorkspacePolicy(workspaceId) {
      const graph = getWorkspaceGraph(workspaceId);
      const leadMembershipIds = graph.memberships
        .filter((membership) => membership.role === "Lead")
        .map((membership) => membership.id);

      const policy: WorkspaceApprovalPolicy = {
        workspaceId,
        importedCandidateSources: ["workspace_membership", "github_import"],
        restorationPolicy: {
          restoredBy: "lead",
          leadMembershipIds,
          appNativeOnly: true,
        },
        linkedDocumentChangesRequestReview: true,
        linkedDocumentChangesTriggerNotifications: true,
      };

      return policy;
    },
    async listDocumentApprovalBundles(workspaceId) {
      const graph = getWorkspaceGraph(workspaceId);

      return graph.documents
        .map((document) => buildApprovalBundle(graph, document.id))
        .filter((bundle): bundle is DocumentApprovalBundle => bundle !== null);
    },
    async getDocumentApprovalBundle(workspaceId, documentId) {
      return buildApprovalBundle(getWorkspaceGraph(workspaceId), documentId);
    },
  };
}

export function createMockPublishingService(): PublishingService {
  return {
    async getAutomationContract() {
      return publishAutomationContract;
    },
    async getWorkspacePublishingSnapshot(workspaceId) {
      return buildWorkspacePublishingSnapshot(getWorkspaceGraph(workspaceId));
    },
    async getDocumentPublishPreflight(workspaceId, documentId) {
      const graph = getWorkspaceGraph(workspaceId);
      const document = graph.documents.find((entry) => entry.id === documentId) ?? null;

      if (!document) {
        return null;
      }

      const publishRecord =
        graph.publishRecords.find((record) => record.staleDocumentIds.includes(documentId)) ??
        graph.publishRecords[0] ??
        null;

      return toPublishPreflightView(document, publishRecord, new Date().toISOString());
    },
    async getPublishRecord(workspaceId, publishRecordId) {
      return (
        getWorkspaceGraph(workspaceId).publishRecords.find(
          (record: PublishRecord) => record.id === publishRecordId,
        ) ?? null
      );
    },
    async executePublish(input) {
      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      const result: PublishExecutionResult = {
        repository: `${input.repository.owner}/${input.repository.name}`,
        localRepoPath: "/mock/github/repository",
        branchName: input.publishRecord.publication.repository.branchName,
        commitSha: "mock-commit-sha",
        pullRequestNumber: 42,
        pullRequestUrl: "https://github.com/mock/mock/pull/42",
        committedFiles: input.files.map((file) => file.path),
        startedAt,
        completedAt,
      };

      return result;
    },
  };
}

function createMockSuggestion(input: AITaskExecutionInput): AIDraftSuggestion | null {
  const document =
    input.entry.documentId != null
      ? (input.workspaceGraph.documents.find((entry) => entry.id === input.entry.documentId) ??
        null)
      : (input.workspaceGraph.documents[0] ?? null);

  if (!document) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: `ai_mock_${input.entry.id}`,
    workspaceId: input.workspaceGraph.workspace.id,
    documentId: document.id,
    templateId: document.templateId,
    provider: input.entry.provider,
    kind: input.entry.kind,
    summary: `Mock ${input.entry.provider} output for ${input.entry.title}`,
    promptLabel: input.entry.title,
    authoringContext: {
      workspaceId: input.workspaceGraph.workspace.id,
      currentDocumentId: document.id,
      templateId: document.templateId,
      currentUserMembershipId: input.workspaceGraph.workspace.leadMembershipId,
      activeArea: "ai",
      intent: input.entry.suggestedIntent,
      linkedDocumentIds: document.linkedDocumentIds,
      invalidatedByDocumentIds: input.entry.invalidatedByDocumentIds,
      referenceDocumentIds: input.entry.referenceDocumentIds,
    },
    sections: [
      {
        sectionId: "mock-output",
        title: input.entry.title,
        markdown: "Mock AI output generated from browser fallback services.",
        rationale: "Use the Tauri runtime to execute Codex or Claude for real.",
      },
    ],
    suggestedLinkedDocumentIds: input.entry.referenceDocumentIds,
    lifecycle: {
      status: "proposed",
      createdAt: now,
      updatedAt: now,
      generatedAt: now,
    },
  };
}

export function createMockAITaskService(): AITaskService {
  return {
    async runEntryPoint(input) {
      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();

      return {
        provider: input.entry.provider,
        command: "mock-ai-task",
        promptLabel: input.entry.title,
        output: `Mock ${input.entry.provider} run for ${input.entry.title}\n\n${input.prompt}`,
        workingDirectory: "/mock/ai-workspace",
        startedAt,
        completedAt,
        suggestion: createMockSuggestion(input),
      };
    },
  };
}
