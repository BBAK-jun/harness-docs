import type {
  ApprovalDecisionDto,
  ApprovalMutationEnvelopeDto,
  ApprovalRequestDto,
  AuthSessionExchangeRequestDto,
  AuthenticatedApiSessionDto,
  BootstrapSessionDto,
  DocumentApproval,
  DocumentCreateRequestDto,
  DocumentMutationEnvelopeDto,
  DocumentUpdateRequestDto,
  GitHubOAuthAttemptDto,
  GitHubOAuthStartDto,
  PublishRecord,
  PublishExecutionEnvelopeDto,
  PublishPreflightView,
  PublishRecordCreateRequestDto,
  PublishRecordExecuteRequestDto,
  PublishRecordMutationEnvelopeDto,
  SessionUserDto,
  WorkspaceDocument,
  WorkspaceGraph,
  WorkspaceCreateRequestDto,
  WorkspaceInvitationAcceptRequestDto,
  WorkspaceMutationEnvelopeDto,
  WorkspaceOnboardingEnvelopeDto,
  WorkspaceUpdateRequestDto,
} from "@harness-docs/contracts";

export interface WorkspaceSessionDataSource {
  getBootstrapSession: (viewerUserId?: string) => Promise<BootstrapSessionDto | null>;
  getWorkspaceGraph: (workspaceId: string) => Promise<WorkspaceGraph | null>;
  getWorkspaceDocuments: (workspaceId: string) => Promise<WorkspaceDocument[] | null>;
  getWorkspaceApprovals: (workspaceId: string) => Promise<DocumentApproval[] | null>;
  getWorkspacePublishRecords: (workspaceId: string) => Promise<PublishRecord[] | null>;
  updateWorkspace: (
    workspaceId: string,
    input: WorkspaceUpdateRequestDto,
  ) => Promise<WorkspaceMutationEnvelopeDto | null>;
  createDocument: (
    workspaceId: string,
    input: DocumentCreateRequestDto,
  ) => Promise<DocumentMutationEnvelopeDto | null>;
  updateDocument: (
    workspaceId: string,
    documentId: string,
    input: DocumentUpdateRequestDto,
  ) => Promise<DocumentMutationEnvelopeDto | null>;
  requestApproval: (
    workspaceId: string,
    documentId: string,
    input: ApprovalRequestDto,
  ) => Promise<ApprovalMutationEnvelopeDto | null>;
  decideApproval: (
    workspaceId: string,
    approvalId: string,
    input: ApprovalDecisionDto,
  ) => Promise<ApprovalMutationEnvelopeDto | null>;
  createPublishRecord: (
    workspaceId: string,
    input: PublishRecordCreateRequestDto,
  ) => Promise<PublishRecordMutationEnvelopeDto | null>;
  executePublishRecord: (
    workspaceId: string,
    publishRecordId: string,
    input: PublishRecordExecuteRequestDto,
  ) => Promise<PublishExecutionEnvelopeDto | null>;
  createWorkspace: (
    input: WorkspaceCreateRequestDto,
    viewerUserId?: string,
  ) => Promise<WorkspaceOnboardingEnvelopeDto | null>;
  acceptWorkspaceInvitation: (
    input: WorkspaceInvitationAcceptRequestDto,
  ) => Promise<WorkspaceOnboardingEnvelopeDto | null>;
}

export interface PublishGovernanceAdapter {
  projectDocumentPublishPreflight: (params: {
    workspaceId: string;
    documentId: string;
    workspaceGraph: WorkspaceGraph;
    documents: WorkspaceDocument[];
  }) => PublishPreflightView | null;
}

export type WorkspaceRepositoryValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: string;
      message: string;
      details?: unknown;
    };

export interface WorkspaceRepositoryValidator {
  validateWorkspaceRepository: (input: {
    repositoryOwner: string;
    repositoryName: string;
    defaultBranch: string;
    viewer: SessionUserDto;
  }) => Promise<WorkspaceRepositoryValidationResult>;
}

export interface ApiAuthDataSource {
  exchangeSession: (input: AuthSessionExchangeRequestDto) => Promise<AuthenticatedApiSessionDto>;
  getSession: (sessionToken: string) => Promise<AuthenticatedApiSessionDto | null>;
  revokeSession: (sessionToken: string) => Promise<void>;
}

export interface GitHubOAuthDataSource {
  startAuthorization: (input: { requestOrigin: string }) => Promise<GitHubOAuthStartDto>;
  getAuthorizationAttempt: (attemptId: string) => Promise<GitHubOAuthAttemptDto | null>;
  completeAuthorization: (input: {
    requestOrigin: string;
    code: string | null;
    state: string | null;
    error: string | null;
    errorDescription: string | null;
  }) => Promise<{
    statusCode: 200 | 400 | 410 | 500;
    html: string;
  }>;
}

export interface ApiRouteDependencies {
  dataSource: WorkspaceSessionDataSource;
  publishGovernanceAdapter?: PublishGovernanceAdapter;
  workspaceRepositoryValidator?: WorkspaceRepositoryValidator;
  authDataSource?: ApiAuthDataSource;
  gitHubOAuthDataSource?: GitHubOAuthDataSource;
}

export interface CreateApiAppOptions extends Partial<ApiRouteDependencies> {
  dataSource?: WorkspaceSessionDataSource;
}
