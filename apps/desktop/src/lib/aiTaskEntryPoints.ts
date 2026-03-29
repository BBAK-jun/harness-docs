import type {
  AIDraftSuggestion,
  AIDraftSuggestionKind,
  AIProvider,
  AuthoringIntent,
  PublishRecord,
  WorkspaceDocument,
  WorkspaceGraph,
} from "../types/contracts";
import type { AITaskEntryPoint, AITaskEntryPointContext } from "../types/domain-ui";

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
  existingSuggestions = [],
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
    existingSuggestionIds: existingSuggestions.map((suggestion) => suggestion.id),
  };
}

function getExistingSuggestionsForDocument(
  workspaceGraph: WorkspaceGraph,
  document: WorkspaceDocument,
) {
  return workspaceGraph.aiDraftSuggestions.filter((suggestion) =>
    document.aiDraftSuggestionIds.includes(suggestion.id),
  );
}

function getDocumentInvalidationIds(document: WorkspaceDocument) {
  return document.lifecycle.review.freshness.invalidations.map(
    (invalidation) => invalidation.sourceDocumentId,
  );
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export function buildAITaskEntryPoints({
  workspaceGraph,
  activeDocument,
  preferredProvider,
  activeMembershipId,
}: BuildAITaskEntryPointsOptions): AITaskEntryPoint[] {
  const publishRecord = workspaceGraph.publishRecords[0] ?? null;
  const staleDocuments = publishRecord
    ? workspaceGraph.documents.filter((document) =>
        publishRecord.staleDocumentIds.includes(document.id),
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
          ["pending", "changes_requested", "invalidated"].includes(approval.lifecycle.state),
      )
    : [];
  const publishMemoSuggestion =
    publishRecord?.memoSuggestionId != null
      ? (workspaceGraph.aiDraftSuggestions.find(
          (suggestion) => suggestion.id === publishRecord.memoSuggestionId,
        ) ?? null)
      : null;
  const publishReferenceDocumentIds = dedupe(
    staleDocuments.flatMap((document) => [
      document.id,
      ...document.linkedDocumentIds,
      ...getDocumentInvalidationIds(document),
    ]),
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
        title: "다음 역할별 문서 초안 작성",
        description:
          "특정 PRD, UX 흐름, 명세, 정책 문서로 확정하기 전에 워크스페이스 맥락에서 템플릿 기반 초안 작업을 시작합니다.",
        triggerLabel: "AI 입력 열기",
        contextLabel: `워크스페이스 문서 ${workspaceGraph.documents.length}개`,
        suggestedIntent: "create_document",
        document: candidateDocument,
        referenceDocumentIds: dedupe(
          workspaceGraph.documents.slice(0, 4).map((document) => document.id),
        ),
        invalidatedByDocumentIds: [],
        existingSuggestions: [],
      }),
    );

    entries.push(
      createEntry({
        id: `ai-entry-${candidateDocument.id}-content`,
        workspaceGraph,
        provider: preferredProvider,
        kind: "document_content",
        scope: "document",
        discoverableFrom: ["document_library", "document_workspace", "workspace_overview"],
        title: `${candidateDocument.type} 내용 초안 작성`,
        description:
          "선택한 문서를 기준 원본으로 유지하면서 내부 워크스페이스 문서를 바탕으로 마크다운 섹션을 다듬습니다.",
        triggerLabel: "내용 초안 작성",
        contextLabel: `${candidateDocument.title} · 선택된 문서`,
        suggestedIntent: "revise_document",
        document: candidateDocument,
        referenceDocumentIds: dedupe([
          ...candidateDocument.linkedDocumentIds,
          ...getDocumentInvalidationIds(candidateDocument),
        ]),
        invalidatedByDocumentIds: getDocumentInvalidationIds(candidateDocument),
        existingSuggestions: documentSuggestions.filter(
          (suggestion) => suggestion.kind === "document_content",
        ),
      }),
    );

    entries.push(
      createEntry({
        id: `ai-entry-${candidateDocument.id}-links`,
        workspaceGraph,
        provider: preferredProvider === "Codex" ? "Claude" : preferredProvider,
        kind: "document_links",
        scope: "document",
        discoverableFrom: ["document_library", "document_workspace", "workspace_overview"],
        title: "연결 문서 제안",
        description:
          "다음 리뷰 사이클 전에 내부 문서 커버리지를 점검해, 발행 전에 빠진 의존 문서가 보이도록 합니다.",
        triggerLabel: "연결 제안",
        contextLabel: `${candidateDocument.title} · 연결 문서 검토`,
        suggestedIntent: "resolve_review",
        document: candidateDocument,
        referenceDocumentIds: dedupe([
          candidateDocument.id,
          ...candidateDocument.linkedDocumentIds,
          ...getDocumentInvalidationIds(candidateDocument),
        ]),
        invalidatedByDocumentIds: getDocumentInvalidationIds(candidateDocument),
        existingSuggestions: documentSuggestions.filter(
          (suggestion) => suggestion.kind === "document_links",
        ),
      }),
    );

    entries.push(
      createEntry({
        id: `ai-entry-${candidateDocument.id}-approvers`,
        workspaceGraph,
        provider: "Claude",
        kind: "approver_suggestions",
        scope: "document",
        discoverableFrom: ["document_workspace", "workspace_overview"],
        title: "승인자 제안",
        description:
          "GitHub를 승인 권한으로 의존하지 않고, 연결된 정책/명세 맥락에서 앱 내부 리뷰어 후보를 제안합니다.",
        triggerLabel: "승인자 제안",
        contextLabel: `${candidateDocument.title} · 미해결 승인 ${unresolvedApprovals.length}건`,
        suggestedIntent: "resolve_review",
        document: candidateDocument,
        referenceDocumentIds: dedupe([
          ...candidateDocument.linkedDocumentIds,
          ...getDocumentInvalidationIds(candidateDocument),
        ]),
        invalidatedByDocumentIds: getDocumentInvalidationIds(candidateDocument),
        existingSuggestions: documentSuggestions.filter(
          (suggestion) => suggestion.kind === "approver_suggestions",
        ),
      }),
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
        title: "발행 메모 초안 작성",
        description:
          "GitHub 브랜치, 커밋, PR 자동화가 시작되기 전에 stale 사유, 미해결 승인, 무효화 내역을 정리합니다.",
        triggerLabel: "발행 메모 초안 작성",
        contextLabel: `현재 발행 배치 아티팩트 ${publishRecord.artifacts.length}개`,
        suggestedIntent: "prepare_publish",
        publishRecord,
        document: candidateDocument,
        referenceDocumentIds: publishReferenceDocumentIds,
        invalidatedByDocumentIds: dedupe(
          staleDocuments.flatMap((document) => getDocumentInvalidationIds(document)),
        ),
        existingSuggestions: publishMemoSuggestion ? [publishMemoSuggestion] : [],
      }),
    );
  }

  return entries.filter((entry) => activeMembershipId || entry.scope !== "document");
}

export function filterAITaskEntryPointsForContext(
  entries: AITaskEntryPoint[],
  context: AITaskEntryPointContext,
  documentId?: string | null,
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
