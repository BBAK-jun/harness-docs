import { toPublishPreflightView } from "../lib/publishGovernanceView";
import type { WorkspaceGraph } from "../types/contracts";
import type { WorkspaceId } from "../types/domain-ui";
import type {
  PublishAutomationContract,
  PublishExecutionInput,
  PublishExecutionResult,
  PublishingService,
  WorkspacePublishingSnapshot,
} from "../domain/publishing";

interface CreateSessionBackedPublishingServiceOptions {
  getWorkspaceGraph: (
    workspaceId: WorkspaceId,
  ) => Promise<WorkspaceGraph | null> | WorkspaceGraph | null;
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

export function createSessionBackedPublishingService({
  getWorkspaceGraph,
}: CreateSessionBackedPublishingServiceOptions): PublishingService {
  return {
    async getAutomationContract() {
      return publishAutomationContract;
    },
    async getWorkspacePublishingSnapshot(workspaceId) {
      const graph = await getWorkspaceGraph(workspaceId);

      if (!graph) {
        throw new Error(`Workspace graph not found for ${workspaceId}.`);
      }

      return buildWorkspacePublishingSnapshot(graph);
    },
    async getDocumentPublishPreflight(workspaceId, documentId) {
      const graph = await getWorkspaceGraph(workspaceId);

      if (!graph) {
        return null;
      }

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
      const graph = await getWorkspaceGraph(workspaceId);

      if (!graph) {
        return null;
      }

      return graph.publishRecords.find((record) => record.id === publishRecordId) ?? null;
    },
    async executePublish(_input: PublishExecutionInput): Promise<PublishExecutionResult> {
      throw new Error("executePublish must be provided by the runtime publishing service.");
    },
  };
}
