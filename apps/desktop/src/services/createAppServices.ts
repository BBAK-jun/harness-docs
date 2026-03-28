import { createDesktopInfrastructure } from "../desktop/createDesktopInfrastructure";
import { createMockHarnessDocsServices } from "./mockHarnessDocsServices";
import { createTauriHarnessDocsServices } from "./tauriHarnessDocsServices";

export function createAppServices() {
  const desktopInfrastructure = createDesktopInfrastructure();

  if (desktopInfrastructure.runtime === "browser") {
    return createMockHarnessDocsServices(desktopInfrastructure);
  }

  return createTauriHarnessDocsServices(desktopInfrastructure);
}
