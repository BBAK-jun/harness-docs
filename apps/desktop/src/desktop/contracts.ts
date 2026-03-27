export type DesktopInfrastructureRuntime = "tauri" | "browser";

export type DesktopUserActivityListener = () => void;
export type DesktopWindowSubscription = () => void;

export interface DesktopCommandClient {
  invoke: <TResponse>(command: string, args?: Record<string, unknown>) => Promise<TResponse>;
}

export interface DesktopKeyValueStore {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export interface DesktopWindowService {
  subscribeToUserActivity: (
    listener: DesktopUserActivityListener
  ) => DesktopWindowSubscription;
}

export interface DesktopInfrastructure {
  runtime: DesktopInfrastructureRuntime;
  commands: DesktopCommandClient;
  storage: DesktopKeyValueStore;
  windowing: DesktopWindowService;
}
