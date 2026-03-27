import { createRpcClient } from "@harness-docs/contracts";

export const harnessApiBaseUrl =
  import.meta.env.VITE_HARNESS_API_BASE_URL ?? "http://127.0.0.1:4020";

export const harnessRpcClient = createRpcClient(harnessApiBaseUrl);
