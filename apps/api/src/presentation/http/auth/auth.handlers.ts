import { authSessionExchangeRequestSchema } from "@harness-docs/contracts";
import type { AuthSessionExchangeRequestDto } from "@harness-docs/contracts";
import { createAuthUseCases } from "../../../application/auth/useCases";
import type { ApiRouteDependencies } from "../../../application/ports";
import type { ApiContext } from "../../../infrastructure/lib/router";
import {
  parseJsonBody,
  parseParams,
  readBearerToken,
  respondWithApplicationResult,
  githubAuthorizationAttemptParamSchema,
} from "../shared";

type AuthHandlerDependencies = Pick<
  ApiRouteDependencies,
  "authDataSource" | "gitHubOAuthDataSource"
>;

export function createAuthHandlers({
  authDataSource,
  gitHubOAuthDataSource,
}: AuthHandlerDependencies) {
  const useCases = createAuthUseCases({
    authDataSource,
    gitHubOAuthDataSource,
  });

  return {
    async startGitHubAuthorization(c: ApiContext) {
      return respondWithApplicationResult(
        c,
        await useCases.startGitHubAuthorization(new URL(c.req.url).origin),
      );
    },
    async callbackGitHubAuthorization(c: ApiContext) {
      const result = await useCases.callbackGitHubAuthorization({
        requestOrigin: new URL(c.req.url).origin,
        code: c.req.query().code ?? null,
        state: c.req.query().state ?? null,
        error: c.req.query().error ?? null,
        errorDescription: c.req.query().error_description ?? null,
      });

      if (!result.ok) {
        return c.html(
          "<html><body><h1>GitHub OAuth Not Configured</h1><p>This API instance does not support GitHub OAuth.</p></body></html>",
          500,
        );
      }

      return c.html(result.data.html, result.data.statusCode);
    },
    async getGitHubAuthorizationAttempt(c: ApiContext) {
      const paramsResult = parseParams(c, githubAuthorizationAttemptParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.getGitHubAuthorizationAttempt(paramsResult.data.attemptId),
      );
    },
    async createSession(c: ApiContext) {
      const payloadResult = await parseJsonBody(c, authSessionExchangeRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      const input: AuthSessionExchangeRequestDto = {
        provider: payloadResult.data.provider,
        identity: {
          login: payloadResult.data.identity.login,
          name: payloadResult.data.identity.name,
          email: payloadResult.data.identity.email ?? null,
        },
      };

      return respondWithApplicationResult(c, await useCases.createSession(input));
    },
    async getSession(c: ApiContext) {
      return respondWithApplicationResult(c, await useCases.getSession(readBearerToken(c)));
    },
    async deleteSession(c: ApiContext) {
      return respondWithApplicationResult(c, await useCases.deleteSession(readBearerToken(c)));
    },
  };
}
