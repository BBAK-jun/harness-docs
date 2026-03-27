import type { WorkspaceSessionDataSource } from "@harness-docs/contracts";
import { mockSession } from "../../../desktop/src/data/mockSession.ts";

export function createMockWorkspaceSessionSource(): WorkspaceSessionDataSource {
  return {
    getBootstrapSession() {
      return {
        user: mockSession.user,
        workspaces: mockSession.workspaces,
        workspaceGraphs: mockSession.workspaceGraphs,
        lastActiveWorkspaceId: mockSession.lastActiveWorkspaceId
      };
    },
    getWorkspaceGraph(workspaceId) {
      return (
        mockSession.workspaceGraphs.find((graph) => graph.workspace.id === workspaceId) ?? null
      );
    },
    getWorkspaceDocuments(workspaceId) {
      const workspaceGraph = mockSession.workspaceGraphs.find(
        (graph) => graph.workspace.id === workspaceId
      );

      return workspaceGraph?.documents ?? null;
    },
    getWorkspaceApprovals(workspaceId) {
      const workspaceGraph = mockSession.workspaceGraphs.find(
        (graph) => graph.workspace.id === workspaceId
      );

      return workspaceGraph?.approvals ?? null;
    },
    getWorkspacePublishRecords(workspaceId) {
      const workspaceGraph = mockSession.workspaceGraphs.find(
        (graph) => graph.workspace.id === workspaceId
      );

      return workspaceGraph?.publishRecords ?? null;
    }
  };
}
