import { useState } from "react";
import { AITaskEntryPointList } from "./AITaskEntryPointList";
import { MarkdownPreview } from "./MarkdownPreview";
import type {
  AITaskEntryPoint,
  DocumentEditingLock,
  NavigationArea,
  WorkspaceDocument,
  WorkspaceGraph,
  WorkspaceMembership,
} from "../types";

interface EditorWorkspaceProps {
  activeArea: NavigationArea;
  workspaceGraph: WorkspaceGraph;
  activeDocument: WorkspaceDocument | null;
  aiEntryPoints: AITaskEntryPoint[];
  activeMembershipId: string | null;
  activeDocumentSource: string;
  activeDocumentLock: DocumentEditingLock | null;
  onLaunchAITaskEntryPoint: (entry: AITaskEntryPoint) => void;
  onDocumentSelect: (documentId: string) => void;
  onDocumentSourceChange: (document: WorkspaceDocument, source: string) => void;
  onStartEditing: (document: WorkspaceDocument) => void;
  onReleaseEditing: (document: WorkspaceDocument) => void;
  onCreateBlockComment: (document: WorkspaceDocument, bodyMarkdown: string) => void;
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

function formatPersonName(userId: string) {
  return userId
    .replace(/^usr_/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMembershipLabel(membership: WorkspaceMembership | null | undefined) {
  if (!membership) {
    return "Unassigned";
  }

  return `${formatPersonName(membership.userId)} • ${membership.role}`;
}

function formatStateLabel(value: string) {
  return value.replace(/_/g, " ");
}

function getReviewStatus(document: WorkspaceDocument) {
  return document.lifecycle.review.status;
}

function getStalenessStatus(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.status;
}

function getStaleRationaleRequired(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.rationaleRequired;
}

function getFreshnessSummary(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.summary;
}

function getFreshnessEvaluatedAt(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.evaluatedAt ?? null;
}

export function EditorWorkspace({
  activeArea,
  workspaceGraph,
  activeDocument,
  aiEntryPoints,
  activeMembershipId,
  activeDocumentSource,
  activeDocumentLock,
  onLaunchAITaskEntryPoint,
  onDocumentSelect,
  onDocumentSourceChange,
  onStartEditing,
  onReleaseEditing,
  onCreateBlockComment,
}: EditorWorkspaceProps) {
  const [newBlockCommentBody, setNewBlockCommentBody] = useState("");

  if (!activeDocument) {
    return (
      <section className="editor-shell editor-empty-state">
        <p className="eyebrow">Editor</p>
        <h3>No document available</h3>
        <p className="muted">Add a document to this workspace to begin drafting in markdown.</p>
      </section>
    );
  }

  const activeLock = activeDocumentLock?.lifecycle.status === "active" ? activeDocumentLock : null;
  const releasedLock =
    activeDocumentLock?.lifecycle.status === "released" ? activeDocumentLock : null;
  const linkedDocuments = workspaceGraph.documents.filter((document) =>
    activeDocument.linkedDocumentIds.includes(document.id),
  );
  const documentAIEntryPoints = aiEntryPoints.filter(
    (entry) =>
      entry.discoverableFrom.includes("document_workspace") &&
      (!entry.documentId || entry.documentId === activeDocument.id),
  );
  const documentApprovals = workspaceGraph.approvals.filter(
    (approval) => approval.documentId === activeDocument.id,
  );
  const unresolvedApprovals = documentApprovals.filter((approval) =>
    ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state),
  );
  const commentsById = Object.fromEntries(
    workspaceGraph.comments.map((comment) => [comment.id, comment]),
  );
  const currentMembership =
    workspaceGraph.memberships.find((membership) => membership.id === activeMembershipId) ?? null;
  const ownerMembership =
    workspaceGraph.memberships.find(
      (membership) => membership.id === activeDocument.ownerMembershipId,
    ) ?? null;
  const lockOwner =
    workspaceGraph.memberships.find(
      (membership) => membership.id === activeLock?.lockedByMembershipId,
    ) ?? null;
  const commentThreads = workspaceGraph.commentThreads
    .filter((thread) => thread.documentId === activeDocument.id)
    .sort((left, right) => {
      if (left.lifecycle.status !== right.lifecycle.status) {
        return left.lifecycle.status === "open" ? -1 : 1;
      }

      return (
        new Date(right.lifecycle.lastCommentAt).getTime() -
        new Date(left.lifecycle.lastCommentAt).getTime()
      );
    });
  const leadMemberships = workspaceGraph.memberships.filter(
    (membership) => membership.role === "Lead",
  );
  const candidateApprovers = workspaceGraph.memberships.filter(
    (membership) => membership.role === "Lead" || membership.role === "Reviewer",
  );
  const lockOwnedByCurrentUser = Boolean(
    activeLock && currentMembership && activeLock.lockedByMembershipId === currentMembership.id,
  );
  const canStartEditing = !activeLock && Boolean(currentMembership);
  const canReleaseEditing = lockOwnedByCurrentUser;
  const canCreateBlockComment = Boolean(currentMembership && newBlockCommentBody.trim().length > 0);
  const lockBannerTone = releasedLock?.releaseReason === "timeout" ? " is-released" : "";
  const lockHeading = lockOwnedByCurrentUser
    ? "Editing active"
    : releasedLock?.releaseReason === "timeout"
      ? "Editing lock released"
      : "Start Editing required";
  const lockSummary = lockOwnedByCurrentUser
    ? "You currently hold the editing lock."
    : activeLock && lockOwner
      ? `${lockOwner.role} lock is active. Editing stays read-only until the lock is released.`
      : releasedLock?.releaseReason === "timeout"
        ? "Your editing session was automatically released after 30 minutes of inactivity."
        : "Editing is read-only until you explicitly acquire the document lock.";
  const lockDetail = activeLock
    ? `Owner ${lockOwner?.role ?? "Unknown"} • Last activity ${formatTimestamp(activeLock.lastActivityAt)}`
    : releasedLock?.releaseReason === "timeout"
      ? `Released ${formatTimestamp(releasedLock.lifecycle.releasedAt)} • Start Editing to resume this draft.`
      : "No active editing session is attached to this document.";
  const areaSummary =
    activeArea === "comments"
      ? "Comment review is foregrounded while the markdown and approval state stay visible."
      : activeArea === "approvals"
        ? "Approval governance is foregrounded while the document source and review threads stay visible."
        : "Editing is primary, with review and approval context kept in the same selected-document workspace.";

  return (
    <section className="editor-shell">
      <aside className="editor-sidebar">
        <div className="editor-sidebar-header">
          <p className="eyebrow">Documents</p>
          <h3>Editor Queue</h3>
          <p className="muted">
            Open a role-specific doc and keep source plus preview aligned while you edit.
          </p>
        </div>

        <div className="editor-document-list" role="list" aria-label="Workspace documents">
          {workspaceGraph.documents.map((document) => {
            const isActive = document.id === activeDocument.id;

            return (
              <button
                key={document.id}
                className={`editor-document-card${isActive ? " active" : ""}`}
                onClick={() => onDocumentSelect(document.id)}
                type="button"
              >
                <span className="editor-document-type">{document.type}</span>
                <strong>{document.title}</strong>
                <span className="muted">
                  {document.lifecycle.status.replace("_", " ")} • {getStalenessStatus(document)}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="editor-main">
        <header className="editor-header-card">
          <div>
            <p className="eyebrow">Selected Document Workspace</p>
            <h3>{activeDocument.title}</h3>
            <p className="muted">
              {activeDocument.type} • Updated {formatTimestamp(activeDocument.lifecycle.updatedAt)}
            </p>
            <p className="muted">{areaSummary}</p>
          </div>

          <div className="editor-badges">
            <span className="repo-chip">{activeDocument.lifecycle.status.replace("_", " ")}</span>
            <span className="repo-chip">
              {activeLock ? `Locked until ${formatTimestamp(activeLock.expiresAt)}` : "Unlocked"}
            </span>
          </div>
        </header>

        <section className="document-workspace-overview">
          <article className="detail-card">
            <p className="eyebrow">Ownership</p>
            <div className="note-stack">
              <p>{formatMembershipLabel(ownerMembership)}</p>
              <p className="muted">
                {activeLock
                  ? `Active lock holder: ${formatMembershipLabel(lockOwner)}`
                  : "No lock is active. Start Editing is required before the source becomes writable."}
              </p>
            </div>
          </article>

          <article className="detail-card">
            <p className="eyebrow">Comments Snapshot</p>
            <div className="note-stack">
              <p>
                {commentThreads.length} thread{commentThreads.length === 1 ? "" : "s"} anchored to
                this document
              </p>
              <p className="muted">
                Paragraph and block comments stay attached to the selected document, not a global
                workspace feed.
              </p>
            </div>
          </article>

          <article className="detail-card">
            <p className="eyebrow">Approval Snapshot</p>
            <div className="note-stack">
              <p>
                {unresolvedApprovals.length} unresolved approval reference
                {unresolvedApprovals.length === 1 ? "" : "s"}
              </p>
              <p className="muted">
                {getStaleRationaleRequired(activeDocument)
                  ? "Stale publish remains allowed, but rationale capture is required."
                  : "No stale rationale is currently required for publish."}
              </p>
            </div>
          </article>
        </section>

        <section className="selected-document-grid">
          <article
            className={`editor-pane document-region${activeArea === "editor" ? " region-focused" : ""}`}
          >
            <div className="editor-pane-header">
              <div>
                <p className="eyebrow">Editing Region</p>
                <h3>Markdown Source and Preview</h3>
              </div>
              <span className="muted">{activeDocument.slug}.md</span>
            </div>

            <section className="editor-workspace">
              <article className="editor-pane editor-subpane">
                <div className="editor-pane-header">
                  <p className="eyebrow">Source</p>
                  <span className="muted">Controlled draft state</span>
                </div>

                <div className={`editor-lock-banner${lockBannerTone}`} aria-live="polite">
                  <div className="editor-lock-copy">
                    <strong>{lockHeading}</strong>
                    <p className="muted">{lockSummary}</p>
                    <p className="muted">{lockDetail}</p>
                  </div>

                  <div className="editor-lock-actions">
                    <button
                      className={`primary-button${lockOwnedByCurrentUser ? " is-active" : ""}`}
                      disabled={!canStartEditing}
                      onClick={() => onStartEditing(activeDocument)}
                      type="button"
                    >
                      {lockOwnedByCurrentUser
                        ? "Editing Locked"
                        : activeLock
                          ? "Lock Unavailable"
                          : "Start Editing"}
                    </button>

                    <button
                      className="ghost-button"
                      disabled={!canReleaseEditing}
                      onClick={() => onReleaseEditing(activeDocument)}
                      type="button"
                    >
                      Release Lock
                    </button>
                  </div>
                </div>

                <textarea
                  aria-label={`Markdown source for ${activeDocument.title}`}
                  aria-readonly={!lockOwnedByCurrentUser}
                  className={`markdown-editor${lockOwnedByCurrentUser ? "" : " is-readonly"}`}
                  onChange={(event) => onDocumentSourceChange(activeDocument, event.target.value)}
                  readOnly={!lockOwnedByCurrentUser}
                  spellCheck={false}
                  value={activeDocumentSource}
                />
              </article>

              <article className="editor-pane editor-subpane">
                <div className="editor-pane-header">
                  <p className="eyebrow">Preview</p>
                  <span className="muted">Live markdown render</span>
                </div>

                <div className="editor-preview-surface">
                  <MarkdownPreview source={activeDocumentSource} />
                </div>
              </article>
            </section>
          </article>

          <div className="document-side-rail">
            <article
              className={`detail-card document-region${activeArea === "comments" ? " region-focused" : ""}`}
            >
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">Comments Region</p>
                  <h3>Anchored Threads and Mentions</h3>
                </div>
                <span className="muted">{commentThreads.length} thread lanes</span>
              </div>

              <div className="comment-thread-list">
                <div className="comment-composer">
                  <p className="muted">
                    Add a block comment to the selected document. The foundation stores the thread
                    against the document block anchor in app state.
                  </p>
                  <textarea
                    aria-label={`New block comment for ${activeDocument.title}`}
                    className="comment-composer-input"
                    onChange={(event) => setNewBlockCommentBody(event.target.value)}
                    placeholder="Leave feedback on the current document block"
                    value={newBlockCommentBody}
                  />
                  <button
                    className="primary-button"
                    disabled={!canCreateBlockComment}
                    onClick={() => {
                      if (!canCreateBlockComment) {
                        return;
                      }

                      onCreateBlockComment(activeDocument, newBlockCommentBody.trim());
                      setNewBlockCommentBody("");
                    }}
                    type="button"
                  >
                    Add Block Comment
                  </button>
                </div>

                {commentThreads.length > 0 ? (
                  commentThreads.map((thread) => {
                    const latestComment =
                      commentsById[thread.commentIds[thread.commentIds.length - 1]];
                    const latestAuthor =
                      workspaceGraph.memberships.find(
                        (membership) => membership.id === latestComment?.authorMembershipId,
                      ) ?? null;

                    return (
                      <article key={thread.id} className="comment-thread-card">
                        <div className="document-row-topline">
                          <span
                            className={`queue-chip${thread.lifecycle.status === "resolved" ? " muted-chip" : ""}`}
                          >
                            {thread.lifecycle.status}
                          </span>
                          <span className="muted">
                            {thread.anchor.kind} • {thread.anchor.blockKind}
                          </span>
                        </div>
                        <strong>{thread.anchor.headingPath.join(" / ")}</strong>
                        <p className="muted">{thread.anchor.excerpt}</p>
                        <p className="muted">
                          Latest activity {formatTimestamp(thread.lifecycle.lastCommentAt)}
                        </p>
                        <p>
                          {latestComment
                            ? `${formatMembershipLabel(latestAuthor)}: ${latestComment.bodyMarkdown}`
                            : "No comment body recorded yet."}
                        </p>
                        <p className="muted">
                          {thread.triggeredReviewDocumentIds.length > 0
                            ? `${thread.triggeredReviewDocumentIds.length} linked review request(s) triggered`
                            : "No linked review requests triggered yet"}
                        </p>
                      </article>
                    );
                  })
                ) : (
                  <p className="muted">
                    No anchored comment threads yet. This region is reserved for paragraph or
                    block-level review activity on the selected document.
                  </p>
                )}
              </div>
            </article>

            <article
              className={`detail-card document-region${activeArea === "approvals" ? " region-focused" : ""}`}
            >
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">Approvals Region</p>
                  <h3>Authority and Decision State</h3>
                </div>
                <span className={`staleness-pill ${getStalenessStatus(activeDocument)}`}>
                  {getStalenessStatus(activeDocument)}
                </span>
              </div>

              <div className="approval-card-list">
                <article className="approval-card">
                  <strong>Current Review State</strong>
                  <p className="muted">
                    {formatStateLabel(getReviewStatus(activeDocument))} in app-managed approvals.
                  </p>
                </article>

                <article className="approval-card">
                  <strong>Lead Restoration Authority</strong>
                  <p className="muted">
                    {leadMemberships.length > 0
                      ? leadMemberships
                          .map((membership) => formatMembershipLabel(membership))
                          .join(", ")
                      : "No lead authority assigned"}
                  </p>
                </article>

                <article className="approval-card">
                  <strong>Candidate Approvers</strong>
                  <div className="approval-candidate-list">
                    {candidateApprovers.map((membership) => (
                      <div key={membership.id} className="approval-candidate">
                        <span>{formatMembershipLabel(membership)}</span>
                        <span className="detail-pill">
                          {membership.role === "Lead" ? "restore authority" : "review candidate"}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="approval-card">
                  <strong>Assigned Approvers</strong>
                  <div className="approval-candidate-list">
                    {documentApprovals.length > 0 ? (
                      documentApprovals.map((approval) => {
                        const membership =
                          workspaceGraph.memberships.find(
                            (entry) => entry.id === approval.membershipId,
                          ) ?? null;

                        return (
                          <div key={approval.id} className="approval-candidate">
                            <span>
                              {approval.reviewerLabel} •{" "}
                              {formatStateLabel(approval.lifecycle.state)}
                            </span>
                            <span className="detail-pill">
                              {membership ? formatMembershipLabel(membership) : approval.authority}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="muted">No approvers assigned yet.</p>
                    )}
                  </div>
                </article>

                <article className="approval-card">
                  <strong>Freshness Evaluation</strong>
                  <p className="muted">{getFreshnessSummary(activeDocument)}</p>
                  <p className="muted">
                    Evaluated {formatTimestamp(getFreshnessEvaluatedAt(activeDocument))}
                  </p>
                </article>

                <article className="approval-card">
                  <strong>Linked Review Impact</strong>
                  <div className="note-stack">
                    <p className="muted">
                      {linkedDocuments.length > 0
                        ? `${linkedDocuments.length} linked documents may receive review requests and notifications.`
                        : "No linked documents are attached to this draft yet."}
                    </p>
                    {linkedDocuments.map((document) => (
                      <p key={document.id}>
                        {document.title} • {document.type}
                      </p>
                    ))}
                  </div>
                </article>
              </div>
            </article>

            <article className="detail-card document-region">
              <div className="editor-pane-header">
                <div>
                  <p className="eyebrow">AI Region</p>
                  <h3>Document entry points</h3>
                </div>
                <span className="queue-chip">{documentAIEntryPoints.length} actions</span>
              </div>

              <AITaskEntryPointList
                emptyMessage="AI drafting actions will appear here when document-scoped launch points are configured."
                entries={documentAIEntryPoints}
                onLaunchEntryPoint={onLaunchAITaskEntryPoint}
              />
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}
