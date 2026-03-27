import { invoke } from "@tauri-apps/api/core";
import type {
  DesktopCommandClient,
  DesktopInfrastructure,
  DesktopInfrastructureRuntime,
  DesktopKeyValueStore,
  DesktopWindowService
} from "./contracts";

const memoryStorage = new Map<string, string>();

function canUseWindow() {
  return typeof window !== "undefined";
}

function canUseDocument() {
  return typeof document !== "undefined";
}

function canUseTauriRuntime() {
  return canUseWindow() && "__TAURI_INTERNALS__" in window;
}

function createCommandClient(runtime: DesktopInfrastructureRuntime): DesktopCommandClient {
  return {
    async invoke<TResponse>(command: string, args?: Record<string, unknown>) {
      if (runtime !== "tauri") {
        throw new Error(`Desktop command "${command}" is unavailable outside the Tauri runtime.`);
      }

      return invoke<TResponse>(command, args);
    }
  };
}

function createKeyValueStore(): DesktopKeyValueStore {
  return {
    async getItem(key) {
      if (canUseWindow() && "localStorage" in window) {
        return window.localStorage.getItem(key);
      }

      return memoryStorage.get(key) ?? null;
    },
    async setItem(key, value) {
      if (canUseWindow() && "localStorage" in window) {
        window.localStorage.setItem(key, value);
        return;
      }

      memoryStorage.set(key, value);
    }
  };
}

function createWindowingService(): DesktopWindowService {
  return {
    subscribeToUserActivity(listener) {
      if (!canUseWindow() || !canUseDocument()) {
        return () => {};
      }

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          listener();
        }
      };

      window.addEventListener("pointerdown", listener);
      window.addEventListener("keydown", listener);
      window.addEventListener("focus", listener);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        window.removeEventListener("pointerdown", listener);
        window.removeEventListener("keydown", listener);
        window.removeEventListener("focus", listener);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  };
}

export function createDesktopInfrastructure(): DesktopInfrastructure {
  const runtime: DesktopInfrastructureRuntime = canUseTauriRuntime() ? "tauri" : "browser";

  return {
    runtime,
    commands: createCommandClient(runtime),
    storage: createKeyValueStore(),
    windowing: createWindowingService()
  };
}
