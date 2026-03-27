import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";
import type { HarnessDocsServices } from "./contracts";

const HarnessDocsServicesContext = createContext<HarnessDocsServices | null>(null);

export interface HarnessDocsServicesProviderProps extends PropsWithChildren {
  services: HarnessDocsServices;
}

export function HarnessDocsServicesProvider({
  services,
  children
}: HarnessDocsServicesProviderProps) {
  return (
    <HarnessDocsServicesContext.Provider value={services}>
      {children}
    </HarnessDocsServicesContext.Provider>
  );
}

export function useHarnessDocsServices() {
  const services = useContext(HarnessDocsServicesContext);

  if (!services) {
    throw new Error("HarnessDocsServicesProvider is required to resolve app services.");
  }

  return services;
}
