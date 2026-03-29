import type {
  WorkspaceCreateRequestDto,
  WorkspaceOnboardingEnvelopeDto,
} from "@harness-docs/contracts";
import { harnessRpcClient } from "../lib/rpc/client";
import { unwrapRpcResponse } from "../lib/rpc/response";

interface CreateWorkspaceOptions {
  getSessionToken?: () => Promise<string | null> | string | null;
}

export async function createWorkspace(
  input: WorkspaceCreateRequestDto,
  options: CreateWorkspaceOptions = {},
) {
  const sessionToken = await options.getSessionToken?.();
  const response = await harnessRpcClient.api.workspaces.$post({
    json: input,
  }, {
    headers: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined,
  });

  return unwrapRpcResponse<WorkspaceOnboardingEnvelopeDto>(response, "Workspace creation failed");
}
