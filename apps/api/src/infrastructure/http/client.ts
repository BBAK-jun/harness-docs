import { hc } from "hono/client";
import type { AppType } from "../../presentation/http/app";

export function createRpcClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}

export type RpcClient = ReturnType<typeof createRpcClient>;
