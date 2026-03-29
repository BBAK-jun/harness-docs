import type { ApiAuthDataSource } from "../ports";
import { authenticationRequiredFailure } from "./failures";
import { succeed } from "./result";

export async function resolveSession(params: {
  authDataSource?: ApiAuthDataSource;
  sessionToken: string | null;
}) {
  const { authDataSource, sessionToken } = params;

  if (!authDataSource) {
    return succeed(null);
  }

  if (!sessionToken) {
    return authenticationRequiredFailure();
  }

  const session = await authDataSource.getSession(sessionToken);

  if (!session) {
    return authenticationRequiredFailure();
  }

  return succeed(session);
}
