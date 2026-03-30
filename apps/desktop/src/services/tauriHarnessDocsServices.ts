import type { DesktopInfrastructure } from "../desktop/contracts";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import type {
  AITaskExecutionEvent,
  AITaskExecutionHandle,
  AITaskExecutionInput,
  AITaskExecutionObserver,
  AITaskExecutionResult,
  AITaskRunningExecution,
  AITaskService,
} from "../domain/aiTasks";
import type {
  PublishExecutionInput,
  PublishExecutionResult,
  PublishingService,
} from "../domain/publishing";
import type { WorkspaceGraph } from "../types/contracts";
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
import { createRpcApprovalService } from "./rpcApprovalService";
import { createRpcPublishingService } from "./rpcPublishing";
import { createSessionBackedApprovalService } from "./sessionBackedApprovalService";
import { createSessionBackedPublishingService } from "./sessionBackedPublishingService";
import { createSessionBackedWorkspaceMembershipService } from "./sessionBackedWorkspaceMembershipService";
import { createDesktopShellService } from "./tauriDesktopShell";
import {
  defaultAppPreferences,
  readAppPreferences,
  writeAppPreferences,
} from "../lib/appPreferences";
import { clearAppSessionToken, readAppSessionToken, writeAppSessionToken } from "./appSessionToken";
import {
  getApiSession,
  getGitHubOAuthAttempt,
  revokeApiSession,
  startGitHubOAuth,
} from "./rpcAuthentication";
import {
  acceptWorkspaceInvitation as acceptRpcWorkspaceInvitationOnboarding,
  createWorkspace as createRpcWorkspace,
} from "./rpcWorkspaceOnboarding";
import { createRpcWorkspaceSessionService } from "./rpcWorkspaceSession";

const githubAuthProvider: AuthenticationProviderDescriptor = {
  id: "github_oauth",
  label: "GitHub OAuth",
  kind: "oauth",
  loginCtaLabel: "Sign in with GitHub",
};
const aiTaskEventName = "ai-task-event";

function mapApiAuthenticationSession(
  session: Awaited<ReturnType<typeof getApiSession>>,
): AuthenticationSessionSnapshot {
  if (session.status !== "authenticated") {
    return {
      status: "signed_out",
      provider: githubAuthProvider,
      user: null,
    };
  }

  return {
    status: "authenticated",
    provider: githubAuthProvider,
    user: {
      id: session.user.id,
      name: session.user.name,
      handle: session.user.handle,
      avatarInitials: session.user.avatarInitials,
      githubLogin: session.user.githubLogin,
      primaryEmail: session.user.primaryEmail,
    },
  };
}

async function openOAuthUrl(url: string, runtime: DesktopInfrastructure["runtime"]) {
  if (runtime === "tauri") {
    await openUrl(url);
    return;
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function signedOutAuthenticationSession(): AuthenticationSessionSnapshot {
  return {
    status: "signed_out",
    provider: githubAuthProvider,
    user: null,
  };
}

async function runGitHubOAuthSignIn(
  desktopInfrastructure: DesktopInfrastructure,
): Promise<AuthenticationSessionSnapshot> {
  const start = await startGitHubOAuth();

  await openOAuthUrl(start.authorizationUrl, desktopInfrastructure.runtime);

  const deadline = Date.parse(start.expiresAt);

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, start.pollIntervalMs));

    const attempt = await getGitHubOAuthAttempt(start.attemptId);

    if (attempt.status === "pending") {
      continue;
    }

    if (attempt.status === "authenticated") {
      await writeAppSessionToken(desktopInfrastructure.storage, attempt.session.sessionToken);

      return mapApiAuthenticationSession(attempt.session);
    }

    await clearAppSessionToken(desktopInfrastructure.storage);
    throw new Error(attempt.error);
  }

  await clearAppSessionToken(desktopInfrastructure.storage);
  throw new Error("GitHub OAuth did not complete before the sign-in attempt expired.");
}

function createTauriAuthenticationService(
  desktopInfrastructure: DesktopInfrastructure,
): AuthenticationService {
  return {
    async getProvider() {
      return githubAuthProvider;
    },
    async restoreSession() {
      const storedToken = await readAppSessionToken(desktopInfrastructure.storage);

      if (storedToken) {
        try {
          const session = await getApiSession(storedToken);

          if (session.status === "authenticated") {
            return mapApiAuthenticationSession(session);
          }

          await clearAppSessionToken(desktopInfrastructure.storage);
        } catch {
          await clearAppSessionToken(desktopInfrastructure.storage);
        }
      }

      return signedOutAuthenticationSession();
    },
    async startSignIn(provider: AuthenticationProvider) {
      if (provider !== githubAuthProvider.id) {
        throw new Error(`Unsupported authentication provider: ${provider}`);
      }

      return runGitHubOAuthSignIn(desktopInfrastructure);
    },
    async signOut() {
      const storedToken = await readAppSessionToken(desktopInfrastructure.storage);

      if (storedToken) {
        try {
          await revokeApiSession(storedToken);
        } finally {
          await clearAppSessionToken(desktopInfrastructure.storage);
        }
      }

      await clearAppSessionToken(desktopInfrastructure.storage);

      return signedOutAuthenticationSession();
    },
  };
}

function createTauriWorkspaceSessionService(
  desktopInfrastructure: DesktopInfrastructure,
): WorkspaceSessionService {
  return createRpcWorkspaceSessionService({
    getSessionToken: () => readAppSessionToken(desktopInfrastructure.storage),
  });
}

function createCurrentSessionReaders(
  authentication: AuthenticationService,
  workspaceSession: WorkspaceSessionService,
) {
  async function getCurrentSessionSnapshot() {
    const session = await authentication.restoreSession();

    if (session.status !== "authenticated") {
      return null;
    }

    return workspaceSession.getSnapshot(session);
  }

  return {
    async getWorkspaceGraph(workspaceId: string) {
      const snapshot = await getCurrentSessionSnapshot();

      return snapshot?.workspaceGraphs.find((entry) => entry.workspace.id === workspaceId) ?? null;
    },
    async listWorkspaceGraphsForUser(userId: string) {
      const snapshot = await getCurrentSessionSnapshot();

      return (snapshot?.workspaceGraphs ?? []).filter((entry) =>
        entry.memberships.some(
          (membership) => membership.userId === userId && membership.lifecycle.status === "active",
        ),
      );
    },
    async getCurrentSessionUser() {
      const session = await authentication.restoreSession();

      return session.status === "authenticated" ? session.user : null;
    },
  };
}

function createTauriPublishingService(
  desktopInfrastructure: DesktopInfrastructure,
  options: {
    getWorkspaceGraph: (workspaceId: string) => Promise<WorkspaceGraph | null>;
  },
): PublishingService {
  const sessionBackedPublishing = createSessionBackedPublishingService({
    getWorkspaceGraph: options.getWorkspaceGraph,
  });
  const basePublishing = createRpcPublishingService({
    getSessionToken: () => readAppSessionToken(desktopInfrastructure.storage),
    fallbackService: sessionBackedPublishing,
  });

  return {
    ...sessionBackedPublishing,
    ...basePublishing,
    async executePublish(input: PublishExecutionInput): Promise<PublishExecutionResult> {
      if (desktopInfrastructure.runtime !== "tauri") {
        return sessionBackedPublishing.executePublish(input);
      }

      return desktopInfrastructure.commands.invoke<PublishExecutionResult>(
        "execute_github_publish",
        { input },
      );
    },
  };
}

function createTauriAITaskService(desktopInfrastructure: DesktopInfrastructure): AITaskService {
  const createBrowserPreviewResult = (input: AITaskExecutionInput): AITaskExecutionResult => ({
    provider: input.entry.provider,
    command: "browser-preview",
    promptLabel: input.entry.title,
    output: "AI task execution requires the Tauri runtime.",
    workingDirectory: "/browser-preview",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    suggestion: null,
  });

  const createTaskId = () => `ai-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  let probeIntervalPromise: Promise<number> | null = null;
  const getProbeIntervalMs = () => {
    if (probeIntervalPromise) {
      return probeIntervalPromise;
    }

    probeIntervalPromise = (async () => {
      if (desktopInfrastructure.runtime !== "tauri") {
        return 750;
      }

      try {
        const metadata = await desktopInfrastructure.commands.invoke<{
          aiTaskProbeIntervalMs?: number;
        }>("get_desktop_shell_metadata");
        const interval = metadata.aiTaskProbeIntervalMs;

        if (typeof interval === "number" && interval >= 100) {
          return interval;
        }
      } catch {
        // Fall through to the default interval.
      }

      return 750;
    })();

    return probeIntervalPromise;
  };

  const startEntryPoint = async (
    input: AITaskExecutionInput,
    observer?: AITaskExecutionObserver,
  ): Promise<AITaskRunningExecution> => {
    if (desktopInfrastructure.runtime !== "tauri") {
      const taskId = createTaskId();
      const result = createBrowserPreviewResult(input);

      observer?.onEvent?.({
        type: "completed",
        taskId,
        result,
      });

      return {
        taskId,
        provider: result.provider,
        command: result.command,
        promptLabel: result.promptLabel,
        workingDirectory: result.workingDirectory,
        startedAt: result.startedAt,
        result: Promise.resolve(result),
        cancel: async () => {},
      };
    }

    const taskId = createTaskId();
    let resolveResult: ((result: AITaskExecutionResult) => void) | null = null;
    let rejectResult: ((error: Error) => void) | null = null;
    const result = new Promise<AITaskExecutionResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    const unlisten = await listen<AITaskExecutionEvent>(aiTaskEventName, (event) => {
      const payload = event.payload;

      if (payload.taskId !== taskId) {
        return;
      }

      observer?.onEvent?.(payload);

      if (payload.type === "completed") {
        resolveResult?.(payload.result);
        return;
      }

      if (payload.type === "failed") {
        rejectResult?.(new Error(payload.error));
        return;
      }

      if (payload.type === "cancelled") {
        rejectResult?.(new Error("AI 요청이 취소되었습니다."));
      }
    });

    let didCleanup = false;
    const cleanup = () => {
      if (didCleanup) {
        return;
      }

      didCleanup = true;
      unlisten();
    };

    let handle: AITaskExecutionHandle;

    try {
      handle = await desktopInfrastructure.commands.invoke<AITaskExecutionHandle>("start_ai_task", {
        taskId,
        input: {
          provider: input.entry.provider,
          promptLabel: input.entry.title,
          prompt: input.prompt,
        },
      });
    } catch (error) {
      cleanup();
      throw error;
    }

    let shouldStopPolling = false;
    const stopPolling = () => {
      shouldStopPolling = true;
    };

    const eventResult = result.finally(() => {
      stopPolling();
      cleanup();
    });
    const codexProbeResult =
      handle.provider === "Codex"
        ? (async (): Promise<AITaskExecutionResult> => {
            const probeIntervalMs = await getProbeIntervalMs();

            while (!shouldStopPolling) {
              const probed =
                await desktopInfrastructure.commands.invoke<AITaskExecutionResult | null>(
                  "probe_ai_task_result",
                  {
                    input: {
                      taskId,
                      provider: handle.provider,
                      command: handle.command,
                      promptLabel: handle.promptLabel,
                      workingDirectory: handle.workingDirectory,
                      startedAt: handle.startedAt,
                    },
                  },
                );

              if (probed) {
                stopPolling();
                cleanup();
                return probed;
              }

              await delay(probeIntervalMs);
            }

            throw new Error("AI 요청이 취소되었습니다.");
          })()
        : null;

    return {
      ...handle,
      result: (codexProbeResult
        ? Promise.race([eventResult, codexProbeResult])
        : eventResult
      ).finally(() => {
        stopPolling();
        cleanup();
      }),
      cancel: async () => {
        stopPolling();
        cleanup();
        await desktopInfrastructure.commands.invoke<void>("cancel_ai_task", { taskId });
      },
    };
  };

  return {
    async runEntryPoint(input: AITaskExecutionInput): Promise<AITaskExecutionResult> {
      const execution = await startEntryPoint(input);
      return execution.result;
    },
    startEntryPoint,
  };
}

export function createTauriHarnessDocsServices(
  desktopInfrastructure: DesktopInfrastructure,
): HarnessDocsServices {
  const authentication = createTauriAuthenticationService(desktopInfrastructure);
  const workspaceSession = createTauriWorkspaceSessionService(desktopInfrastructure);
  const sessionReaders = createCurrentSessionReaders(authentication, workspaceSession);
  const workspaceMemberships = createSessionBackedWorkspaceMembershipService({
    getWorkspaceGraph: sessionReaders.getWorkspaceGraph,
    listWorkspaceGraphsForUser: sessionReaders.listWorkspaceGraphsForUser,
    getCurrentSessionUser: sessionReaders.getCurrentSessionUser,
  });
  const sessionBackedApprovals = createSessionBackedApprovalService({
    getWorkspaceGraph: sessionReaders.getWorkspaceGraph,
  });
  const approvals = createRpcApprovalService({
    fallbackService: sessionBackedApprovals,
    getSessionToken: () => readAppSessionToken(desktopInfrastructure.storage),
  });
  const publishing = createTauriPublishingService(desktopInfrastructure, {
    getWorkspaceGraph: sessionReaders.getWorkspaceGraph,
  });
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
    workspaceOnboarding: {
      createWorkspace: (input) =>
        createRpcWorkspace(input, {
          getSessionToken: () => readAppSessionToken(desktopInfrastructure.storage),
        }),
      acceptWorkspaceInvitation: (input) =>
        acceptRpcWorkspaceInvitationOnboarding(input, {
          getSessionToken: () => readAppSessionToken(desktopInfrastructure.storage),
        }),
    },
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
