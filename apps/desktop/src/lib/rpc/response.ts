import { unwrapApiResponse } from "@harness-docs/contracts";

export function createAuthorizationHeader(sessionToken?: string | null) {
  if (!sessionToken) {
    return undefined;
  }

  return {
    authorization: `Bearer ${sessionToken}`,
  };
}

export async function unwrapRpcResponse<TData>(
  response: Response,
  failureMessage: string,
): Promise<TData> {
  if (!response.ok) {
    throw new Error(`${failureMessage} with ${response.status}`);
  }

  return unwrapApiResponse<TData>(await response.json());
}
