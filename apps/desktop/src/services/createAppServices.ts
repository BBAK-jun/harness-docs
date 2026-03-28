import { createDesktopInfrastructure } from "../desktop/createDesktopInfrastructure";
import { createTauriHarnessDocsServices } from "./tauriHarnessDocsServices";

export function createAppServices() {
  const desktopInfrastructure = createDesktopInfrastructure();

  return createTauriHarnessDocsServices(desktopInfrastructure);
}
