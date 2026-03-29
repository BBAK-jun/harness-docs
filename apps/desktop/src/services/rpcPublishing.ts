import {
  type PublishPreflightEnvelopeDto,
  type PublishPreflightView,
} from "@harness-docs/contracts";
import type { PublishingService } from "../domain/publishing";
import { harnessRpcClient } from "../lib/rpc/client";
import { unwrapRpcResponse } from "../lib/rpc/response";

interface CreateRpcPublishingServiceOptions {
  fallbackService: PublishingService;
  getSessionToken?: () => Promise<string | null> | string | null;
}

export function createRpcPublishingService({
  fallbackService,
  getSessionToken,
}: CreateRpcPublishingServiceOptions): PublishingService {
  return {
    ...fallbackService,
    async getDocumentPublishPreflight(
      workspaceId: string,
      documentId: string,
    ): Promise<PublishPreflightView | null> {
      try {
        const sessionToken = await getSessionToken?.();
        const response = await harnessRpcClient.api.workspaces[":workspaceId"].documents[
          ":documentId"
        ]["publish-preflight"].$get({
          param: { workspaceId, documentId },
        }, {
          headers: sessionToken ? { authorization: `Bearer ${sessionToken}` } : undefined,
        });

        const payload = await unwrapRpcResponse<PublishPreflightEnvelopeDto>(
          response,
          "Publish preflight failed",
        );
        return payload.preflight;
      } catch {
        throw new Error("Publish preflight must be loaded from the API before publish can continue.");
      }
    },
  };
}
