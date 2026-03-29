import { createSessionUseCases } from "../../../application/session/useCases";
import type { ApiRouteDependencies } from "../../../application/ports";
import type { ApiContext } from "../../../infrastructure/lib/router";
import { readBearerToken, respondWithApplicationResult } from "../shared";

type SessionHandlerDependencies = Pick<ApiRouteDependencies, "dataSource" | "authDataSource">;

export function createSessionHandlers({
  dataSource,
  authDataSource,
}: SessionHandlerDependencies) {
  const useCases = createSessionUseCases({
    dataSource,
    authDataSource,
  });

  return {
    async getBootstrapSession(c: ApiContext) {
      return respondWithApplicationResult(
        c,
        await useCases.getBootstrapSession(readBearerToken(c)),
      );
    },
  };
}
