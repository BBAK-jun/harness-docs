import { useEffect, useState } from "react";
import { unwrapApiResponse } from "@harness-docs/contracts";
import { harnessApiBaseUrl, harnessRpcClient } from "../lib/rpc/client";

type ApiHealthState =
  | { status: "idle"; message: string }
  | { status: "checking"; message: string }
  | { status: "healthy"; message: string }
  | { status: "unreachable"; message: string };

export function useApiHealth() {
  const [state, setState] = useState<ApiHealthState>({
    status: "idle",
    message: `RPC target ${harnessApiBaseUrl}`
  });

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      setState({
        status: "checking",
        message: `Checking ${harnessApiBaseUrl}`
      });

      try {
        const response = await harnessRpcClient.health.$get();

        if (!response.ok) {
          if (!cancelled) {
            setState({
              status: "unreachable",
              message: `API responded with ${response.status}`
            });
          }
          return;
        }

        const data = unwrapApiResponse<{
          service: string;
          transport: string;
        }>(await response.json());

        if (!cancelled) {
          setState({
            status: "healthy",
            message: `${data.service} via ${data.transport}`
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "unreachable",
            message:
              error instanceof Error ? error.message : `Unable to reach ${harnessApiBaseUrl}`
          });
        }
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
