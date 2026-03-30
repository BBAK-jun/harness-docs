import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { resolvePreferredAIProvider } from "../lib/aiProviderAvailability";
import { defaultAppPreferences } from "../lib/appPreferences";
import { desktopMutationKeys, desktopQueryKeys } from "../queries/queryKeys";
import { useHarnessDocsServices } from "../services/HarnessDocsServicesProvider";
import type {
  AppSessionSnapshot,
  AppPreferences,
  AuthenticationSessionSnapshot,
  DesktopShellMetadata,
} from "../services/contracts";
import type { FileRouteTypes } from "../routeTree.gen";

export interface HarnessDocsBootstrapData {
  desktopShell: DesktopShellMetadata | null;
  appSession: AppSessionSnapshot | null;
  preferences: AppPreferences;
}

export async function loadBootstrapState(
  services: ReturnType<typeof useHarnessDocsServices>,
): Promise<HarnessDocsBootstrapData> {
  const [desktopShell, appSession, preferences] = await Promise.all([
    services.desktopShell.getMetadata(),
    services.appSession.getSnapshot(),
    services.preferences.read(),
  ]);

  return {
    desktopShell,
    appSession,
    preferences,
  };
}

export function useAppBootstrap() {
  const router = useRouter();
  const services = useHarnessDocsServices();
  const queryClient = useQueryClient();
  const bootstrapQuery = useQuery({
    queryKey: desktopQueryKeys.bootstrap(),
    queryFn: () => loadBootstrapState(services),
    throwOnError: true,
  });
  const [preferences, setPreferences] = useState<AppPreferences>(defaultAppPreferences);

  useEffect(() => {
    if (!bootstrapQuery.data) {
      return;
    }

    setPreferences(bootstrapQuery.data.preferences);
  }, [bootstrapQuery.data]);

  const writePreferencesMutation = useMutation({
    mutationKey: desktopMutationKeys.preferences.write(),
    mutationFn: async (nextPreferences: AppPreferences) => {
      await services.preferences.write(nextPreferences);
    },
  });

  const authenticationMutation = useMutation({
    mutationKey: desktopMutationKeys.authentication.session(),
    mutationFn: async (
      action:
        | {
            type: "sign-in";
            provider: AuthenticationSessionSnapshot["provider"]["id"];
          }
        | { type: "sign-out" },
    ) => {
      if (action.type === "sign-in") {
        await services.authentication.startSignIn(action.provider);
      } else {
        await services.authentication.signOut();
      }

      const nextBootstrap = await loadBootstrapState(services);
      queryClient.setQueryData(desktopQueryKeys.bootstrap(), nextBootstrap);

      return nextBootstrap;
    },
  });

  const handleSignIn = async (
    provider: AuthenticationSessionSnapshot["provider"]["id"],
    redirectTo?: FileRouteTypes["to"],
  ) => {
    await authenticationMutation.mutateAsync(
      {
        type: "sign-in",
        provider,
      },
      {
        onSuccess: () => {
          if (redirectTo) {
            void router.navigate({ to: redirectTo });
          }
        },
      },
    );
  };

  const handleSignOut = async () => {
    await authenticationMutation.mutateAsync({
      type: "sign-out",
    });
  };

  const handlePreferredAIProviderChange = (
    preferredAIProvider: AppPreferences["preferredAIProvider"],
  ) => {
    const nextPreferences = {
      ...preferences,
      preferredAIProvider,
    };

    setPreferences(nextPreferences);
    writePreferencesMutation.mutate(nextPreferences);
  };

  const handleAppearanceModeChange = (appearanceMode: AppPreferences["appearanceMode"]) => {
    const nextPreferences = {
      ...preferences,
      appearanceMode,
    };

    setPreferences(nextPreferences);
    writePreferencesMutation.mutate(nextPreferences);
  };

  const desktopShell = bootstrapQuery.data?.desktopShell ?? null;
  const preferredAIProvider = resolvePreferredAIProvider(
    preferences.preferredAIProvider,
    desktopShell,
  );

  return {
    services,
    isReady: bootstrapQuery.isSuccess,
    desktopShell,
    authentication: bootstrapQuery.data?.appSession?.authentication ?? null,
    session: bootstrapQuery.data?.appSession?.workspace ?? null,
    preferences,
    appearanceMode: preferences.appearanceMode,
    preferredAIProvider,
    handleSignIn,
    handleSignOut,
    handlePreferredAIProviderChange,
    handleAppearanceModeChange,
  };
}
