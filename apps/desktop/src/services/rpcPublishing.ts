import {
  unwrapApiResponse,
  type PublishPreflightEnvelopeDto,
  type PublishPreflightView,
} from "@harness-docs/contracts";
import type { PublishingService } from "../domain/publishing";
import { harnessApiBaseUrl } from "../lib/rpc/client";

interface CreateRpcPublishingServiceOptions {
  fallbackService: PublishingService;
  allowPreflightFallback?: boolean;
}

export function createRpcPublishingService({
  fallbackService,
  allowPreflightFallback = false,
}: CreateRpcPublishingServiceOptions): PublishingService {
  return {
    ...fallbackService,
    async getDocumentPublishPreflight(
      workspaceId: string,
      documentId: string,
    ): Promise<PublishPreflightView | null> {
      try {
        const response = await fetch(
          `${harnessApiBaseUrl}/api/workspaces/${workspaceId}/documents/${documentId}/publish-preflight`,
        );

        if (!response.ok) {
          throw new Error(`Publish preflight failed with ${response.status}`);
        }

        const payload = unwrapApiResponse<PublishPreflightEnvelopeDto>(await response.json());
        return payload.preflight;
      } catch {
        if (!allowPreflightFallback) {
          throw new Error("Publish preflight must be loaded from the API before publish can continue.");
        }

        return fallbackService.getDocumentPublishPreflight(workspaceId, documentId);
      }
    },
  };
}
