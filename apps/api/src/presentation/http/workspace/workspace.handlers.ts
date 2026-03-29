import {
  workspaceCreateRequestSchema,
  workspaceInvitationCreateRequestSchema,
  workspaceInvitationAcceptRequestSchema,
  workspaceUpdateRequestSchema,
} from "@harness-docs/contracts";
import { createWorkspaceUseCases } from "../../../application/workspace/useCases";
import type { ApiRouteDependencies } from "../../../application/ports";
import type { ApiContext } from "../../../infrastructure/lib/router";
import {
  parseJsonBody,
  parseParams,
  readBearerToken,
  respondWithApplicationResult,
  workspaceParamSchema,
} from "../shared";

type WorkspaceHandlerDependencies = Pick<
  ApiRouteDependencies,
  "dataSource" | "authDataSource" | "workspaceRepositoryValidator"
>;

export function createWorkspaceHandlers({
  dataSource,
  authDataSource,
  workspaceRepositoryValidator,
}: WorkspaceHandlerDependencies) {
  const useCases = createWorkspaceUseCases({
    dataSource,
    authDataSource,
    workspaceRepositoryValidator,
  });

  return {
    async listWorkspaces(c: ApiContext) {
      return respondWithApplicationResult(c, await useCases.listWorkspaces(readBearerToken(c)));
    },
    async createWorkspace(c: ApiContext) {
      const payloadResult = await parseJsonBody(c, workspaceCreateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.createWorkspace(payloadResult.data, readBearerToken(c)),
      );
    },
    async createWorkspaceInvitation(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, workspaceInvitationCreateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.createWorkspaceInvitation(
          paramsResult.data.workspaceId,
          payloadResult.data,
          readBearerToken(c),
        ),
      );
    },
    async acceptWorkspaceInvitation(c: ApiContext) {
      const payloadResult = await parseJsonBody(c, workspaceInvitationAcceptRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.acceptWorkspaceInvitation(payloadResult.data, readBearerToken(c)),
      );
    },
    async getWorkspaceGraph(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.getWorkspaceGraph(paramsResult.data.workspaceId),
      );
    },
    async updateWorkspace(c: ApiContext) {
      const paramsResult = parseParams(c, workspaceParamSchema);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const payloadResult = await parseJsonBody(c, workspaceUpdateRequestSchema);

      if (!payloadResult.ok) {
        return payloadResult.response;
      }

      return respondWithApplicationResult(
        c,
        await useCases.updateWorkspace(paramsResult.data.workspaceId, payloadResult.data),
      );
    },
  };
}
