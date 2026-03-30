import { aiProviderValues } from "@harness-docs/contracts";
import type { DesktopShellMetadata } from "../services/contracts";
import type { AIProvider } from "../types/contracts";

export function isAIProviderAvailable(
  desktopShell: DesktopShellMetadata | null,
  provider: AIProvider,
) {
  return desktopShell?.aiProviderStatuses[provider]?.status === "available";
}

export function listAvailableAIProviders(desktopShell: DesktopShellMetadata | null): AIProvider[] {
  if (!desktopShell) {
    return [];
  }

  return aiProviderValues.filter((provider) => isAIProviderAvailable(desktopShell, provider));
}

export function resolvePreferredAIProvider(
  preferredProvider: AIProvider,
  desktopShell: DesktopShellMetadata | null,
) {
  if (isAIProviderAvailable(desktopShell, preferredProvider)) {
    return preferredProvider;
  }

  return listAvailableAIProviders(desktopShell)[0] ?? preferredProvider;
}
