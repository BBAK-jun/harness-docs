import type { BootstrapSessionDto } from "@harness-docs/contracts";
import { harnessRpcClient } from "../lib/rpc/client";
import { unwrapRpcResponse } from "../lib/rpc/response";
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
    user: session.user,
    workspaces: payload.workspaces,
    workspaceGraphs: payload.workspaceGraphs,
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
        const response = await harnessRpcClient.api.session.bootstrap.$get({
          header: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined,
        });

        const payload = await unwrapRpcResponse<BootstrapSessionDto>(
          response,
          "Workspace bootstrap failed",
        );
        return mapBootstrapSession(session, payload);
      } catch {
        throw new Error("Workspace bootstrap must be loaded from the API.");
      }
    },
  };
}
