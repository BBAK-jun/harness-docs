import { createIntakeUseCases } from "../../../application/intake/useCases";
import type { ApiContext } from "../../../infrastructure/lib/router";
import { parseJsonBody, respondWithApplicationResult } from "../shared";
import { intakePreviewRequestSchema } from "@harness-docs/contracts";

export function createIntakeHandlers() {
  const useCases = createIntakeUseCases();

  return {
    async previewIntake(c: ApiContext) {
      const payloadResult = await parseJsonBody(c, intakePreviewRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(c, useCases.previewIntake(payloadResult.data));
    },
  };
}
