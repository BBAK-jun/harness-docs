import type {
  AuthProvider,
  WorkspaceInvitationAcceptRequestDto,
  WorkspaceCreateRequestDto,
  WorkspaceOnboardingEnvelopeDto,
} from "@harness-docs/contracts";
import type { DesktopWindowService } from "../desktop/contracts";
import type { ApprovalService } from "../domain/approvals";
import type { AITaskService } from "../domain/aiTasks";
import type { PublishingService } from "../domain/publishing";
import type { WorkspaceMembershipService } from "../domain/workspaceMembership";
import type { AIProvider, SessionUser, WorkspaceGraph, WorkspaceSummary } from "../types/contracts";
import type { WorkspaceId } from "../types/domain-ui";

export type DesktopRuntime = "tauri" | "browser";
export type VersionControlProvider = "github";
export type AuthenticationProvider = AuthProvider;
export type AuthenticationSessionStatus = "authenticated" | "signed_out";
export type AppearanceMode = "dark" | "light";
export type AIProviderRuntimeAvailability = "available" | "unavailable";

export interface AIProviderRuntimeStatus {
  status: AIProviderRuntimeAvailability;
  command: string;
  detail: string | null;
}

export type AIProviderRuntimeStatusMap = Record<AIProvider, AIProviderRuntimeStatus>;

export interface AppPreferences {
  preferredAIProvider: AIProvider;
  appearanceMode: AppearanceMode;
}

export interface AuthenticationProviderDescriptor {
  id: AuthenticationProvider;
  label: string;
  kind: "oauth";
  loginCtaLabel: string;
}

export interface DesktopShellMetadata {
  runtime: DesktopRuntime;
  platform: string;
  appName: string;
  appVersion: string;
  versionControlProvider: VersionControlProvider;
  authenticationProvider: AuthenticationProvider;
  supportedAIProviders: AIProvider[];
  aiProviderStatuses: AIProviderRuntimeStatusMap;
  aiTaskProbeIntervalMs: number;
  editingLockTimeoutMinutes: number;
  supportsOutboundWebhooks: boolean;
  supportsGitHubPublishAutomation: boolean;
}

export interface WorkspaceSessionSnapshot {
  user: SessionUser;
  workspaces: WorkspaceSummary[];
  workspaceGraphs: WorkspaceGraph[];
  lastActiveWorkspaceId: WorkspaceId | null;
}

export interface AuthenticatedSessionSnapshot {
  status: "authenticated";
  provider: AuthenticationProviderDescriptor;
  user: SessionUser;
}

export interface SignedOutSessionSnapshot {
  status: "signed_out";
  provider: AuthenticationProviderDescriptor;
  user: null;
}

export type AuthenticationSessionSnapshot = AuthenticatedSessionSnapshot | SignedOutSessionSnapshot;

export interface AuthenticatedAppSessionSnapshot {
  authentication: AuthenticatedSessionSnapshot;
  workspace: WorkspaceSessionSnapshot;
}

export interface SignedOutAppSessionSnapshot {
  authentication: SignedOutSessionSnapshot;
  workspace: null;
}

export type AppSessionSnapshot = AuthenticatedAppSessionSnapshot | SignedOutAppSessionSnapshot;

export interface DesktopShellService {
  getMetadata: () => Promise<DesktopShellMetadata>;
}

export interface AppPreferencesService {
  read: () => Promise<AppPreferences>;
  write: (preferences: AppPreferences) => Promise<void>;
}

export interface AuthenticationService {
  getProvider: () => Promise<AuthenticationProviderDescriptor>;
  restoreSession: () => Promise<AuthenticationSessionSnapshot>;
  startSignIn: (provider: AuthenticationProvider) => Promise<AuthenticationSessionSnapshot>;
  signOut: () => Promise<AuthenticationSessionSnapshot>;
}

export interface WorkspaceSessionService {
  getSnapshot: (session: AuthenticatedSessionSnapshot) => Promise<WorkspaceSessionSnapshot>;
}

export interface AppSessionService {
  getSnapshot: () => Promise<AppSessionSnapshot>;
}

export interface WorkspaceOnboardingService {
  createWorkspace: (input: WorkspaceCreateRequestDto) => Promise<WorkspaceOnboardingEnvelopeDto>;
  acceptWorkspaceInvitation: (
    input: WorkspaceInvitationAcceptRequestDto,
  ) => Promise<WorkspaceOnboardingEnvelopeDto>;
}

export interface HarnessDocsServices {
  desktopShell: DesktopShellService;
  desktopWindow: DesktopWindowService;
  preferences: AppPreferencesService;
  authentication: AuthenticationService;
  workspaceSession: WorkspaceSessionService;
  appSession: AppSessionService;
  workspaceOnboarding: WorkspaceOnboardingService;
  workspaceMemberships: WorkspaceMembershipService;
  approvals: ApprovalService;
  publishing: PublishingService;
  aiTasks: AITaskService;
}
