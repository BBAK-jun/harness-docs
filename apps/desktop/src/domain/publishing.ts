import type { PublishPreflightView, StalePublishRationaleDto } from "@harness-docs/contracts";
import type {
  MembershipId,
  PublishRecord,
  PublishRecordId,
  WorkspaceDocument,
  WorkspaceId,
  WorkspaceRepositoryBinding,
} from "../types";

export interface PublishAutomationContract {
  sourceOfTruth: "app";
  versionControlProvider: "github";
  repositoryMapping: "one_workspace_to_one_repo";
  automatedSteps: ["create_branch", "create_commit", "create_pull_request"];
  stalePublishPolicy: {
    evaluatedAtPublishTime: true;
    allowStalePublish: true;
    requireRationale: true;
    preserveUnresolvedState: true;
  };
  templateVersioning: "templates_versioned_and_published";
}

export interface WorkspacePublishingSnapshot {
  workspaceId: WorkspaceId;
  repository: WorkspaceRepositoryBinding;
  activePublishRecord: PublishRecord | null;
  publishRecords: PublishRecord[];
  staleDocumentIds: string[];
  unresolvedApprovalIds: string[];
}

export interface PublishRepositoryFile {
  path: string;
  content: string;
}

export interface PublishExecutionInput {
  workspaceId: WorkspaceId;
  repository: WorkspaceRepositoryBinding;
  publishRecord: PublishRecord;
  documents: WorkspaceDocument[];
  files: PublishRepositoryFile[];
  initiatedByMembershipId: MembershipId | null;
  staleRationale?: StalePublishRationaleDto | null;
}

export interface PublishExecutionResult {
  repository: string;
  localRepoPath: string;
  branchName: string;
  commitSha: string | null;
  pullRequestNumber: number | null;
  pullRequestUrl: string | null;
  committedFiles: string[];
  startedAt: string;
  completedAt: string;
}

export interface PublishingService {
  getAutomationContract: () => Promise<PublishAutomationContract>;
  getWorkspacePublishingSnapshot: (
    workspaceId: WorkspaceId,
  ) => Promise<WorkspacePublishingSnapshot>;
  getDocumentPublishPreflight: (
    workspaceId: WorkspaceId,
    documentId: string,
  ) => Promise<PublishPreflightView | null>;
  getPublishRecord: (
    workspaceId: WorkspaceId,
    publishRecordId: PublishRecordId,
  ) => Promise<PublishRecord | null>;
  executePublish: (input: PublishExecutionInput) => Promise<PublishExecutionResult>;
}
