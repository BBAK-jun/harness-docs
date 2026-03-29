import type {
  ApprovalService,
  DocumentApprovalBundle,
  WorkspaceApprovalPolicy,
} from "../domain/approvals";
import type { WorkspaceGraph } from "../types/contracts";
import type { DocumentId, WorkspaceId } from "../types/domain-ui";

interface SessionBackedApprovalServiceOptions {
  getWorkspaceGraph: (
    workspaceId: WorkspaceId,
  ) => Promise<WorkspaceGraph | null> | WorkspaceGraph | null;
}

function buildApprovalBundle(
  graph: WorkspaceGraph,
  documentId: DocumentId,
): DocumentApprovalBundle | null {
  const document = graph.documents.find((entry) => entry.id === documentId);

  if (!document) {
    return null;
  }

  const approvals = graph.approvals.filter((approval) => approval.documentId === documentId);

  return {
    workspaceId: graph.workspace.id,
    documentId: document.id,
    documentTitle: document.title,
    review: document.lifecycle.review,
    approvals,
    invalidations: document.lifecycle.review.freshness.invalidations,
    unresolvedApprovals: document.prePublication.unresolvedApprovals ?? [],
  };
}

export function createSessionBackedApprovalService({
  getWorkspaceGraph,
}: SessionBackedApprovalServiceOptions): ApprovalService {
  return {
    async getWorkspacePolicy(workspaceId) {
      const graph = await getWorkspaceGraph(workspaceId);

      if (!graph) {
        throw new Error(`Workspace graph not found for ${workspaceId}.`);
      }

      const leadMembershipIds = graph.memberships
        .filter((membership) => membership.role === "Lead")
        .map((membership) => membership.id);

      return {
        workspaceId,
        importedCandidateSources: ["workspace_membership", "github_import"],
        restorationPolicy: {
          restoredBy: "lead",
          leadMembershipIds,
          appNativeOnly: true,
        },
        linkedDocumentChangesRequestReview: true,
        linkedDocumentChangesTriggerNotifications: true,
      } satisfies WorkspaceApprovalPolicy;
    },
    async listDocumentApprovalBundles(workspaceId) {
      const graph = await getWorkspaceGraph(workspaceId);

      if (!graph) {
        return [];
      }

      return graph.documents
        .map((document) => buildApprovalBundle(graph, document.id))
        .filter((bundle): bundle is DocumentApprovalBundle => bundle !== null);
    },
    async getDocumentApprovalBundle(workspaceId, documentId) {
      const graph = await getWorkspaceGraph(workspaceId);

      if (!graph) {
        return null;
      }

      return buildApprovalBundle(graph, documentId);
    },
  };
}
