import { createSystemUseCases } from "../../../application/system/useCases";
import type { ApiContext } from "../../../infrastructure/lib/router";
import { respondWithApplicationResult } from "../shared";

export function createSystemHandlers() {
  const useCases = createSystemUseCases();

  return {
    getHealth(c: ApiContext) {
      return respondWithApplicationResult(c, useCases.getHealth());
    },
  };
}
