import { AITaskEntryPointList } from "./AITaskEntryPointList";
import { MarkdownPreview } from "./MarkdownPreview";
import type {
  AITaskEntryPoint,
  DocumentStatus,
  PublishStalenessStatus,
  WorkspaceDocument,
  WorkspaceGraph,
  WorkspaceMembership,
  WorkspaceSummary,
} from "../types";

const statusLabels: Record<DocumentStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

const stalenessLabels: Record<PublishStalenessStatus, string> = {
  current: "Current",
  stale: "Stale",
};

interface DocumentLibraryProps {
  workspace: WorkspaceSummary;
  workspaceGraph: WorkspaceGraph;
  activeDocument: WorkspaceDocument | null;
  aiEntryPoints: AITaskEntryPoint[];
  onLaunchAITaskEntryPoint: (entry: AITaskEntryPoint) => void;
  onDocumentSelect: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not yet recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOwner(membershipId: string, memberships: WorkspaceMembership[]) {
  const membership = memberships.find((entry) => entry.id === membershipId);

  if (!membership) {
    return "Unassigned";
  }

  const userLabel = membership.userId.replace("usr_", "").replace(/_/g, " ");
  return `${userLabel} · ${membership.role}`;
}

function summarizeMarkdown(source: string) {
  return source
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatStateLabel(value: string) {
  return value.replace(/_/g, " ");
}

function getReviewStatus(document: WorkspaceDocument) {
  return document.lifecycle.review.status;
}

function getStalenessStatus(document: WorkspaceDocument): PublishStalenessStatus {
  return document.lifecycle.review.freshness.status;
}

function getStaleRationaleRequired(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.rationaleRequired;
}

function getInvalidatedByDocumentIds(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.invalidations.map(
    (invalidation) => invalidation.sourceDocumentId,
  );
}

function getFreshnessSummary(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.summary;
}

function getFreshnessEvaluatedAt(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.evaluatedAt ?? null;
}

export function DocumentLibrary({
  workspace,
  workspaceGraph,
  activeDocument,
  aiEntryPoints,
  onLaunchAITaskEntryPoint,
  onDocumentSelect,
  onOpenDocument,
}: DocumentLibraryProps) {
  const selectedDocument = activeDocument ?? workspaceGraph.documents[0] ?? null;
  const linkedDocuments = selectedDocument
    ? workspaceGraph.documents.filter((document) =>
        selectedDocument.linkedDocumentIds.includes(document.id),
      )
    : [];
  const invalidatingDocuments = selectedDocument
    ? workspaceGraph.documents.filter((document) =>
        getInvalidatedByDocumentIds(selectedDocument).includes(document.id),
      )
    : [];
  const selectedApprovals = selectedDocument
    ? workspaceGraph.approvals.filter((approval) => approval.documentId === selectedDocument.id)
    : [];
  const unresolvedApprovals = selectedApprovals.filter((approval) =>
    ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state),
  );
  const documentAIEntryPoints = aiEntryPoints.filter(
    (entry) =>
      entry.discoverableFrom.includes("document_library") &&
      (!selectedDocument || !entry.documentId || entry.documentId === selectedDocument.id),
  );

  if (!selectedDocument) {
    return (
      <section className="document-library">
        <article className="detail-card">
          <p className="eyebrow">Document Library</p>
          <h3>No documents available</h3>
          <p className="muted">
            This workspace is ready for document browsing, but no role-specific documents have been
            created yet.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="document-library">
      <div className="document-library-header">
        <article className="hero-card">
          <p className="eyebrow">Document Library</p>
          <h3>Browse the workspace queue before entering an individual document.</h3>
          <p>{workspace.areas.documents.description}</p>

          <div className="document-summary-strip" aria-label="Document metrics">
            <div>
              <strong>{workspaceGraph.documents.length}</strong>
              <span>Tracked docs</span>
            </div>
            <div>
              <strong>{workspace.pendingDrafts}</strong>
              <span>Need author action</span>
            </div>
            <div>
              <strong>{workspace.openReviews}</strong>
              <span>Review requests</span>
            </div>
            <div>
              <strong>{workspace.staleDocuments}</strong>
              <span>Stale at publish</span>
            </div>
          </div>
        </article>

        <article className="status-card">
          <p className="eyebrow">Navigation Model</p>
          <div className="note-stack">
            <p>
              Documents stay separated by type so PRDs, UX flows, specs, and policies remain
              distinct records.
            </p>
            <p>
              Selection in the queue establishes the user’s path into the document-level editor,
              review, and approval surfaces.
            </p>
            <p>
              Linked dependencies and invalidations are visible in browse mode before publish-time
              stale handling is needed.
            </p>
          </div>
        </article>
      </div>

      <div className="document-library-grid">
        <article className="document-queue-card">
          <div className="document-panel-header">
            <div>
              <p className="eyebrow">Queue</p>
              <h3>Workspace documents</h3>
            </div>
            <div className="queue-chip">{workspace.role} view</div>
          </div>

          <div className="document-queue" role="list" aria-label="Workspace documents">
            {workspaceGraph.documents.map((document) => {
              const isActive = document.id === selectedDocument.id;

              return (
                <button
                  key={document.id}
                  className={`document-row${isActive ? " active" : ""}`}
                  onClick={() => onDocumentSelect(document.id)}
                  type="button"
                >
                  <div className="document-row-topline">
                    <span className="document-type-chip">{document.type}</span>
                    <span className={`staleness-pill ${getStalenessStatus(document)}`}>
                      {stalenessLabels[getStalenessStatus(document)]}
                    </span>
                  </div>

                  <div className="document-row-copy">
                    <strong>{document.title}</strong>
                    <p>{summarizeMarkdown(document.markdownSource)}</p>
                  </div>

                  <div className="document-row-meta">
                    <span>{statusLabels[document.lifecycle.status]}</span>
                    <span>{document.linkedDocumentIds.length} linked</span>
                    <span>
                      {
                        workspaceGraph.approvals.filter(
                          (approval) =>
                            approval.documentId === document.id &&
                            ["pending", "changes_requested", "invalidated"].includes(
                              approval.lifecycle.state,
                            ),
                        ).length
                      }{" "}
                      approvals open
                    </span>
                    <span>Updated {formatTimestamp(document.lifecycle.updatedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        <article className="document-detail-card">
          <div className="document-panel-header">
            <div>
              <p className="eyebrow">Selected Document</p>
              <h3>{selectedDocument.title}</h3>
            </div>
            <button
              className="primary-button"
              onClick={() => onOpenDocument(selectedDocument.id)}
              type="button"
            >
              Open {selectedDocument.type}
            </button>
          </div>

          <div className="document-detail-breadcrumb" aria-label="Document location">
            <span>{workspace.name}</span>
            <span>/</span>
            <span>Documents</span>
            <span>/</span>
            <span>{selectedDocument.slug}</span>
          </div>

          <div className="document-detail-meta">
            <span className="document-type-chip">{selectedDocument.type}</span>
            <span className="detail-pill">{statusLabels[selectedDocument.lifecycle.status]}</span>
            <span className={`staleness-pill ${getStalenessStatus(selectedDocument)}`}>
              {stalenessLabels[getStalenessStatus(selectedDocument)]}
            </span>
            <span className="detail-pill">
              Owner {formatOwner(selectedDocument.ownerMembershipId, workspaceGraph.memberships)}
            </span>
          </div>

          <div className="document-context-grid">
            <article className="detail-card">
              <p className="eyebrow">Readiness</p>
              <ul className="highlight-list">
                <li>Review state: {formatStateLabel(getReviewStatus(selectedDocument))}</li>
                <li>Approval state: {unresolvedApprovals.length} unresolved</li>
                <li>
                  Edit lock:{" "}
                  {selectedDocument.lifecycle.activeEditLock
                    ? `Held until ${formatTimestamp(selectedDocument.lifecycle.activeEditLock.expiresAt)}`
                    : "Available to start editing"}
                </li>
                <li>
                  Review requested: {formatTimestamp(selectedDocument.lifecycle.review.requestedAt)}
                </li>
                <li>
                  Last reviewed: {formatTimestamp(selectedDocument.lifecycle.review.lastReviewedAt)}
                </li>
                <li>
                  Last published: {formatTimestamp(selectedDocument.lifecycle.lastPublishedAt)}
                </li>
              </ul>
            </article>

            <article className="detail-card">
              <p className="eyebrow">Traceability</p>
              <ul className="highlight-list">
                <li>{linkedDocuments.length} linked supporting documents</li>
                <li>{invalidatingDocuments.length} invalidations to evaluate at publish time</li>
                <li>
                  {getStaleRationaleRequired(selectedDocument)
                    ? "Stale publish rationale will be required"
                    : "No stale rationale currently required"}
                </li>
                <li>Template {selectedDocument.templateId}</li>
              </ul>
            </article>
          </div>

          <div className="document-context-grid">
            <article className="detail-card">
              <p className="eyebrow">Approvals</p>
              <ul className="highlight-list">
                {selectedApprovals.length > 0 ? (
                  selectedApprovals.map((approval) => (
                    <li key={approval.id}>
                      {approval.reviewerLabel} · {formatStateLabel(approval.lifecycle.state)} ·{" "}
                      {approval.authority.replace(/_/g, " ")}
                    </li>
                  ))
                ) : (
                  <li>No approvers assigned yet.</li>
                )}
              </ul>
            </article>

            <article className="detail-card">
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">AI Entry Points</p>
                  <h3>Document-aware AI actions</h3>
                </div>
                <span className="queue-chip">{documentAIEntryPoints.length} visible</span>
              </div>

              <AITaskEntryPointList
                emptyMessage="No document-level AI task entry points are available for this document yet."
                entries={documentAIEntryPoints}
                onLaunchEntryPoint={onLaunchAITaskEntryPoint}
              />
            </article>

            <article className="detail-card">
              <p className="eyebrow">Freshness</p>
              <ul className="highlight-list">
                <li>{getFreshnessSummary(selectedDocument)}</li>
                <li>Evaluated {formatTimestamp(getFreshnessEvaluatedAt(selectedDocument))}</li>
                <li>{unresolvedApprovals.length} approvals still require follow-up</li>
              </ul>
            </article>
          </div>

          <div className="document-link-grid">
            <article className="detail-card">
              <p className="eyebrow">Linked Documents</p>
              <div className="linked-document-stack">
                {linkedDocuments.length > 0 ? (
                  linkedDocuments.map((document) => (
                    <button
                      key={document.id}
                      className="linked-document"
                      onClick={() => onDocumentSelect(document.id)}
                      type="button"
                    >
                      <strong>{document.title}</strong>
                      <span>
                        {document.type} · {statusLabels[document.lifecycle.status]}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="muted">No linked documents captured yet.</p>
                )}
              </div>
            </article>

            <article className="detail-card">
              <p className="eyebrow">Invalidated By</p>
              <div className="linked-document-stack">
                {invalidatingDocuments.length > 0 ? (
                  invalidatingDocuments.map((document) => (
                    <button
                      key={document.id}
                      className="linked-document attention"
                      onClick={() => onDocumentSelect(document.id)}
                      type="button"
                    >
                      <strong>{document.title}</strong>
                      <span>
                        {document.type} · Updated {formatTimestamp(document.lifecycle.updatedAt)}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="muted">No active invalidations.</p>
                )}
              </div>
            </article>
          </div>

          <article className="detail-card">
            <div className="document-panel-header">
              <div>
                <p className="eyebrow">Preview</p>
                <h3>Markdown snapshot</h3>
              </div>
              <div className="queue-chip">Default editor model</div>
            </div>

            <div className="editor-preview-surface">
              <MarkdownPreview source={selectedDocument.markdownSource} />
            </div>
          </article>
        </article>
      </div>
    </section>
  );
}
