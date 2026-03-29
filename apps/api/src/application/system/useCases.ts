import type { HealthCheckDto } from "@harness-docs/contracts";
import { succeed } from "../shared/result";

export function createSystemUseCases() {
  return {
    getHealth() {
      return succeed<HealthCheckDto>({
        service: "harness-docs-api",
        status: "ok",
        transport: "hono-rpc",
      });
    },
  };
}
