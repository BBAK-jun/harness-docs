import type {
  ApiAuthenticationSessionDto,
  AuthSessionExchangeRequestDto,
  GitHubOAuthAttemptDto,
  GitHubOAuthStartDto,
} from "@harness-docs/contracts";
import { unwrapApiResponse } from "@harness-docs/contracts";
import { harnessApiBaseUrl } from "../lib/rpc/client";

function buildHeaders(sessionToken?: string | null) {
  return {
    "content-type": "application/json",
    ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}),
  };
}

export async function exchangeApiSession(input: AuthSessionExchangeRequestDto) {
  const response = await fetch(`${harnessApiBaseUrl}/api/auth/session/exchange`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Authentication session exchange failed with ${response.status}`);
  }

  return unwrapApiResponse<ApiAuthenticationSessionDto>(await response.json());
}

export async function getApiSession(sessionToken: string) {
  const response = await fetch(`${harnessApiBaseUrl}/api/auth/session`, {
    headers: buildHeaders(sessionToken),
  });

  if (!response.ok) {
    throw new Error(`Authentication session restore failed with ${response.status}`);
  }

  return unwrapApiResponse<ApiAuthenticationSessionDto>(await response.json());
}

export async function revokeApiSession(sessionToken: string) {
  const response = await fetch(`${harnessApiBaseUrl}/api/auth/sign-out`, {
    method: "POST",
    headers: buildHeaders(sessionToken),
  });

  if (!response.ok) {
    throw new Error(`Authentication sign-out failed with ${response.status}`);
  }

  return unwrapApiResponse<ApiAuthenticationSessionDto>(await response.json());
}

export async function startGitHubOAuth() {
  const response = await fetch(`${harnessApiBaseUrl}/api/auth/github/start`);

  if (!response.ok) {
    throw new Error(`GitHub OAuth start failed with ${response.status}`);
  }

  return unwrapApiResponse<GitHubOAuthStartDto>(await response.json());
}

export async function getGitHubOAuthAttempt(attemptId: string) {
  const response = await fetch(`${harnessApiBaseUrl}/api/auth/github/attempts/${attemptId}`);

  if (!response.ok) {
    throw new Error(`GitHub OAuth attempt lookup failed with ${response.status}`);
  }

  return unwrapApiResponse<GitHubOAuthAttemptDto>(await response.json());
}
