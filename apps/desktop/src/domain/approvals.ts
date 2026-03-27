import type {
  ApprovalCandidateSource,
  DocumentApproval,
  DocumentApprovalAuthority,
  DocumentId,
  DocumentInvalidation,
  DocumentReviewState,
  MembershipId,
  UnresolvedApprovalSnapshot,
  WorkspaceId,
} from "../types";

export interface ApprovalAuthorityRestorationPolicy {
  restoredBy: DocumentApprovalAuthority;
  leadMembershipIds: MembershipId[];
  appNativeOnly: true;
}

export interface WorkspaceApprovalPolicy {
  workspaceId: WorkspaceId;
  importedCandidateSources: ApprovalCandidateSource[];
  restorationPolicy: ApprovalAuthorityRestorationPolicy;
  linkedDocumentChangesRequestReview: true;
  linkedDocumentChangesTriggerNotifications: true;
}

export interface DocumentApprovalBundle {
  workspaceId: WorkspaceId;
  documentId: DocumentId;
  documentTitle: string;
  review: DocumentReviewState;
  approvals: DocumentApproval[];
  invalidations: DocumentInvalidation[];
  unresolvedApprovals: UnresolvedApprovalSnapshot[];
}

export interface ApprovalService {
  getWorkspacePolicy: (workspaceId: WorkspaceId) => Promise<WorkspaceApprovalPolicy>;
  listDocumentApprovalBundles: (workspaceId: WorkspaceId) => Promise<DocumentApprovalBundle[]>;
  getDocumentApprovalBundle: (
    workspaceId: WorkspaceId,
    documentId: DocumentId,
  ) => Promise<DocumentApprovalBundle | null>;
}
