import type {
  WorkspaceCreateRequestDto,
  WorkspaceOnboardingEnvelopeDto,
} from "@harness-docs/contracts";
import { unwrapApiResponse } from "@harness-docs/contracts";
import { harnessApiBaseUrl } from "../lib/rpc/client";

interface CreateWorkspaceOptions {
  getSessionToken?: () => Promise<string | null> | string | null;
}

export async function createWorkspace(
  input: WorkspaceCreateRequestDto,
  options: CreateWorkspaceOptions = {},
) {
  const sessionToken = await options.getSessionToken?.();
  const response = await fetch(`${harnessApiBaseUrl}/api/workspaces`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Workspace creation failed with ${response.status}`);
  }

  return unwrapApiResponse<WorkspaceOnboardingEnvelopeDto>(await response.json());
}
