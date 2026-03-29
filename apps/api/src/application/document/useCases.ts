import type {
  DocumentCreateRequestDto,
  DocumentMutationEnvelopeDto,
  DocumentUpdateRequestDto,
  PublishPreflightEnvelopeDto,
  WorkspaceDocumentsEnvelopeDto,
} from "@harness-docs/contracts";
import type { PublishGovernanceAdapter, WorkspaceSessionDataSource } from "../ports";
import { documentNotFoundFailure, workspaceNotFoundFailure } from "../shared/failures";
import { hasEntityWithId } from "../shared/entities";
import { fail, succeed } from "../shared/result";

type DocumentUseCaseDependencies = {
  dataSource: WorkspaceSessionDataSource;
  publishGovernanceAdapter?: PublishGovernanceAdapter;
};

export function createDocumentUseCases({
  dataSource,
  publishGovernanceAdapter,
}: DocumentUseCaseDependencies) {
  return {
    async getDocumentPublishPreflight(workspaceId: string, documentId: string) {
      const [workspaceGraph, documents] = await Promise.all([
        dataSource.getWorkspaceGraph(workspaceId),
        dataSource.getWorkspaceDocuments(workspaceId),
      ]);

      if (!workspaceGraph || !documents) {
        return workspaceNotFoundFailure(workspaceId);
      }

      if (!hasEntityWithId(documents, documentId)) {
        return documentNotFoundFailure(documentId);
      }

      if (!publishGovernanceAdapter) {
        return fail(
          500,
          "publish_governance_adapter_missing",
          "Publish governance projection is not configured for this API instance.",
        );
      }

      const preflight = publishGovernanceAdapter.projectDocumentPublishPreflight({
        workspaceId,
        documentId,
        workspaceGraph,
        documents,
      });

      if (!preflight) {
        return fail(
          404,
          "publish_preflight_not_found",
          `Publish preflight for document '${documentId}' is not available.`,
        );
      }

      return succeed<PublishPreflightEnvelopeDto>({ preflight });
    },
    async listWorkspaceDocuments(workspaceId: string) {
      const documents = await dataSource.getWorkspaceDocuments(workspaceId);

      if (!documents) {
        return workspaceNotFoundFailure(workspaceId);
      }

      return succeed<WorkspaceDocumentsEnvelopeDto>({ documents });
    },
    async createDocument(workspaceId: string, input: DocumentCreateRequestDto) {
      const workspaceGraph = await dataSource.getWorkspaceGraph(workspaceId);

      if (!workspaceGraph) {
        return workspaceNotFoundFailure(workspaceId);
      }

      const mutation = await dataSource.createDocument(workspaceId, input);

      if (!mutation) {
        return fail(
          422,
          "document_create_failed",
          `Document could not be created in workspace '${workspaceId}'.`,
        );
      }

      return succeed<DocumentMutationEnvelopeDto>(mutation);
    },
    async updateDocument(workspaceId: string, documentId: string, input: DocumentUpdateRequestDto) {
      const documents = await dataSource.getWorkspaceDocuments(workspaceId);

      if (!documents) {
        return workspaceNotFoundFailure(workspaceId);
      }

      if (!hasEntityWithId(documents, documentId)) {
        return documentNotFoundFailure(documentId);
      }

      const mutation = await dataSource.updateDocument(workspaceId, documentId, input);

      if (!mutation) {
        return fail(
          422,
          "document_update_failed",
          `Document '${documentId}' could not be updated.`,
        );
      }

      return succeed<DocumentMutationEnvelopeDto>(mutation);
    },
  };
}
