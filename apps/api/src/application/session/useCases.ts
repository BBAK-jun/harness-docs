import type { BootstrapSessionDto } from "@harness-docs/contracts";
import type { ApiAuthDataSource, WorkspaceSessionDataSource } from "../ports";
import { authenticationRequiredFailure } from "../shared/failures";
import { resolveSession } from "../shared/session";
import { succeed } from "../shared/result";

type SessionUseCaseDependencies = {
  dataSource: WorkspaceSessionDataSource;
  authDataSource?: ApiAuthDataSource;
};

export function createSessionUseCases({
  dataSource,
  authDataSource,
}: SessionUseCaseDependencies) {
  return {
    async getBootstrapSession(sessionToken: string | null) {
      const sessionResult = await resolveSession({
        authDataSource,
        sessionToken,
      });

      if (!sessionResult.ok) {
        return sessionResult;
      }

      const bootstrap = await dataSource.getBootstrapSession(sessionResult.data?.user.id);

      if (!bootstrap) {
        return authenticationRequiredFailure();
      }

      return succeed<BootstrapSessionDto>(bootstrap);
    },
  };
}
