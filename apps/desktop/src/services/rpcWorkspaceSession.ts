import { unwrapApiResponse, type BootstrapSessionDto } from "@harness-docs/contracts";
import { harnessRpcClient } from "../lib/rpc/client";
import type { SessionUser, WorkspaceGraph, WorkspaceSummary } from "../types";
import type {
  AuthenticatedSessionSnapshot,
  WorkspaceSessionService,
  WorkspaceSessionSnapshot,
} from "./contracts";

interface CreateRpcWorkspaceSessionServiceOptions {
  fallbackSnapshot: () => Promise<WorkspaceSessionSnapshot> | WorkspaceSessionSnapshot;
}

function mapBootstrapSession(
  session: AuthenticatedSessionSnapshot,
  payload: BootstrapSessionDto,
): WorkspaceSessionSnapshot {
  return {
    user: session.user as SessionUser,
    workspaces: payload.workspaces as WorkspaceSummary[],
    workspaceGraphs: payload.workspaceGraphs as WorkspaceGraph[],
    lastActiveWorkspaceId: payload.lastActiveWorkspaceId,
  };
}

export function createRpcWorkspaceSessionService({
  fallbackSnapshot,
}: CreateRpcWorkspaceSessionServiceOptions): WorkspaceSessionService {
  return {
    async getSnapshot(session) {
      if (session.status !== "authenticated") {
        throw new Error("Workspace session requires an authenticated user session.");
      }

      try {
        const response = await harnessRpcClient.api.session.bootstrap.$get();

        if (!response.ok) {
          throw new Error(`Workspace bootstrap failed with ${response.status}`);
        }

        const payload = unwrapApiResponse<BootstrapSessionDto>(await response.json());
        return mapBootstrapSession(session, payload);
      } catch {
        const snapshot = await fallbackSnapshot();

        return {
          ...snapshot,
          user: session.user,
        };
      }
    },
  };
}
