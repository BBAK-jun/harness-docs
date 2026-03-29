import type {
  WorkspaceMembership,
  WorkspaceRepositoryBinding,
  WorkspaceRole,
} from "../types/contracts";
import type { UserId, WorkspaceId } from "../types/domain-ui";

export interface WorkspaceMembershipCapabilities {
  canEditDocuments: boolean;
  canManageApprovals: boolean;
  canPublish: boolean;
  canAdministerWorkspace: boolean;
}

export interface WorkspaceMemberProfile {
  membership: WorkspaceMembership;
  displayName: string;
  githubLogin: string;
  isCurrentUser: boolean;
  capabilities: WorkspaceMembershipCapabilities;
}

export interface WorkspaceMembershipSnapshot {
  workspaceId: WorkspaceId;
  repository: WorkspaceRepositoryBinding;
  leadMembershipId: string;
  currentUserMembershipId: string | null;
  roles: WorkspaceRole[];
  members: WorkspaceMemberProfile[];
}

export interface WorkspaceMembershipService {
  listForUser: (userId: UserId) => Promise<WorkspaceMembershipSnapshot[]>;
  getWorkspaceMemberships: (
    workspaceId: WorkspaceId,
    userId: UserId,
  ) => Promise<WorkspaceMembershipSnapshot>;
}
