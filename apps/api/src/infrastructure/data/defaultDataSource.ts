import type { BootstrapSessionDto, SessionUserDto } from "@harness-docs/contracts";
import { defaultWorkspaceCatalog } from "@harness-docs/contracts";
import type { WorkspaceSessionDataSource } from "../../application/ports";

const snapshot: BootstrapSessionDto = {
  user: {
    id: "usr_demo",
    name: "Demo User",
    handle: "@demo",
    avatarInitials: "DU",
    githubLogin: "demo",
    primaryEmail: "demo@example.com",
  } satisfies SessionUserDto,
  workspaces: defaultWorkspaceCatalog,
  workspaceGraphs: [],
  lastActiveWorkspaceId: defaultWorkspaceCatalog[0]?.id ?? null,
};

export function createDefaultDataSource(): WorkspaceSessionDataSource {
  return {
    async getBootstrapSession() {
      return snapshot;
    },
    async getWorkspaceGraph() {
      return null;
    },
    async getWorkspaceDocuments() {
      return [];
    },
    async getWorkspaceApprovals() {
      return [];
    },
    async getWorkspacePublishRecords() {
      return [];
    },
    async updateWorkspace() {
      return null;
    },
    async createDocument() {
      return null;
    },
    async updateDocument() {
      return null;
    },
    async requestApproval() {
      return null;
    },
    async decideApproval() {
      return null;
    },
    async createPublishRecord() {
      return null;
    },
    async executePublishRecord() {
      return null;
    },
    async createWorkspace() {
      return null;
    },
    async acceptWorkspaceInvitation() {
      return null;
    },
  };
}
