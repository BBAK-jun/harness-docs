import { createRpcClient } from "@harness-docs/api/client";
import type { RpcClient } from "@harness-docs/api";

export const harnessApiBaseUrl =
  import.meta.env.VITE_HARNESS_API_BASE_URL ?? "http://127.0.0.1:4020";

export const harnessRpcClient: RpcClient = createRpcClient(harnessApiBaseUrl);
