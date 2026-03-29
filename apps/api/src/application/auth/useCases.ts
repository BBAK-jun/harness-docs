import type {
  ApiAuthenticationSessionDto,
  AuthSessionExchangeRequestDto,
  AuthenticationProviderDto,
  GitHubOAuthAttemptDto,
  GitHubOAuthStartDto,
  SignedOutApiSessionDto,
} from "@harness-docs/contracts";
import type { ApiAuthDataSource, GitHubOAuthDataSource } from "../ports";
import { fail, succeed } from "../shared/result";

const githubOAuthProvider: AuthenticationProviderDto = {
  id: "github_oauth",
  label: "GitHub OAuth",
  kind: "oauth",
};

function createSignedOutSession(): SignedOutApiSessionDto {
  return {
    status: "signed_out",
    provider: githubOAuthProvider,
    user: null,
    sessionToken: null,
    expiresAt: null,
  };
}

type AuthUseCaseDependencies = {
  authDataSource?: ApiAuthDataSource;
  gitHubOAuthDataSource?: GitHubOAuthDataSource;
};

export function createAuthUseCases({
  authDataSource,
  gitHubOAuthDataSource,
}: AuthUseCaseDependencies) {
  return {
    async startGitHubAuthorization(requestOrigin: string) {
      if (!gitHubOAuthDataSource) {
        return fail(
          500,
          "github_oauth_not_configured",
          "GitHub OAuth is not configured for this API instance.",
        );
      }

      return succeed<GitHubOAuthStartDto>(
        await gitHubOAuthDataSource.startAuthorization({ requestOrigin }),
      );
    },
    async callbackGitHubAuthorization(input: {
      requestOrigin: string;
      code: string | null;
      state: string | null;
      error: string | null;
      errorDescription: string | null;
    }) {
      if (!gitHubOAuthDataSource) {
        return fail(
          500,
          "github_oauth_not_configured",
          "GitHub OAuth is not configured for this API instance.",
        );
      }

      return succeed(await gitHubOAuthDataSource.completeAuthorization(input));
    },
    async getGitHubAuthorizationAttempt(attemptId: string) {
      if (!gitHubOAuthDataSource) {
        return fail(
          500,
          "github_oauth_not_configured",
          "GitHub OAuth is not configured for this API instance.",
        );
      }

      const attempt = await gitHubOAuthDataSource.getAuthorizationAttempt(attemptId);

      if (!attempt) {
        return fail(
          404,
          "github_oauth_attempt_not_found",
          `GitHub OAuth attempt '${attemptId}' is not registered.`,
        );
      }

      return succeed<GitHubOAuthAttemptDto>(attempt);
    },
    async createSession(input: AuthSessionExchangeRequestDto) {
      if (!authDataSource) {
        return fail(
          500,
          "auth_data_source_missing",
          "Authentication session exchange is not configured for this API instance.",
        );
      }

      return succeed(await authDataSource.exchangeSession(input));
    },
    async getSession(sessionToken: string | null) {
      if (!authDataSource || !sessionToken) {
        return succeed<ApiAuthenticationSessionDto>(createSignedOutSession());
      }

      return succeed<ApiAuthenticationSessionDto>(
        (await authDataSource.getSession(sessionToken)) ?? createSignedOutSession(),
      );
    },
    async deleteSession(sessionToken: string | null) {
      if (authDataSource && sessionToken) {
        await authDataSource.revokeSession(sessionToken);
      }

      return succeed<SignedOutApiSessionDto>(createSignedOutSession());
    },
  };
}
