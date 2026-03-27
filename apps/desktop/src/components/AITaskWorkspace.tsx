import type { AITaskExecutionResult } from "../domain/aiTasks";
import { AITaskEntryPointList } from "./AITaskEntryPointList";
import type { AIDraftSuggestion, AITaskEntryPoint, WorkspaceGraph } from "../types";

interface AITaskWorkspaceProps {
  workspaceGraph: WorkspaceGraph;
  entryPoints: AITaskEntryPoint[];
  executionState: {
    status: "idle" | "running" | "succeeded" | "failed";
    error: string | null;
    result: AITaskExecutionResult | null;
    entryId?: string | null;
  };
  onLaunchEntryPoint: (entry: AITaskEntryPoint) => void;
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

function getSuggestionDocumentLabel(suggestion: AIDraftSuggestion, workspaceGraph: WorkspaceGraph) {
  return (
    workspaceGraph.documents.find((document) => document.id === suggestion.documentId)?.title ??
    suggestion.documentId
  );
}

export function AITaskWorkspace({
  workspaceGraph,
  entryPoints,
  executionState,
  onLaunchEntryPoint,
}: AITaskWorkspaceProps) {
  const workspaceEntries = entryPoints.filter((entry) => entry.scope === "workspace");
  const documentEntries = entryPoints.filter((entry) => entry.scope === "document");
  const publishEntries = entryPoints.filter((entry) => entry.scope === "publish");
  const recentSuggestions = [...workspaceGraph.aiDraftSuggestions]
    .sort(
      (left, right) =>
        new Date(right.lifecycle.generatedAt).getTime() -
        new Date(left.lifecycle.generatedAt).getTime(),
    )
    .slice(0, 4);

  return (
    <section className="ai-workspace">
      <div className="publish-header">
        <article className="hero-card">
          <p className="eyebrow">AI Harness</p>
          <h3>
            Launch AI work from the same workspace and document contexts that own the source of
            truth.
          </h3>
          <p>
            Entry points stay tied to selected documents, linked dependencies, and publish review so
            AI drafting remains discoverable without becoming the system of record.
          </p>

          <div className="document-summary-strip" aria-label="AI task metrics">
            <div>
              <strong>{entryPoints.length}</strong>
              <span>Visible entry points</span>
            </div>
            <div>
              <strong>{documentEntries.length}</strong>
              <span>Document-scoped actions</span>
            </div>
            <div>
              <strong>{publishEntries.length}</strong>
              <span>Publish-scoped actions</span>
            </div>
            <div>
              <strong>{workspaceGraph.aiDraftSuggestions.length}</strong>
              <span>Existing AI drafts</span>
            </div>
          </div>
        </article>

        <article className="status-card">
          <p className="eyebrow">Architecture Notes</p>
          <div className="note-stack">
            <p>
              AI actions are launched from app-owned workspace context, not directly from GitHub
              state.
            </p>
            <p>
              Every task remains scoped to internal workspace documents and preserved review
              relationships.
            </p>
            <p>
              Codex and Claude can both fit this launch model without changing workspace navigation.
            </p>
          </div>
        </article>
      </div>

      <div className="ai-workspace-grid">
        <article className="detail-card">
          <div className="editor-pane-header">
            <div>
              <p className="eyebrow">Document Entry Points</p>
              <h3>Drafting and review support</h3>
            </div>
            <span className="queue-chip">{documentEntries.length} tasks</span>
          </div>

          <AITaskEntryPointList
            emptyMessage="Select or create a document to expose document-level AI task entry points."
            entries={documentEntries}
            onLaunchEntryPoint={onLaunchEntryPoint}
          />
        </article>

        <article className="detail-card">
          <div className="editor-pane-header">
            <div>
              <p className="eyebrow">Publish Entry Points</p>
              <h3>Rationale and release capture</h3>
            </div>
            <span className="queue-chip">{publishEntries.length} tasks</span>
          </div>

          <AITaskEntryPointList
            emptyMessage="Prepare a publish batch to expose publish-specific AI drafting actions."
            entries={publishEntries}
            onLaunchEntryPoint={onLaunchEntryPoint}
          />
        </article>

        <article className="detail-card">
          <div className="editor-pane-header">
            <div>
              <p className="eyebrow">Workspace Entry Points</p>
              <h3>Shared launch surfaces</h3>
            </div>
            <span className="queue-chip">{workspaceEntries.length} tasks</span>
          </div>

          <AITaskEntryPointList
            emptyMessage="No workspace-wide AI task entry points are defined yet."
            entries={workspaceEntries}
            onLaunchEntryPoint={onLaunchEntryPoint}
          />
        </article>

        <article className="detail-card">
          <div className="editor-pane-header">
            <div>
              <p className="eyebrow">Recent Drafts</p>
              <h3>Existing AI output in this workspace</h3>
            </div>
            <span className="queue-chip">{recentSuggestions.length} shown</span>
          </div>

          <div className="ai-suggestion-list">
            {recentSuggestions.map((suggestion) => (
              <article key={suggestion.id} className="approval-card">
                <div className="document-row-topline">
                  <span className="detail-pill">{suggestion.provider}</span>
                  <span className="queue-chip">{suggestion.kind.replace(/_/g, " ")}</span>
                </div>
                <strong>{suggestion.promptLabel}</strong>
                <p className="muted">{suggestion.summary}</p>
                <p className="muted">
                  {getSuggestionDocumentLabel(suggestion, workspaceGraph)} • generated{" "}
                  {formatTimestamp(suggestion.lifecycle.generatedAt)}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="detail-card">
          <div className="editor-pane-header">
            <div>
              <p className="eyebrow">Live Execution</p>
              <h3>Codex and Claude adapter output</h3>
            </div>
            <span className="queue-chip">{executionState.status}</span>
          </div>

          {executionState.status === "idle" ? (
            <p className="muted">Launch an AI entry point to run the real local adapter.</p>
          ) : null}

          {executionState.status === "running" ? (
            <p className="muted">
              Running {executionState.entryId ?? "AI task"} through the local provider adapter.
            </p>
          ) : null}

          {executionState.status === "failed" ? (
            <div className="note-stack">
              <p className="muted">Execution failed.</p>
              <p className="muted">{executionState.error}</p>
            </div>
          ) : null}

          {executionState.status === "succeeded" && executionState.result ? (
            <div className="note-stack">
              <p>
                {executionState.result.provider} • {executionState.result.promptLabel}
              </p>
              <p className="muted">
                Completed {formatTimestamp(executionState.result.completedAt)} in{" "}
                <code>{executionState.result.workingDirectory}</code>
              </p>
              <pre className="markdown-code-block">{executionState.result.output}</pre>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
