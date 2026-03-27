import type { DesktopInfrastructure } from "../desktop/contracts";
import { mockSession, mockUser } from "../data/mockSession";
import type { AITaskExecutionInput, AITaskExecutionResult, AITaskService } from "../domain/aiTasks";
import type {
  PublishExecutionInput,
  PublishExecutionResult,
  PublishingService,
} from "../domain/publishing";
import type {
  AppSessionSnapshot,
  AppPreferences,
  AuthenticationProvider,
  AuthenticationProviderDescriptor,
  AuthenticationService,
  AuthenticationSessionSnapshot,
  HarnessDocsServices,
  WorkspaceSessionService,
  WorkspaceSessionSnapshot,
} from "./contracts";
import {
  createMockApprovalService,
  createMockPublishingService,
  createMockWorkspaceMembershipService,
} from "./mockDomainServices";
import { createRpcPublishingService } from "./rpcPublishing";
import { createDesktopShellService } from "./tauriDesktopShell";
import {
  defaultAppPreferences,
  readAppPreferences,
  writeAppPreferences,
} from "../lib/appPreferences";
import { createRpcWorkspaceSessionService } from "./rpcWorkspaceSession";

const githubAuthProvider: AuthenticationProviderDescriptor = {
  id: "github_oauth",
  label: "GitHub OAuth",
  kind: "oauth",
  loginCtaLabel: "Sign in with GitHub",
};

interface GitHubIdentity {
  login: string;
  name?: string | null;
  email?: string | null;
}

interface RawAuthenticationSession {
  status: AuthenticationSessionSnapshot["status"];
  user: GitHubIdentity | null;
  message?: string | null;
}

function createAvatarInitials(name: string, login: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length > 0) {
    return parts.map((part) => part.charAt(0).toUpperCase()).join("");
  }

  return login.slice(0, 2).toUpperCase();
}

function mapAuthenticationSession(
  rawSession: RawAuthenticationSession,
): AuthenticationSessionSnapshot {
  if (rawSession.status !== "authenticated" || !rawSession.user) {
    return {
      status: "signed_out",
      provider: githubAuthProvider,
      user: null,
    };
  }

  const name = rawSession.user.name?.trim() || mockUser.name;
  const githubLogin = rawSession.user.login;

  return {
    status: "authenticated",
    provider: githubAuthProvider,
    user: {
      ...mockUser,
      name,
      handle: `@${githubLogin}`,
      avatarInitials: createAvatarInitials(name, githubLogin),
      githubLogin,
      primaryEmail: rawSession.user.email?.trim() || mockUser.primaryEmail,
    },
  };
}

function createTauriAuthenticationService(
  desktopInfrastructure: DesktopInfrastructure,
): AuthenticationService {
  return {
    async getProvider() {
      return githubAuthProvider;
    },
    async restoreSession() {
      if (desktopInfrastructure.runtime !== "tauri") {
        return {
          status: "signed_out",
          provider: githubAuthProvider,
          user: null,
        };
      }

      const rawSession = await desktopInfrastructure.commands.invoke<RawAuthenticationSession>(
        "get_github_authentication_session",
      );

      return mapAuthenticationSession(rawSession);
    },
    async startSignIn(provider: AuthenticationProvider) {
      if (provider !== githubAuthProvider.id) {
        throw new Error(`Unsupported authentication provider: ${provider}`);
      }

      if (desktopInfrastructure.runtime !== "tauri") {
        throw new Error("GitHub OAuth requires the Tauri runtime.");
      }

      const rawSession =
        await desktopInfrastructure.commands.invoke<RawAuthenticationSession>(
          "start_github_sign_in",
        );

      return mapAuthenticationSession(rawSession);
    },
    async signOut() {
      if (desktopInfrastructure.runtime !== "tauri") {
        return {
          status: "signed_out",
          provider: githubAuthProvider,
          user: null,
        };
      }

      const rawSession =
        await desktopInfrastructure.commands.invoke<RawAuthenticationSession>("sign_out_github");

      return mapAuthenticationSession(rawSession);
    },
  };
}

function createTauriWorkspaceSessionService(): WorkspaceSessionService {
  return createRpcWorkspaceSessionService({
    fallbackSnapshot: () => ({
      user: mockSession.user,
      workspaces: mockSession.workspaces,
      workspaceGraphs: mockSession.workspaceGraphs,
      lastActiveWorkspaceId: mockSession.lastActiveWorkspaceId,
    }),
  });
}

function createTauriPublishingService(
  desktopInfrastructure: DesktopInfrastructure,
): PublishingService {
  const basePublishing = createRpcPublishingService({
    fallbackService: createMockPublishingService(),
  });

  return {
    ...basePublishing,
    async executePublish(input: PublishExecutionInput): Promise<PublishExecutionResult> {
      if (desktopInfrastructure.runtime !== "tauri") {
        return basePublishing.executePublish(input);
      }

      return desktopInfrastructure.commands.invoke<PublishExecutionResult>(
        "execute_github_publish",
        { input },
      );
    },
  };
}

function createTauriAITaskService(desktopInfrastructure: DesktopInfrastructure): AITaskService {
  return {
    async runEntryPoint(input: AITaskExecutionInput): Promise<AITaskExecutionResult> {
      if (desktopInfrastructure.runtime !== "tauri") {
        return {
          provider: input.entry.provider,
          command: "browser-preview",
          promptLabel: input.entry.title,
          output: "AI task execution requires the Tauri runtime.",
          workingDirectory: "/browser-preview",
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          suggestion: null,
        };
      }

      return desktopInfrastructure.commands.invoke<AITaskExecutionResult>("run_ai_task", {
        input: {
          provider: input.entry.provider,
          promptLabel: input.entry.title,
          prompt: input.prompt,
        },
      });
    },
  };
}

export function createTauriHarnessDocsServices(
  desktopInfrastructure: DesktopInfrastructure,
): HarnessDocsServices {
  const authentication = createTauriAuthenticationService(desktopInfrastructure);
  const workspaceSession = createTauriWorkspaceSessionService();
  const workspaceMemberships = createMockWorkspaceMembershipService();
  const approvals = createMockApprovalService();
  const publishing = createTauriPublishingService(desktopInfrastructure);
  const aiTasks = createTauriAITaskService(desktopInfrastructure);

  return {
    desktopShell: createDesktopShellService(desktopInfrastructure),
    desktopWindow: desktopInfrastructure.windowing,
    preferences: {
      read: () => readAppPreferences(desktopInfrastructure.storage),
      write: (preferences: AppPreferences) =>
        writeAppPreferences(desktopInfrastructure.storage, preferences),
    },
    authentication,
    workspaceSession,
    workspaceMemberships,
    approvals,
    publishing,
    aiTasks,
    appSession: {
      async getSnapshot(): Promise<AppSessionSnapshot> {
        const session = await authentication.restoreSession();

        if (session.status !== "authenticated") {
          return {
            authentication: session,
            workspace: null,
          };
        }

        return {
          authentication: session,
          workspace: await workspaceSession.getSnapshot(session),
        };
      },
    },
  };
}

export const fallbackAppPreferences = defaultAppPreferences;
