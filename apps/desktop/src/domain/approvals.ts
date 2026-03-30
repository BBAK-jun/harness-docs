import type {
  ApprovalDecisionDto,
  ApprovalRequestDto,
  ApprovalCandidateSource,
  DocumentApproval,
  DocumentApprovalAuthority,
  DocumentInvalidation,
  DocumentReviewState,
  UnresolvedApprovalSnapshot,
  WorkspaceGraph,
} from "../types/contracts";
import type { ApprovalId, DocumentId, MembershipId, WorkspaceId } from "../types/domain-ui";

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

export interface ApprovalMutationResult {
  approval: DocumentApproval;
  workspaceGraph: WorkspaceGraph;
}

export interface ApprovalService {
  getWorkspacePolicy: (workspaceId: WorkspaceId) => Promise<WorkspaceApprovalPolicy>;
  listDocumentApprovalBundles: (workspaceId: WorkspaceId) => Promise<DocumentApprovalBundle[]>;
  getDocumentApprovalBundle: (
    workspaceId: WorkspaceId,
    documentId: DocumentId,
  ) => Promise<DocumentApprovalBundle | null>;
  requestApproval: (
    workspaceId: WorkspaceId,
    documentId: DocumentId,
    input: ApprovalRequestDto,
  ) => Promise<ApprovalMutationResult>;
  decideApproval: (
    workspaceId: WorkspaceId,
    approvalId: ApprovalId,
    input: ApprovalDecisionDto,
  ) => Promise<ApprovalMutationResult>;
}
