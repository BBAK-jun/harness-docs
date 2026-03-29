import {
  publishRecordCreateRequestSchema,
  publishRecordExecuteRequestSchema,
} from "@harness-docs/contracts";
import { createPublishUseCases } from "../../../application/publish/useCases";
import type { ApiRouteDependencies } from "../../../application/ports";
import type { ApiContext } from "../../../infrastructure/lib/router";
import {
  parseJsonBody,
  parseParams,
  respondWithApplicationResult,
  workspaceParamSchema,
  workspacePublishRecordParamSchema,
} from "../shared";

type PublishHandlerDependencies = Pick<ApiRouteDependencies, "dataSource">;

export function createPublishHandlers({ dataSource }: PublishHandlerDependencies) {
  const useCases = createPublishUseCases({ dataSource });

  return {
    async listWorkspacePublishRecords(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.listWorkspacePublishRecords(paramsResult.data.workspaceId),
      );
    },
    async createPublishRecord(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, publishRecordCreateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.createPublishRecord(paramsResult.data.workspaceId, payloadResult.data),
      );
    },
    async executePublishRecord(c: ApiContext) {
      const paramsResult = parseParams(c, workspacePublishRecordParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, publishRecordExecuteRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.executePublishRecord(
          paramsResult.data.workspaceId,
          paramsResult.data.publishRecordId,
          payloadResult.data,
        ),
      );
    },
  };
}
