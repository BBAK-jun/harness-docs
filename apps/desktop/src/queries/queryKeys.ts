const desktopQueryRoot = ["desktop"] as const;
const rpcQueryRoot = ["rpc"] as const;

export const desktopQueryKeys = {
  all: desktopQueryRoot,
  bootstrap: () => [...desktopQueryRoot, "bootstrap"] as const,
  preferences: () => [...desktopQueryRoot, "preferences"] as const,
  publishing: {
    preflight: (workspaceId: string, documentId: string) =>
      [...desktopQueryRoot, "publishing", "preflight", workspaceId, documentId] as const,
  },
} as const;

export const rpcQueryKeys = {
  all: rpcQueryRoot,
  health: (baseUrl: string) => [...rpcQueryRoot, "health", baseUrl] as const,
} as const;

export const desktopMutationKeys = {
  preferences: {
    write: () => [...desktopQueryRoot, "preferences", "write"] as const,
  },
  authentication: {
    session: () => [...desktopQueryRoot, "authentication", "session"] as const,
  },
  workspace: {
    create: () => [...desktopQueryRoot, "workspace", "create"] as const,
    acceptInvitation: () => [...desktopQueryRoot, "workspace", "accept-invitation"] as const,
  },
  ai: {
    runEntryPoint: () => [...desktopQueryRoot, "ai", "run-entry-point"] as const,
  },
  publishing: {
    execute: () => [...desktopQueryRoot, "publishing", "execute"] as const,
  },
} as const;
