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
  supportsGitHubPublishAutomation: true
};

export function createDesktopShellService(
  desktopInfrastructure: DesktopInfrastructure
): DesktopShellService {
  return {
    async getMetadata() {
      if (desktopInfrastructure.runtime !== "tauri") {
        return browserShellMetadata;
      }

      try {
        return await desktopInfrastructure.commands.invoke<DesktopShellMetadata>(
          "get_desktop_shell_metadata"
        );
      } catch {
        return browserShellMetadata;
      }
    }
  };
}
