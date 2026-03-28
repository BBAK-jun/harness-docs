import type { DesktopInfrastructure } from "../desktop/contracts";
import { mockSession } from "../data/mockSession";
import {
  defaultAppPreferences,
  readAppPreferences,
  writeAppPreferences,
} from "../lib/appPreferences";
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
  createMockAITaskService,
} from "./mockDomainServices";
import { clearAppSessionToken } from "./appSessionToken";
import { createSessionBackedApprovalService } from "./sessionBackedApprovalService";
import { createSessionBackedPublishingService } from "./sessionBackedPublishingService";
import { createSessionBackedWorkspaceMembershipService } from "./sessionBackedWorkspaceMembershipService";
import { createDesktopShellService } from "./tauriDesktopShell";

const mockAuthenticationProvider: AuthenticationProviderDescriptor = {
  id: "github_oauth",
  label: "GitHub OAuth",
  kind: "oauth",
  loginCtaLabel: "Sign in with GitHub",
};

const mockSessionStorageKey = "harness-docs/mock-auth-session";

async function readStoredAuthenticationStatus(
  desktopInfrastructure: DesktopInfrastructure,
): Promise<AuthenticationSessionSnapshot["status"]> {
  const storedStatus = await desktopInfrastructure.storage.getItem(mockSessionStorageKey);

  return storedStatus === "signed_out" ? "signed_out" : "authenticated";
}

async function writeStoredAuthenticationStatus(
  desktopInfrastructure: DesktopInfrastructure,
  status: AuthenticationSessionSnapshot["status"],
) {
  await desktopInfrastructure.storage.setItem(mockSessionStorageKey, status);
}

function buildAuthenticationSession(
  status: AuthenticationSessionSnapshot["status"],
): AuthenticationSessionSnapshot {
  if (status === "authenticated") {
    return {
      status,
      provider: mockAuthenticationProvider,
      user: mockSession.user,
    };
  }

  return {
    status,
    provider: mockAuthenticationProvider,
    user: null,
  };
}

function createMockAuthenticationService(
  desktopInfrastructure: DesktopInfrastructure,
): AuthenticationService {
  return {
    async getProvider() {
      return mockAuthenticationProvider;
    },
    async restoreSession() {
      return buildAuthenticationSession(
        await readStoredAuthenticationStatus(desktopInfrastructure),
      );
    },
    async startSignIn(provider: AuthenticationProvider) {
      if (provider !== mockAuthenticationProvider.id) {
        throw new Error(`Unsupported authentication provider: ${provider}`);
      }

      await writeStoredAuthenticationStatus(desktopInfrastructure, "authenticated");
      await clearAppSessionToken(desktopInfrastructure.storage);

      return buildAuthenticationSession("authenticated");
    },
    async signOut() {
      await writeStoredAuthenticationStatus(desktopInfrastructure, "signed_out");
      await clearAppSessionToken(desktopInfrastructure.storage);

      return buildAuthenticationSession("signed_out");
    },
  };
}

async function getWorkspaceSnapshot(): Promise<WorkspaceSessionSnapshot> {
  return {
    user: mockSession.user,
    workspaces: mockSession.workspaces,
    workspaceGraphs: mockSession.workspaceGraphs,
    lastActiveWorkspaceId: mockSession.lastActiveWorkspaceId,
  };
}

function createMockWorkspaceSessionService(
  _desktopInfrastructure: DesktopInfrastructure,
): WorkspaceSessionService {
  return {
    async getSnapshot(session) {
      if (session.status !== "authenticated") {
        throw new Error("Workspace session requires an authenticated user session.");
      }

      return getWorkspaceSnapshot();
    },
  };
}

function getMockWorkspaceGraph(workspaceId: string) {
  return mockSession.workspaceGraphs.find((entry) => entry.workspace.id === workspaceId) ?? null;
}

function listMockWorkspaceGraphsForUser(userId: string) {
  return mockSession.workspaceGraphs.filter((entry) =>
    entry.memberships.some(
      (membership) => membership.userId === userId && membership.lifecycle.status === "active",
    ),
  );
}

export function createMockHarnessDocsServices(
  desktopInfrastructure: DesktopInfrastructure,
): HarnessDocsServices {
  const authentication = createMockAuthenticationService(desktopInfrastructure);
  const workspaceSession = createMockWorkspaceSessionService(desktopInfrastructure);
  const workspaceMemberships = createSessionBackedWorkspaceMembershipService({
    getWorkspaceGraph: getMockWorkspaceGraph,
    listWorkspaceGraphsForUser: listMockWorkspaceGraphsForUser,
    getCurrentSessionUser: () => mockSession.user,
  });
  const approvals = createSessionBackedApprovalService({
    getWorkspaceGraph: getMockWorkspaceGraph,
  });
  const sessionBackedPublishing = createSessionBackedPublishingService({
    getWorkspaceGraph: getMockWorkspaceGraph,
  });
  const aiTasks = createMockAITaskService();

  return {
    desktopShell: createDesktopShellService(desktopInfrastructure),
    desktopWindow: desktopInfrastructure.windowing,
    preferences: {
      read: () => readAppPreferences(desktopInfrastructure.storage),
      write: (preferences) => writeAppPreferences(desktopInfrastructure.storage, preferences),
    },
    authentication,
    workspaceSession,
    workspaceMemberships,
    approvals,
    publishing: sessionBackedPublishing,
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
