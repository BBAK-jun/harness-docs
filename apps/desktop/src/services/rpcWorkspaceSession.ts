import { unwrapApiResponse, type BootstrapSessionDto } from "@harness-docs/contracts";
import { harnessApiBaseUrl } from "../lib/rpc/client";
import type { SessionUser, WorkspaceGraph, WorkspaceSummary } from "../types";
import type {
  AuthenticatedSessionSnapshot,
  WorkspaceSessionService,
  WorkspaceSessionSnapshot,
} from "./contracts";

interface CreateRpcWorkspaceSessionServiceOptions {
  getSessionToken?: () => Promise<string | null> | string | null;
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
  getSessionToken,
}: CreateRpcWorkspaceSessionServiceOptions): WorkspaceSessionService {
  return {
    async getSnapshot(session) {
      if (session.status !== "authenticated") {
        throw new Error("Workspace session requires an authenticated user session.");
      }

      try {
        const sessionToken = await getSessionToken?.();
        const response = await fetch(`${harnessApiBaseUrl}/api/session/bootstrap`, {
          headers: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined,
        });

        if (!response.ok) {
          throw new Error(`Workspace bootstrap failed with ${response.status}`);
        }

        const payload = unwrapApiResponse<BootstrapSessionDto>(await response.json());
        return mapBootstrapSession(session, payload);
      } catch {
        throw new Error("Workspace bootstrap must be loaded from the API.");
      }
    },
  };
}
