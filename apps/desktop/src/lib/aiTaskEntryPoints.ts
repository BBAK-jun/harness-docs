import type {
  AIDraftSuggestion,
  AIDraftSuggestionKind,
  AIProvider,
  AITaskEntryPoint,
  AITaskEntryPointContext,
  AuthoringIntent,
  PublishRecord,
  WorkspaceDocument,
  WorkspaceGraph
} from "../types";

interface BuildAITaskEntryPointsOptions {
  workspaceGraph: WorkspaceGraph;
  activeDocument: WorkspaceDocument | null;
  preferredProvider: AIProvider;
  activeMembershipId: string | null;
}

interface CreateEntryOptions {
  id: string;
  workspaceGraph: WorkspaceGraph;
  provider: AIProvider;
  kind: AIDraftSuggestionKind;
  scope: AITaskEntryPoint["scope"];
  discoverableFrom: AITaskEntryPointContext[];
  title: string;
  description: string;
  triggerLabel: string;
  contextLabel: string;
  suggestedIntent: AuthoringIntent;
  document?: WorkspaceDocument | null;
  publishRecord?: PublishRecord | null;
  referenceDocumentIds?: string[];
  invalidatedByDocumentIds?: string[];
  existingSuggestions?: AIDraftSuggestion[];
}

function createEntry({
  id,
  workspaceGraph,
  provider,
  kind,
  scope,
  discoverableFrom,
  title,
  description,
  triggerLabel,
  contextLabel,
  suggestedIntent,
  document = null,
  publishRecord = null,
  referenceDocumentIds = [],
  invalidatedByDocumentIds = [],
  existingSuggestions = []
}: CreateEntryOptions): AITaskEntryPoint {
  return {
    id,
    workspaceId: workspaceGraph.workspace.id,
    documentId: document?.id ?? null,
    publishRecordId: publishRecord?.id ?? null,
    scope,
    discoverableFrom,
    provider,
    kind,
    title,
    description,
    triggerLabel,
    contextLabel,
    suggestedIntent,
    referenceDocumentIds,
    invalidatedByDocumentIds,
    existingSuggestionIds: existingSuggestions.map((suggestion) => suggestion.id)
  };
}

function getExistingSuggestionsForDocument(
  workspaceGraph: WorkspaceGraph,
  document: WorkspaceDocument
) {
  return workspaceGraph.aiDraftSuggestions.filter((suggestion) =>
    document.aiDraftSuggestionIds.includes(suggestion.id)
  );
}

function getDocumentInvalidationIds(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.invalidations.map(
    (invalidation) => invalidation.sourceDocumentId
  );
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export function buildAITaskEntryPoints({
  workspaceGraph,
  activeDocument,
  preferredProvider,
  activeMembershipId
}: BuildAITaskEntryPointsOptions): AITaskEntryPoint[] {
  const publishRecord = workspaceGraph.publishRecords[0] ?? null;
  const staleDocuments = publishRecord
    ? workspaceGraph.documents.filter((document) =>
        publishRecord.staleDocumentIds.includes(document.id)
      )
    : [];
  const candidateDocument =
    activeDocument ??
    staleDocuments[0] ??
    workspaceGraph.documents.find((document) => document.aiDraftSuggestionIds.length > 0) ??
    workspaceGraph.documents[0] ??
    null;
  const documentSuggestions = candidateDocument
    ? getExistingSuggestionsForDocument(workspaceGraph, candidateDocument)
    : [];
  const unresolvedApprovals = candidateDocument
    ? workspaceGraph.approvals.filter(
        (approval) =>
          approval.documentId === candidateDocument.id &&
          ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state)
      )
    : [];
  const publishMemoSuggestion =
    publishRecord?.memoSuggestionId != null
      ? workspaceGraph.aiDraftSuggestions.find(
          (suggestion) => suggestion.id === publishRecord.memoSuggestionId
        ) ?? null
      : null;
  const publishReferenceDocumentIds = dedupe(
    staleDocuments.flatMap((document) => [
      document.id,
      ...document.linkedDocumentIds,
      ...getDocumentInvalidationIds(document)
    ])
  );
  const entries: AITaskEntryPoint[] = [];

  if (candidateDocument) {
    entries.push(
      createEntry({
        id: `ai-entry-${workspaceGraph.workspace.id}-workspace-seed`,
        workspaceGraph,
        provider: preferredProvider,
        kind: "document_content",
        scope: "workspace",
        discoverableFrom: ["workspace_overview"],
        title: "Draft the next role-specific doc",
        description:
          "Launch a template-aware drafting task from workspace context before you commit to a specific PRD, UX flow, spec, or policy document.",
        triggerLabel: "Open AI intake",
        contextLabel: `${workspaceGraph.documents.length} existing docs in workspace`,
        suggestedIntent: "create_document",
        document: candidateDocument,
        referenceDocumentIds: dedupe(
          workspaceGraph.documents.slice(0, 4).map((document) => document.id)
        ),
        invalidatedByDocumentIds: [],
        existingSuggestions: []
      })
    );

    entries.push(
      createEntry({
        id: `ai-entry-${candidateDocument.id}-content`,
        workspaceGraph,
        provider: preferredProvider,
        kind: "document_content",
        scope: "document",
        discoverableFrom: ["document_library", "document_workspace", "workspace_overview"],
        title: `Draft ${candidateDocument.type} content`,
        description:
          "Use internal workspace documents to refine markdown sections while keeping the selected document as the source of truth.",
        triggerLabel: "Draft content",
        contextLabel: `${candidateDocument.title} · selected document`,
        suggestedIntent: "revise_document",
        document: candidateDocument,
        referenceDocumentIds: dedupe([
          ...candidateDocument.linkedDocumentIds,
          ...getDocumentInvalidationIds(candidateDocument)
        ]),
        invalidatedByDocumentIds: getDocumentInvalidationIds(candidateDocument),
        existingSuggestions: documentSuggestions.filter(
          (suggestion) => suggestion.kind === "document_content"
        )
      })
    );

    entries.push(
      createEntry({
        id: `ai-entry-${candidateDocument.id}-links`,
        workspaceGraph,
        provider: preferredProvider === "Codex" ? "Claude" : preferredProvider,
        kind: "document_links",
        scope: "document",
        discoverableFrom: ["document_library", "document_workspace", "workspace_overview"],
        title: "Suggest linked documents",
        description:
          "Check internal document coverage before another review cycle so missing dependencies are visible before publish.",
        triggerLabel: "Suggest links",
        contextLabel: `${candidateDocument.title} · linked-doc review`,
        suggestedIntent: "resolve_review",
        document: candidateDocument,
        referenceDocumentIds: dedupe([
          candidateDocument.id,
          ...candidateDocument.linkedDocumentIds,
          ...getDocumentInvalidationIds(candidateDocument)
        ]),
        invalidatedByDocumentIds: getDocumentInvalidationIds(candidateDocument),
        existingSuggestions: documentSuggestions.filter(
          (suggestion) => suggestion.kind === "document_links"
        )
      })
    );

    entries.push(
      createEntry({
        id: `ai-entry-${candidateDocument.id}-approvers`,
        workspaceGraph,
        provider: "Claude",
        kind: "approver_suggestions",
        scope: "document",
        discoverableFrom: ["document_workspace", "workspace_overview"],
        title: "Suggest approvers",
        description:
          "Draft app-native reviewer candidates from linked policy and spec context without relying on GitHub as approval authority.",
        triggerLabel: "Suggest approvers",
        contextLabel: `${candidateDocument.title} · ${unresolvedApprovals.length} unresolved approvals`,
        suggestedIntent: "resolve_review",
        document: candidateDocument,
        referenceDocumentIds: dedupe([
          ...candidateDocument.linkedDocumentIds,
          ...getDocumentInvalidationIds(candidateDocument)
        ]),
        invalidatedByDocumentIds: getDocumentInvalidationIds(candidateDocument),
        existingSuggestions: documentSuggestions.filter(
          (suggestion) => suggestion.kind === "approver_suggestions"
        )
      })
    );
  }

  if (publishRecord) {
    entries.push(
      createEntry({
        id: `ai-entry-${publishRecord.id}-memo`,
        workspaceGraph,
        provider: publishMemoSuggestion?.provider ?? preferredProvider,
        kind: "publish_memo",
        scope: "publish",
        discoverableFrom: ["publish_flow", "workspace_overview"],
        title: "Draft publish memo",
        description:
          "Prepare stale rationale, unresolved approvals, and invalidations before GitHub branch, commit, and pull request automation starts.",
        triggerLabel: "Draft publish memo",
        contextLabel: `${publishRecord.artifacts.length} artifacts in current publish batch`,
        suggestedIntent: "prepare_publish",
        publishRecord,
        document: candidateDocument,
        referenceDocumentIds: publishReferenceDocumentIds,
        invalidatedByDocumentIds: dedupe(
          staleDocuments.flatMap((document) => getDocumentInvalidationIds(document))
        ),
        existingSuggestions: publishMemoSuggestion ? [publishMemoSuggestion] : []
      })
    );
  }

  return entries.filter((entry) => activeMembershipId || entry.scope !== "document");
}

export function filterAITaskEntryPointsForContext(
  entries: AITaskEntryPoint[],
  context: AITaskEntryPointContext,
  documentId?: string | null
) {
  return entries.filter((entry) => {
    if (!entry.discoverableFrom.includes(context)) {
      return false;
    }

    if (!documentId) {
      return true;
    }

    return !entry.documentId || entry.documentId === documentId;
  });
}
