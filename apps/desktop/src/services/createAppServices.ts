import { createDesktopInfrastructure } from "../desktop/createDesktopInfrastructure";
import { createMockHarnessDocsServices } from "./mockHarnessDocsServices";
import { createTauriHarnessDocsServices } from "./tauriHarnessDocsServices";

export function createAppServices() {
  const desktopInfrastructure = createDesktopInfrastructure();

  if (desktopInfrastructure.runtime === "tauri") {
    return createTauriHarnessDocsServices(desktopInfrastructure);
  }

  return createMockHarnessDocsServices(desktopInfrastructure);
}
