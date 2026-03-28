import type { DesktopKeyValueStore } from "../desktop/contracts";

const appSessionTokenStorageKey = "harness-docs/api-session-token";

export async function readAppSessionToken(storage: DesktopKeyValueStore) {
  const token = await storage.getItem(appSessionTokenStorageKey);

  return token && token.trim() ? token : null;
}

export async function writeAppSessionToken(storage: DesktopKeyValueStore, token: string) {
  await storage.setItem(appSessionTokenStorageKey, token);
}

export async function clearAppSessionToken(storage: DesktopKeyValueStore) {
  await storage.setItem(appSessionTokenStorageKey, "");
}
