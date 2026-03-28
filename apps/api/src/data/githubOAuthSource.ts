import type {
  ApiAuthDataSource,
  GitHubOAuthAttemptDto,
  GitHubOAuthDataSource,
  GitHubOAuthStartDto,
} from "@harness-docs/contracts";

interface GitHubAccessTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUserResponse {
  login?: string;
  name?: string | null;
}

interface GitHubEmailResponse {
  email?: string | null;
  primary?: boolean;
  verified?: boolean;
}

interface PendingAttemptState {
  attemptId: string;
  state: string;
  expiresAt: string;
  status: GitHubOAuthAttemptDto["status"];
  completedAt: string | null;
  error: string | null;
  session: GitHubOAuthAttemptDto["session"];
}

function buildId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function now() {
  return new Date();
}

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildCallbackHtml(title: string, description: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${htmlEscape(title)}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f7f4ee; color: #1f2937; }
      main { max-width: 36rem; margin: 10vh auto; padding: 2rem; background: white; border: 1px solid #d6d3d1; border-radius: 1rem; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }
      h1 { margin-top: 0; font-size: 1.8rem; }
      p { line-height: 1.6; color: #4b5563; }
    </style>
  </head>
  <body>
    <main>
      <h1>${htmlEscape(title)}</h1>
      <p>${htmlEscape(description)}</p>
    </main>
  </body>
</html>`;
}

export function createGitHubOAuthDataSource(
  authDataSource: ApiAuthDataSource,
  options?: {
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    authorizationBaseUrl?: string;
    tokenUrl?: string;
    apiBaseUrl?: string;
    pollIntervalMs?: number;
    attemptLifetimeMs?: number;
  },
): GitHubOAuthDataSource {
  const attempts = new Map<string, PendingAttemptState>();
  const stateToAttemptId = new Map<string, string>();
  const clientId = options?.clientId ?? process.env.GITHUB_CLIENT_ID ?? "";
  const clientSecret = options?.clientSecret ?? process.env.GITHUB_CLIENT_SECRET ?? "";
  const scope = options?.scope ?? process.env.GITHUB_OAUTH_SCOPE ?? "read:user user:email";
  const authorizationBaseUrl =
    options?.authorizationBaseUrl ?? "https://github.com/login/oauth/authorize";
  const tokenUrl = options?.tokenUrl ?? "https://github.com/login/oauth/access_token";
  const apiBaseUrl = options?.apiBaseUrl ?? "https://api.github.com";
  const pollIntervalMs = options?.pollIntervalMs ?? 1500;
  const attemptLifetimeMs = options?.attemptLifetimeMs ?? 1000 * 60 * 10;

  function assertConfigured() {
    if (!clientId || !clientSecret) {
      throw new Error("GitHub OAuth requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.");
    }
  }

  function cleanupExpiredAttempts(referenceTime = now()) {
    for (const [attemptId, attempt] of attempts.entries()) {
      if (new Date(attempt.expiresAt) <= referenceTime) {
        attempts.set(attemptId, {
          ...attempt,
          status: attempt.status === "authenticated" ? attempt.status : "expired",
          completedAt: attempt.completedAt ?? referenceTime.toISOString(),
          error: attempt.error ?? "GitHub OAuth attempt expired before completion.",
        });
        stateToAttemptId.delete(attempt.state);
      }
    }
  }

  function mapAttempt(attempt: PendingAttemptState): GitHubOAuthAttemptDto {
    if (attempt.status === "pending") {
      return {
        status: "pending",
        expiresAt: attempt.expiresAt,
        completedAt: null,
        error: null,
        session: null,
      };
    }

    if (attempt.status === "authenticated" && attempt.session) {
      return {
        status: "authenticated",
        expiresAt: attempt.expiresAt,
        completedAt: attempt.completedAt ?? attempt.expiresAt,
        error: null,
        session: attempt.session,
      };
    }

    return {
      status: attempt.status === "expired" ? "expired" : "failed",
      expiresAt: attempt.expiresAt,
      completedAt: attempt.completedAt,
      error: attempt.error ?? "GitHub OAuth attempt failed.",
      session: null,
    };
  }

  function buildRedirectUri(requestOrigin: string) {
    const configuredBaseUrl = process.env.HARNESS_DOCS_API_BASE_URL?.trim();
    const origin = configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : requestOrigin;

    return new URL("/api/auth/github/callback", origin).toString();
  }

  async function fetchGitHubAccessToken(code: string, redirectUri: string) {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed with ${response.status}.`);
    }

    const payload = (await response.json()) as GitHubAccessTokenResponse;

    if (!payload.access_token) {
      throw new Error(payload.error_description ?? payload.error ?? "GitHub access token is missing.");
    }

    return payload.access_token;
  }

  async function fetchGitHubIdentity(accessToken: string) {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const [userResponse, emailsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/user`, { headers }),
      fetch(`${apiBaseUrl}/user/emails`, { headers }),
    ]);

    if (!userResponse.ok) {
      throw new Error(`GitHub user lookup failed with ${userResponse.status}.`);
    }

    const user = (await userResponse.json()) as GitHubUserResponse;
    const emails = emailsResponse.ok ? ((await emailsResponse.json()) as GitHubEmailResponse[]) : [];
    const primaryEmail =
      emails.find((entry) => entry.primary && entry.verified)?.email ??
      emails.find((entry) => entry.verified)?.email ??
      null;

    if (!user.login) {
      throw new Error("GitHub user lookup did not return a login.");
    }

    return {
      login: user.login,
      name: user.name?.trim() || user.login,
      email: primaryEmail,
    };
  }

  return {
    async startAuthorization({ requestOrigin }) {
      assertConfigured();
      cleanupExpiredAttempts();

      const attemptId = buildId("gha");
      const state = crypto.randomUUID();
      const expiresAt = new Date(now().getTime() + attemptLifetimeMs).toISOString();
      const redirectUri = buildRedirectUri(requestOrigin);
      const authorizationUrl = new URL(authorizationBaseUrl);
      authorizationUrl.searchParams.set("client_id", clientId);
      authorizationUrl.searchParams.set("redirect_uri", redirectUri);
      authorizationUrl.searchParams.set("scope", scope);
      authorizationUrl.searchParams.set("state", state);

      const attempt: PendingAttemptState = {
        attemptId,
        state,
        expiresAt,
        status: "pending",
        completedAt: null,
        error: null,
        session: null,
      };

      attempts.set(attemptId, attempt);
      stateToAttemptId.set(state, attemptId);

      return {
        attemptId,
        authorizationUrl: authorizationUrl.toString(),
        expiresAt,
        pollIntervalMs,
      } satisfies GitHubOAuthStartDto;
    },
    async getAuthorizationAttempt(attemptId) {
      cleanupExpiredAttempts();

      const attempt = attempts.get(attemptId);
      return attempt ? mapAttempt(attempt) : null;
    },
    async completeAuthorization({
      requestOrigin,
      code,
      state,
      error,
      errorDescription,
    }) {
      try {
        assertConfigured();
      } catch (configError) {
        return {
          statusCode: 500 as const,
          html: buildCallbackHtml(
            "GitHub OAuth Not Configured",
            configError instanceof Error ? configError.message : "GitHub OAuth is unavailable.",
          ),
        };
      }

      cleanupExpiredAttempts();

      if (!state) {
        return {
          statusCode: 400 as const,
          html: buildCallbackHtml("GitHub OAuth Failed", "The callback is missing the OAuth state."),
        };
      }

      const attemptId = stateToAttemptId.get(state);

      if (!attemptId) {
        return {
          statusCode: 410 as const,
          html: buildCallbackHtml(
            "GitHub OAuth Expired",
            "This sign-in attempt is no longer active. Return to the app and start again.",
          ),
        };
      }

      const attempt = attempts.get(attemptId);

      if (!attempt) {
        return {
          statusCode: 410 as const,
          html: buildCallbackHtml(
            "GitHub OAuth Expired",
            "This sign-in attempt is no longer active. Return to the app and start again.",
          ),
        };
      }

      const completedAt = now().toISOString();

      if (error) {
        attempts.set(attemptId, {
          ...attempt,
          status: "failed",
          completedAt,
          error: errorDescription ?? error,
        });
        stateToAttemptId.delete(state);

        return {
          statusCode: 400 as const,
          html: buildCallbackHtml(
            "GitHub OAuth Failed",
            errorDescription ?? "GitHub denied the authorization request.",
          ),
        };
      }

      if (!code) {
        attempts.set(attemptId, {
          ...attempt,
          status: "failed",
          completedAt,
          error: "GitHub callback is missing the authorization code.",
        });
        stateToAttemptId.delete(state);

        return {
          statusCode: 400 as const,
          html: buildCallbackHtml(
            "GitHub OAuth Failed",
            "The callback did not include an authorization code.",
          ),
        };
      }

      try {
        const accessToken = await fetchGitHubAccessToken(code, buildRedirectUri(requestOrigin));
        const identity = await fetchGitHubIdentity(accessToken);
        const session = await authDataSource.exchangeSession({
          provider: "github_oauth",
          identity,
        });

        attempts.set(attemptId, {
          ...attempt,
          status: "authenticated",
          completedAt,
          error: null,
          session,
        });
        stateToAttemptId.delete(state);

        return {
          statusCode: 200 as const,
          html: buildCallbackHtml(
            "GitHub Connected",
            "Sign-in completed. Return to Harness Docs and the session will be restored automatically.",
          ),
        };
      } catch (oauthError) {
        const message =
          oauthError instanceof Error ? oauthError.message : "GitHub OAuth could not be completed.";
        attempts.set(attemptId, {
          ...attempt,
          status: "failed",
          completedAt,
          error: message,
        });
        stateToAttemptId.delete(state);

        return {
          statusCode: 500 as const,
          html: buildCallbackHtml("GitHub OAuth Failed", message),
        };
      }
    },
  };
}
