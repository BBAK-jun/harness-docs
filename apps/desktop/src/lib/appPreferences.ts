import type { DesktopKeyValueStore } from "../desktop/contracts";
import type { AIProvider } from "../types";

const APP_PREFERENCES_STORAGE_KEY = "harness-docs.app-preferences.v1";

interface PersistedAppPreferences {
  preferredAIProvider: AIProvider;
}

export const defaultAppPreferences: PersistedAppPreferences = {
  preferredAIProvider: "Codex",
};

function isAIProvider(value: unknown): value is AIProvider {
  return value === "Codex" || value === "Claude";
}

export async function readAppPreferences(
  storage: DesktopKeyValueStore,
): Promise<PersistedAppPreferences> {
  const rawPreferences = await storage.getItem(APP_PREFERENCES_STORAGE_KEY);

  if (!rawPreferences) {
    return defaultAppPreferences;
  }

  try {
    const parsedPreferences = JSON.parse(rawPreferences) as Partial<PersistedAppPreferences>;

    return {
      preferredAIProvider: isAIProvider(parsedPreferences.preferredAIProvider)
        ? parsedPreferences.preferredAIProvider
        : defaultAppPreferences.preferredAIProvider,
    };
  } catch {
    return defaultAppPreferences;
  }
}

export async function writeAppPreferences(
  storage: DesktopKeyValueStore,
  preferences: PersistedAppPreferences,
): Promise<void> {
  await storage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}
