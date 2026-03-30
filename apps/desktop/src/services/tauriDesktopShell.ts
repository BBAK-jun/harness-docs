import { aiProviderValues } from "@harness-docs/contracts";
import type { AIProvider } from "../types/contracts";
import type { DesktopInfrastructure } from "../desktop/contracts";
import type {
  AIProviderRuntimeStatus,
  DesktopShellMetadata,
  DesktopShellService,
} from "./contracts";

function createUnavailableBrowserProviderStatus(provider: AIProvider): AIProviderRuntimeStatus {
  return {
    status: "unavailable",
    command: provider === "Codex" ? "codex" : "claude",
    detail: "AI task execution requires the Tauri runtime.",
  };
}

const browserAIProviderStatuses: DesktopShellMetadata["aiProviderStatuses"] = {
  Codex: createUnavailableBrowserProviderStatus("Codex"),
  Claude: createUnavailableBrowserProviderStatus("Claude"),
};

const browserShellMetadata: DesktopShellMetadata = {
  runtime: "browser",
  platform: "web",
  appName: "Harness Docs",
  appVersion: "0.1.0",
  versionControlProvider: "github",
  authenticationProvider: "github_oauth",
  supportedAIProviders: ["Codex", "Claude"],
  aiProviderStatuses: browserAIProviderStatuses,
  aiTaskProbeIntervalMs: 750,
  editingLockTimeoutMinutes: 30,
  supportsOutboundWebhooks: true,
  supportsGitHubPublishAutomation: true,
};

interface RawDesktopShellMetadata {
  runtime?: DesktopShellMetadata["runtime"];
  platform?: string;
  appName?: string;
  appVersion?: string;
  versionControlProvider?: DesktopShellMetadata["versionControlProvider"];
  authenticationProvider?: DesktopShellMetadata["authenticationProvider"];
  supportedAIProviders?: DesktopShellMetadata["supportedAIProviders"];
  supportedAiProviders?: DesktopShellMetadata["supportedAIProviders"];
  aiProviderStatuses?: Partial<Record<AIProvider, Partial<AIProviderRuntimeStatus>>>;
  aiTaskProbeIntervalMs?: number;
  editingLockTimeoutMinutes?: number;
  supportsOutboundWebhooks?: boolean;
  supportsGitHubPublishAutomation?: boolean;
  supportsGithubPublishAutomation?: boolean;
}

function normalizeAIProviderStatuses(
  rawStatuses: RawDesktopShellMetadata["aiProviderStatuses"],
): DesktopShellMetadata["aiProviderStatuses"] {
  return aiProviderValues.reduce(
    (statuses, provider) => {
      const fallback = browserAIProviderStatuses[provider];
      const rawStatus = rawStatuses?.[provider];

      statuses[provider] = {
        status:
          rawStatus?.status === "available" || rawStatus?.status === "unavailable"
            ? rawStatus.status
            : fallback.status,
        command:
          typeof rawStatus?.command === "string" && rawStatus.command.length > 0
            ? rawStatus.command
            : fallback.command,
        detail: typeof rawStatus?.detail === "string" ? rawStatus.detail : fallback.detail,
      };

      return statuses;
    },
    {} as DesktopShellMetadata["aiProviderStatuses"],
  );
}

function normalizeDesktopShellMetadata(rawMetadata: RawDesktopShellMetadata): DesktopShellMetadata {
  return {
    runtime: rawMetadata.runtime ?? browserShellMetadata.runtime,
    platform: rawMetadata.platform ?? browserShellMetadata.platform,
    appName: rawMetadata.appName ?? browserShellMetadata.appName,
    appVersion: rawMetadata.appVersion ?? browserShellMetadata.appVersion,
    versionControlProvider:
      rawMetadata.versionControlProvider ?? browserShellMetadata.versionControlProvider,
    authenticationProvider:
      rawMetadata.authenticationProvider ?? browserShellMetadata.authenticationProvider,
    supportedAIProviders:
      rawMetadata.supportedAIProviders ??
      rawMetadata.supportedAiProviders ??
      browserShellMetadata.supportedAIProviders,
    aiProviderStatuses: normalizeAIProviderStatuses(rawMetadata.aiProviderStatuses),
    aiTaskProbeIntervalMs:
      typeof rawMetadata.aiTaskProbeIntervalMs === "number" &&
      rawMetadata.aiTaskProbeIntervalMs >= 100
        ? rawMetadata.aiTaskProbeIntervalMs
        : browserShellMetadata.aiTaskProbeIntervalMs,
    editingLockTimeoutMinutes:
      rawMetadata.editingLockTimeoutMinutes ?? browserShellMetadata.editingLockTimeoutMinutes,
    supportsOutboundWebhooks:
      rawMetadata.supportsOutboundWebhooks ?? browserShellMetadata.supportsOutboundWebhooks,
    supportsGitHubPublishAutomation:
      rawMetadata.supportsGitHubPublishAutomation ??
      rawMetadata.supportsGithubPublishAutomation ??
      browserShellMetadata.supportsGitHubPublishAutomation,
  };
}

export function createDesktopShellService(
  desktopInfrastructure: DesktopInfrastructure,
): DesktopShellService {
  return {
    async getMetadata() {
      if (desktopInfrastructure.runtime !== "tauri") {
        return browserShellMetadata;
      }

      try {
        const rawMetadata = await desktopInfrastructure.commands.invoke<RawDesktopShellMetadata>(
          "get_desktop_shell_metadata",
        );

        return normalizeDesktopShellMetadata(rawMetadata);
      } catch {
        return browserShellMetadata;
      }
    },
  };
}
