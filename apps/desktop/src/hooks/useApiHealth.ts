import { useQuery } from "@tanstack/react-query";
import { unwrapApiResponse } from "@harness-docs/contracts";
import { harnessApiBaseUrl, harnessRpcClient } from "../lib/rpc/client";
import { rpcQueryKeys } from "../queries/queryKeys";

type ApiHealthState =
  | { status: "idle"; message: string }
  | { status: "checking"; message: string }
  | { status: "healthy"; message: string }
  | { status: "unreachable"; message: string };

export function useApiHealth() {
  const healthQuery = useQuery({
    queryKey: rpcQueryKeys.health(harnessApiBaseUrl),
    queryFn: async () => {
      const response = await harnessRpcClient.health.$get();

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      return unwrapApiResponse<{
        service: string;
        transport: string;
      }>(await response.json());
    },
    retry: false,
    refetchInterval: 30_000,
  });

  if (healthQuery.isPending) {
    return {
      status: healthQuery.fetchStatus === "fetching" ? "checking" : "idle",
      message: `Checking ${harnessApiBaseUrl}`,
    } satisfies ApiHealthState;
  }

  if (healthQuery.isError) {
    return {
      status: "unreachable",
      message:
        healthQuery.error instanceof Error
          ? healthQuery.error.message
          : `Unable to reach ${harnessApiBaseUrl}`,
    } satisfies ApiHealthState;
  }

  return {
    status: "healthy",
    message: `${healthQuery.data.service} via ${healthQuery.data.transport}`,
  } satisfies ApiHealthState;
}
