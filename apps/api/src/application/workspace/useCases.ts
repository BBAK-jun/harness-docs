import type {
  WorkspaceCatalogEnvelopeDto,
  WorkspaceCreateRequestDto,
  WorkspaceGraphEnvelopeDto,
  WorkspaceInvitationCreateRequestDto,
  WorkspaceInvitationAcceptRequestDto,
  WorkspaceInvitationEnvelopeDto,
  WorkspaceMutationEnvelopeDto,
  WorkspaceOnboardingEnvelopeDto,
  WorkspaceUpdateRequestDto,
} from "@harness-docs/contracts";
import type {
  ApiAuthDataSource,
  WorkspaceRepositoryValidator,
  WorkspaceSessionDataSource,
} from "../ports";
import { authenticationRequiredFailure, workspaceNotFoundFailure } from "../shared/failures";
import { resolveSession } from "../shared/session";
import { succeed } from "../shared/result";

type WorkspaceUseCaseDependencies = {
  dataSource: WorkspaceSessionDataSource;
  authDataSource?: ApiAuthDataSource;
  workspaceRepositoryValidator?: WorkspaceRepositoryValidator;
};

export function createWorkspaceUseCases({
  dataSource,
  authDataSource,
  workspaceRepositoryValidator,
}: WorkspaceUseCaseDependencies) {
  return {
    async listWorkspaces(sessionToken: string | null) {
      const sessionResult = await resolveSession({
        authDataSource,
        sessionToken,
      });

      if (!sessionResult.ok) {
        return sessionResult;
      }

      const bootstrap = await dataSource.getBootstrapSession(sessionResult.data?.user.id);

      if (!bootstrap) {
        return authenticationRequiredFailure();
      }

      return succeed<WorkspaceCatalogEnvelopeDto>({
        workspaces: bootstrap.workspaces,
      });
    },
    async createWorkspace(input: WorkspaceCreateRequestDto, sessionToken: string | null) {
      const sessionResult = await resolveSession({
        authDataSource,
        sessionToken,
      });

      if (!sessionResult.ok) {
        return sessionResult;
      }

      const viewer = sessionResult.data?.user;

      if (!viewer) {
        return authenticationRequiredFailure();
      }

      if (workspaceRepositoryValidator && input.docsRepoOwner && input.docsRepoName) {
        const validation = await workspaceRepositoryValidator.validateWorkspaceRepository({
          repositoryOwner: input.docsRepoOwner,
          repositoryName: input.docsRepoName,
          defaultBranch: input.docsRepoDefaultBranch,
          viewer,
        });

        if (!validation.ok) {
          return {
            ok: false as const,
            error: {
              status: 422 as const,
              code: validation.code,
              message: validation.message,
              details: validation.details,
            },
          };
        }
      }

      const mutation = await dataSource.createWorkspace(input, viewer.id);

      if (!mutation) {
        return {
          ok: false as const,
          error: {
            status: 422 as const,
            code: "workspace_create_failed",
            message: "Workspace could not be created.",
          },
        };
      }

      return succeed<WorkspaceOnboardingEnvelopeDto>(mutation);
    },
    async createWorkspaceInvitation(
      workspaceId: string,
      input: WorkspaceInvitationCreateRequestDto,
      sessionToken: string | null,
    ) {
      const sessionResult = await resolveSession({
        authDataSource,
        sessionToken,
      });

      if (!sessionResult.ok) {
        return sessionResult;
      }

      const viewer = sessionResult.data?.user;

      if (!viewer) {
        return authenticationRequiredFailure();
      }

      const invitation = await dataSource.createWorkspaceInvitation(workspaceId, input, viewer.id);

      if (!invitation) {
        return {
          ok: false as const,
          error: {
            status: 422 as const,
            code: "workspace_invitation_create_failed",
            message: "Workspace invitation could not be created.",
          },
        };
      }

      return succeed<WorkspaceInvitationEnvelopeDto>(invitation);
    },
    async acceptWorkspaceInvitation(
      input: WorkspaceInvitationAcceptRequestDto,
      sessionToken: string | null,
    ) {
      const sessionResult = await resolveSession({
        authDataSource,
        sessionToken,
      });

      if (!sessionResult.ok) {
        return sessionResult;
      }

      const viewer = sessionResult.data?.user;

      if (!viewer) {
        return authenticationRequiredFailure();
      }

      const mutation = await dataSource.acceptWorkspaceInvitation(input, viewer.id);

      if (!mutation) {
        return {
          ok: false as const,
          error: {
            status: 422 as const,
            code: "workspace_invitation_accept_failed",
            message: "Workspace invitation could not be accepted.",
          },
        };
      }

      return succeed<WorkspaceOnboardingEnvelopeDto>(mutation);
    },
    async getWorkspaceGraph(workspaceId: string) {
      const workspaceGraph = await dataSource.getWorkspaceGraph(workspaceId);

      if (!workspaceGraph) {
        return workspaceNotFoundFailure(workspaceId);
      }

      return succeed<WorkspaceGraphEnvelopeDto>({ workspaceGraph });
    },
    async updateWorkspace(workspaceId: string, input: WorkspaceUpdateRequestDto) {
      const workspaceGraph = await dataSource.getWorkspaceGraph(workspaceId);

      if (!workspaceGraph) {
        return workspaceNotFoundFailure(workspaceId);
      }

      const mutation = await dataSource.updateWorkspace(workspaceId, input);

      if (!mutation) {
        return {
          ok: false as const,
          error: {
            status: 422 as const,
            code: "workspace_update_failed",
            message: `Workspace '${workspaceId}' could not be updated.`,
          },
        };
      }

      return succeed<WorkspaceMutationEnvelopeDto>(mutation);
    },
  };
}
