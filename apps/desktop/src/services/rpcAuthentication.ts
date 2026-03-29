import type {
  ApiAuthenticationSessionDto,
  AuthSessionExchangeRequestDto,
  GitHubOAuthAttemptDto,
  GitHubOAuthStartDto,
} from "@harness-docs/contracts";
import { harnessRpcClient } from "../lib/rpc/client";
import { unwrapRpcResponse } from "../lib/rpc/response";

export async function exchangeApiSession(input: AuthSessionExchangeRequestDto) {
  const response = await harnessRpcClient.api.auth.sessions.$post({
    json: input,
  });

  return unwrapRpcResponse<ApiAuthenticationSessionDto>(
    response,
    "Authentication session exchange failed",
  );
}

export async function getApiSession(sessionToken: string) {
  const response = await harnessRpcClient.api.auth.session.$get({
    header: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined,
  });

  return unwrapRpcResponse<ApiAuthenticationSessionDto>(
    response,
    "Authentication session restore failed",
  );
}

export async function revokeApiSession(sessionToken: string) {
  const response = await harnessRpcClient.api.auth.session.$delete({
    header: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined,
  });

  return unwrapRpcResponse<ApiAuthenticationSessionDto>(
    response,
    "Authentication sign-out failed",
  );
}

export async function startGitHubOAuth() {
  const response = await harnessRpcClient.api.auth.github.authorizations.$post({});

  return unwrapRpcResponse<GitHubOAuthStartDto>(response, "GitHub OAuth start failed");
}

export async function getGitHubOAuthAttempt(attemptId: string) {
  const response = await harnessRpcClient.api.auth.github.authorizations[":attemptId"].$get({
    param: { attemptId },
  });

  return unwrapRpcResponse<GitHubOAuthAttemptDto>(response, "GitHub OAuth attempt lookup failed");
}
