import type { DesktopInfrastructure } from "../desktop/contracts";
import type { DesktopShellMetadata, DesktopShellService } from "./contracts";

const browserShellMetadata: DesktopShellMetadata = {
  runtime: "browser",
  platform: "web",
  appName: "Harness Docs",
  appVersion: "0.1.0",
  versionControlProvider: "github",
  authenticationProvider: "github_oauth",
  supportedAIProviders: ["Codex", "Claude"],
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
  editingLockTimeoutMinutes?: number;
  supportsOutboundWebhooks?: boolean;
  supportsGitHubPublishAutomation?: boolean;
  supportsGithubPublishAutomation?: boolean;
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
