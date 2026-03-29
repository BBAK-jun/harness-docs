import type {
  PublishExecutionEnvelopeDto,
  PublishRecordCreateRequestDto,
  PublishRecordExecuteRequestDto,
  PublishRecordMutationEnvelopeDto,
  WorkspacePublishRecordsEnvelopeDto,
} from "@harness-docs/contracts";
import type { WorkspaceSessionDataSource } from "../ports";
import {
  publishRecordNotFoundFailure,
  workspaceNotFoundFailure,
} from "../shared/failures";
import { hasEntityWithId } from "../shared/entities";
import { fail, succeed } from "../shared/result";

type PublishUseCaseDependencies = {
  dataSource: WorkspaceSessionDataSource;
};

export function createPublishUseCases({ dataSource }: PublishUseCaseDependencies) {
  return {
    async listWorkspacePublishRecords(workspaceId: string) {
      const publishRecords = await dataSource.getWorkspacePublishRecords(workspaceId);

      if (!publishRecords) {
        return workspaceNotFoundFailure(workspaceId);
      }

      return succeed<WorkspacePublishRecordsEnvelopeDto>({ publishRecords });
    },
    async createPublishRecord(workspaceId: string, input: PublishRecordCreateRequestDto) {
      const publishRecords = await dataSource.getWorkspacePublishRecords(workspaceId);

      if (!publishRecords) {
        return workspaceNotFoundFailure(workspaceId);
      }

      const mutation = await dataSource.createPublishRecord(workspaceId, input);

      if (!mutation) {
        return fail(
          422,
          "publish_record_create_failed",
          `Publish preparation could not be created for workspace '${workspaceId}'.`,
        );
      }

      return succeed<PublishRecordMutationEnvelopeDto>(mutation);
    },
    async executePublishRecord(
      workspaceId: string,
      publishRecordId: string,
      input: PublishRecordExecuteRequestDto,
    ) {
      const publishRecords = await dataSource.getWorkspacePublishRecords(workspaceId);

      if (!publishRecords) {
        return workspaceNotFoundFailure(workspaceId);
      }

      if (!hasEntityWithId(publishRecords, publishRecordId)) {
        return publishRecordNotFoundFailure(publishRecordId);
      }

      const mutation = await dataSource.executePublishRecord(
        workspaceId,
        publishRecordId,
        input,
      );

      if (!mutation) {
        return fail(
          422,
          "publish_execute_failed",
          `Publish record '${publishRecordId}' could not be executed.`,
        );
      }

      return succeed<PublishExecutionEnvelopeDto>(mutation);
    },
  };
}
