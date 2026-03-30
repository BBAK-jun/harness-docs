import { startTransition, useMemo, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Eye,
  FilePenLine,
  GitBranch,
  Info,
  Link2,
  LoaderCircle,
  Lock,
  MessageSquareMore,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useClientActivityLog } from "@/components/ClientActivityLogProvider";
import {
  EditorAIAssistantDock,
  type EditorAIAssistantMessage,
} from "@/components/EditorAIAssistantDock";
import { CompactPrimaryPageAction, CompactSecondaryPageAction } from "@/components/pageActions";
import {
  InsetPanel,
  NoticePanel,
  PanelCard,
  PanelCardHeader,
  PanelEmptyState,
} from "@/components/pagePanels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isAIProviderAvailable, listAvailableAIProviders } from "@/lib/aiProviderAvailability";
import { cn } from "@/lib/utils";
import { useCleanup } from "../hooks/useCleanup";
import { useUpdateEffect } from "../hooks/useUpdateEffect";
import type { AITaskRunningExecution } from "../domain/aiTasks";
import { buildAITaskEntryPoints } from "../lib/aiTaskEntryPoints";
import { buildAITaskPrompt } from "../lib/runtimePayloads";
import { desktopMutationKeys } from "../queries/queryKeys";
import type { AITaskEntryPoint } from "../types/domain-ui";
import type { AppPageProps } from "./pageUtils";
import {
  EmptyStateCard,
  formatDateTime,
  statusBadgeVariant,
  translateDocumentType,
  translateLabel,
} from "./pageUtils";

type EditorTab = "preview" | "edit" | "links" | "comments" | "info";
const assistantPendingMessage = "응답을 준비하고 있습니다...";
const assistantStderrLabel = "stderr";
type AssistantPromptFormValues = {
  prompt: string;
};

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entry, index) => entry === right[index]);
}

function getFieldError(errors: unknown[]) {
  const firstError = errors[0];

  return typeof firstError === "string" ? firstError : null;
}

export function EditorPage({ app }: AppPageProps) {
  const { logEvent } = useClientActivityLog();
  const [activeTab, setActiveTab] = useState<EditorTab>("edit");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [selectedAssistantEntryId, setSelectedAssistantEntryId] = useState<string | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<EditorAIAssistantMessage[]>([]);
  const activeAssistantTaskRef = useRef<AITaskRunningExecution | null>(null);
  const document = app.activeDocument;
  const graph = app.activeWorkspaceGraph;

  const assistantEntries = useMemo(() => {
    if (!graph || !document) {
      return [];
    }

    return buildAITaskEntryPoints({
      workspaceGraph: graph,
      activeDocument: document,
      preferredProvider: app.preferredAIProvider,
      activeMembershipId: app.activeMembershipId,
    }).filter(
      (entry) =>
        entry.scope === "document" &&
        entry.documentId === document.id &&
        isAIProviderAvailable(app.desktopShell, entry.provider),
    );
  }, [app.activeMembershipId, app.desktopShell, app.preferredAIProvider, document, graph]);

  useCleanup(() => {
    if (activeAssistantTaskRef.current) {
      void activeAssistantTaskRef.current.cancel();
      activeAssistantTaskRef.current = null;
    }
  });

  const selectedAssistantEntry =
    assistantEntries.find((entry) => entry.id === selectedAssistantEntryId) ??
    assistantEntries[0] ??
    null;
  const availableAIProviderCount = listAvailableAIProviders(app.desktopShell).length;
  const assistantEmptyStateMessage =
    availableAIProviderCount === 0
      ? "Codex 또는 Claude Code CLI가 이 환경에서 실행 준비되지 않았습니다. 설치 상태와 로그인 상태를 확인하세요."
      : "사용 가능한 AI 작업이 없습니다.";
  const assistantForm = useForm({
    defaultValues: {
      prompt: "",
    } satisfies AssistantPromptFormValues,
    onSubmit: async ({ value }) => {
      const prompt = value.prompt.trim();

      if (!prompt || !selectedAssistantEntry) {
        return;
      }

      const assistantMessageId = `assistant-${Date.now()}`;
      const stderrMessageId = `${assistantMessageId}-stderr`;
      const assistantLabel = selectedAssistantEntry.title;

      setAssistantMessages((current) => [
        ...current,
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: prompt,
          format: "plain",
        },
        {
          id: assistantMessageId,
          role: "assistant",
          content: assistantPendingMessage,
          format: "markdown",
          isStreaming: true,
          label: assistantLabel,
          tone: "default",
        },
      ]);
      assistantForm.reset();

      try {
        const result = await assistantMutation.mutateAsync({
          entry: selectedAssistantEntry,
          messageId: assistantMessageId,
          prompt,
          stderrMessageId,
        });

        replaceAssistantMessage(assistantMessageId, result.output, {
          format: "markdown",
          isStreaming: false,
          label: result.promptLabel,
          tone: "default",
        });
        finalizeSystemMessage(stderrMessageId, "warning");
      } catch (error) {
        replaceAssistantMessage(
          assistantMessageId,
          error instanceof Error ? error.message : "AI 요청을 처리하지 못했습니다.",
          {
            format: "plain",
            isStreaming: false,
            label: assistantLabel,
            tone: "danger",
          },
        );
        finalizeSystemMessage(stderrMessageId, "danger");
      }
    },
  });

  useUpdateEffect(() => {
    if (activeAssistantTaskRef.current) {
      void activeAssistantTaskRef.current.cancel();
      activeAssistantTaskRef.current = null;
    }

    setSelectedAssistantEntryId(null);
    setAssistantMessages([]);
    assistantForm.reset();
  }, [assistantForm, document?.id]);

  const upsertAssistantMessage = (message: EditorAIAssistantMessage) => {
    startTransition(() => {
      setAssistantMessages((current) =>
        current.some((entry) => entry.id === message.id)
          ? current.map((entry) => (entry.id === message.id ? { ...entry, ...message } : entry))
          : [...current, message],
      );
    });
  };

  const removeAssistantMessage = (messageId: string) => {
    startTransition(() => {
      setAssistantMessages((current) => current.filter((message) => message.id !== messageId));
    });
  };

  const replaceAssistantMessage = (
    messageId: string,
    content: string,
    options: Pick<EditorAIAssistantMessage, "format" | "isStreaming" | "label" | "tone">,
  ) => {
    upsertAssistantMessage({
      id: messageId,
      role: "assistant",
      content,
      ...options,
    });
  };

  const appendAssistantChunk = (
    messageId: string,
    chunk: string,
    fallbackMessage: EditorAIAssistantMessage,
  ) => {
    if (!chunk) {
      return;
    }

    startTransition(() => {
      setAssistantMessages((current) =>
        current.some((message) => message.id === messageId)
          ? current.map((message) => {
              if (message.id !== messageId) {
                return message;
              }

              return {
                ...message,
                content:
                  message.content === assistantPendingMessage
                    ? chunk
                    : `${message.content}${chunk}`,
              };
            })
          : [...current, { ...fallbackMessage, content: chunk }],
      );
    });
  };

  const finalizeSystemMessage = (messageId: string, tone?: EditorAIAssistantMessage["tone"]) => {
    startTransition(() => {
      setAssistantMessages((current) =>
        current.map((message) => {
          if (message.id !== messageId) {
            return message;
          }

          return {
            ...message,
            isStreaming: false,
            tone: tone ?? message.tone,
          };
        }),
      );
    });
  };

  const assistantMutation = useMutation({
    mutationKey: desktopMutationKeys.ai.runEntryPoint(),
    mutationFn: async ({
      entry,
      messageId,
      prompt,
      stderrMessageId,
    }: {
      entry: AITaskEntryPoint;
      messageId: string;
      prompt: string;
      stderrMessageId: string;
    }) => {
      if (!graph) {
        throw new Error("문서 컨텍스트가 준비되지 않았습니다.");
      }

      if (!isAIProviderAvailable(app.desktopShell, entry.provider)) {
        throw new Error(`${entry.provider} CLI를 이 시스템에서 사용할 수 없습니다.`);
      }

      const execution = await app.services.aiTasks.startEntryPoint(
        {
          entry,
          workspaceGraph: graph,
          prompt: [
            buildAITaskPrompt(entry, graph, app.documentDrafts),
            "",
            "# User Request",
            prompt,
            "",
            "Return a practical answer for an in-editor assistant. Explain the change, propose markdown when helpful, and keep it easy to apply manually.",
          ].join("\n"),
        },
        {
          onEvent: (event) => {
            if (event.type === "output" && event.stream === "stdout") {
              appendAssistantChunk(messageId, event.chunk, {
                id: messageId,
                role: "assistant",
                content: "",
                format: "markdown",
                isStreaming: true,
                label: entry.title,
                tone: "default",
              });
            }

            if (event.type === "output" && event.stream === "stderr") {
              appendAssistantChunk(stderrMessageId, event.chunk, {
                id: stderrMessageId,
                role: "system",
                content: "",
                format: "plain",
                isStreaming: true,
                label: assistantStderrLabel,
                tone: "warning",
              });
            }

            if (event.type === "cancelled") {
              removeAssistantMessage(stderrMessageId);
            }
          },
        },
      );

      activeAssistantTaskRef.current = execution;

      try {
        return await execution.result;
      } finally {
        if (activeAssistantTaskRef.current?.taskId === execution.taskId) {
          activeAssistantTaskRef.current = null;
        }
      }
    },
  });

  if (!document || !graph) {
    return (
      <EmptyStateCard
        description="러버블 기준 문서 작업 공간은 문서가 선택돼야 열립니다. 먼저 문서 라이브러리에서 문서를 고르세요."
        title="선택된 문서 없음"
        actions={
          <div className="flex flex-wrap gap-2">
            <CompactPrimaryPageAction
              clientLog="문서 목록으로 이동"
              onClick={() => app.handleAreaChange("documents")}
            >
              문서 목록으로 이동
            </CompactPrimaryPageAction>
            <CompactSecondaryPageAction
              clientLog="대시보드로 이동"
              onClick={() => app.handleAreaChange("dashboard")}
            >
              대시보드로 이동
            </CompactSecondaryPageAction>
          </div>
        }
      />
    );
  }

  const isLockedByActiveMember =
    app.activeDocumentLock?.lifecycle.status === "active" &&
    app.activeDocumentLock.lockedByMembershipId === app.activeMembershipId;
  const originalDocument =
    app.session?.workspaceGraphs
      .find((entry) => entry.workspace.id === document.workspaceId)
      ?.documents.find((entry) => entry.id === document.id) ?? document;
  const linkedDocuments = graph.documents.filter((entry) =>
    document.linkedDocumentIds.includes(entry.id),
  );
  const linkableDocuments = graph.documents.filter((entry) => entry.id !== document.id);
  const commentThreads = graph.commentThreads.filter((thread) => thread.documentId === document.id);
  const approvals = graph.approvals.filter((approval) => approval.documentId === document.id);
  const template = graph.templates.find((entry) => entry.id === document.templateId) ?? null;
  const linkedTypeHints = Array.from(
    new Set(template?.sections.flatMap((section) => section.linkedDocumentTypeHints) ?? []),
  );
  const hasTitleDraft = document.title !== originalDocument.title;
  const hasSourceDraft = app.activeDocumentSource !== originalDocument.markdownSource;
  const hasLinkedDocumentDraft = !areStringArraysEqual(
    document.linkedDocumentIds,
    originalDocument.linkedDocumentIds,
  );
  const changedFieldCount =
    Number(hasTitleDraft) + Number(hasSourceDraft) + Number(hasLinkedDocumentDraft);
  const hasDraftChanges = changedFieldCount > 0;
  const tabs: Array<{ id: EditorTab; label: string; icon: typeof Eye }> = [
    { id: "edit", label: "편집", icon: FilePenLine },
    { id: "preview", label: "미리보기", icon: Eye },
    { id: "links", label: `연결 문서 ${linkedDocuments.length}`, icon: Link2 },
    { id: "comments", label: `댓글 ${commentThreads.length}`, icon: MessageSquareMore },
    { id: "info", label: "정보", icon: Info },
  ];

  const toggleLinkedDocument = (linkedDocumentId: string, nextChecked: boolean) => {
    const nextLinkedDocumentIds = nextChecked
      ? [...document.linkedDocumentIds, linkedDocumentId]
      : document.linkedDocumentIds.filter((entryId) => entryId !== linkedDocumentId);

    app.handleDocumentLinkedDocumentsChange(document, nextLinkedDocumentIds);
  };

  const handleTabChange = (nextTab: string) => {
    if (!tabs.some((tab) => tab.id === nextTab)) {
      return;
    }

    const nextEditorTab = nextTab as EditorTab;
    const tabMeta = tabs.find((tab) => tab.id === nextEditorTab);

    logEvent({
      action: "에디터 탭 CTA 클릭",
      description: tabMeta?.label,
      source: "editor-page",
    });
    setActiveTab(nextEditorTab);
  };

  return (
    <>
      <assistantForm.Field
        name="prompt"
        validators={{
          onChange: ({ value }) =>
            value.trim().length > 0 ? undefined : "AI 요청 내용을 입력하세요.",
        }}
      >
        {(field) => (
          <EditorAIAssistantDock
            canSubmit={
              !!selectedAssistantEntry &&
              !assistantMutation.isPending &&
              field.state.value.trim().length > 0
            }
            entries={assistantEntries}
            emptyStateMessage={assistantEmptyStateMessage}
            isOpen={isAssistantOpen}
            isPending={assistantMutation.isPending}
            isVisible={activeTab === "edit"}
            messages={assistantMessages}
            onClose={() => setIsAssistantOpen(false)}
            onPromptBlur={field.handleBlur}
            onPromptChange={field.handleChange}
            onSelectEntry={setSelectedAssistantEntryId}
            onSubmit={() => void assistantForm.handleSubmit()}
            onToggleOpen={() => setIsAssistantOpen((current) => !current)}
            prompt={field.state.value}
            promptError={field.state.meta.isTouched ? getFieldError(field.state.meta.errors) : null}
            selectedEntry={selectedAssistantEntry}
          />
        )}
      </assistantForm.Field>
      <PanelCard>
        <PanelCardHeader className="px-5 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{translateDocumentType(document.type)}</Badge>
              <Badge variant="secondary">{translateLabel(document.lifecycle.review.status)}</Badge>
              <Badge variant={statusBadgeVariant(document.lifecycle.review.freshness.status)}>
                {translateLabel(document.lifecycle.review.freshness.status)}
              </Badge>
              <Badge variant={isLockedByActiveMember ? "success" : "warning"}>
                {isLockedByActiveMember ? "편집 잠금 보유 중" : "잠금 필요"}
              </Badge>
              {hasDraftChanges ? (
                <Badge variant="info">세션 초안 {changedFieldCount}개</Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <CompactSecondaryPageAction
                clientLog="AI 지원 이동"
                onClick={() => app.handleAreaChange("ai")}
              >
                <Sparkles />
                AI 지원
              </CompactSecondaryPageAction>
              <CompactSecondaryPageAction
                clientLog="발행 이동"
                onClick={() => app.handleAreaChange("publish")}
              >
                <GitBranch />
                발행
              </CompactSecondaryPageAction>
              {isLockedByActiveMember ? (
                <CompactSecondaryPageAction
                  clientLog="편집 잠금 해제"
                  onClick={() => app.handleReleaseEditing(document)}
                >
                  잠금 해제
                </CompactSecondaryPageAction>
              ) : (
                <CompactPrimaryPageAction
                  clientLog="편집 시작"
                  onClick={() => app.handleStartEditing(document)}
                >
                  <FilePenLine />
                  편집 시작
                </CompactPrimaryPageAction>
              )}
            </div>
          </div>
        </PanelCardHeader>

        <InsetPanel className="rounded-none border-x-0 border-t-0 px-5 py-3" padding="none">
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <Lock className="size-4" />
              <span>
                {app.activeDocumentLock
                  ? `잠금 상태 ${translateLabel(app.activeDocumentLock.lifecycle.status)} · 마지막 활동 ${formatDateTime(app.activeDocumentLock.lastActivityAt)}`
                  : "이 문서에는 현재 활성 잠금이 없습니다."}
              </span>
            </div>
            <span>연결 문서 {linkedDocuments.length}개</span>
            <span>댓글 스레드 {commentThreads.length}개</span>
            <span>승인 항목 {approvals.length}개</span>
            <span>최종 업데이트 {formatDateTime(document.lifecycle.updatedAt)}</span>
          </div>
        </InsetPanel>

        <Tabs onValueChange={handleTabChange} value={activeTab}>
          <div className="border-b border-[var(--border)] px-5">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0 text-[var(--muted-foreground)]">
              {tabs.map((tab) => (
                <TabsTrigger
                  className="inline-flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-[var(--foreground)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-none"
                  key={tab.id}
                  value={tab.id}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent className="mt-0" value="edit">
            <div className="grid gap-5 p-5">
              <InsetPanel className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">마크다운 편집</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    이 탭은 제목과 마크다운 작성만 다룹니다. 미리보기, 연결 문서, 상태 정보는 다른
                    탭으로 분리했습니다.
                  </p>
                </div>
                <Button
                  clientLog="문서 초안 초기화"
                  disabled={!hasDraftChanges}
                  onClick={() => app.handleResetDocumentDraft(document)}
                  size="sm"
                  type="button"
                  variant="softOutline"
                >
                  <RotateCcw />
                  초안 초기화
                </Button>
              </InsetPanel>

              <InsetPanel className="grid gap-2.5">
                <Label htmlFor="document-title">문서 제목</Label>
                <Input
                  disabled={!isLockedByActiveMember}
                  id="document-title"
                  onChange={(event) => app.handleDocumentTitleChange(document, event.target.value)}
                  placeholder="문서 제목"
                  value={document.title}
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  {isLockedByActiveMember
                    ? hasDraftChanges
                      ? `세션 초안 ${changedFieldCount}개가 반영되고 있습니다.`
                      : "편집 잠금을 보유 중입니다."
                    : "편집 잠금을 확보해야 수정할 수 있습니다."}
                </p>
              </InsetPanel>

              <InsetPanel className="overflow-hidden" padding="none">
                <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="border-b border-[var(--border)] xl:border-b-0 xl:border-r">
                    <div className="border-b border-[var(--border)] px-5 py-4">
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">
                        마크다운 원본
                      </h3>
                    </div>
                    <div className="p-4">
                      <Textarea
                        className="min-h-[720px] resize-y border-0 bg-transparent font-mono text-[13px] leading-6 shadow-none focus-visible:ring-0"
                        disabled={!isLockedByActiveMember}
                        onChange={(event) =>
                          app.handleDocumentSourceChange(document, event.target.value)
                        }
                        value={app.activeDocumentSource}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="border-b border-[var(--border)] px-5 py-4">
                      <div className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                        <Eye className="size-4" />
                        실시간 미리보기
                      </div>
                    </div>
                    <div className="prose-harness min-h-[720px] overflow-auto px-5 py-4">
                      {app.activeDocumentSource.trim().length > 0 ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {app.activeDocumentSource}
                        </ReactMarkdown>
                      ) : (
                        <PanelEmptyState
                          description="본문이 비어 있습니다. 왼쪽 편집기에서 내용을 입력하면 바로 렌더링됩니다."
                          title="미리볼 내용 없음"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </InsetPanel>
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="preview">
            <div className="p-5">
              <InsetPanel className="overflow-hidden" padding="none">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                    <Eye className="size-4" />
                    마크다운 미리보기
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    이 탭은 렌더 결과 확인만 담당합니다. 수정은 편집 탭에서 진행하세요.
                  </p>
                </div>
                <div className="prose-harness min-h-[640px] px-5 py-5">
                  {app.activeDocumentSource.trim().length > 0 ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {app.activeDocumentSource}
                    </ReactMarkdown>
                  ) : (
                    <PanelEmptyState
                      description="본문이 비어 있습니다. 편집 탭에서 문서를 입력하세요."
                      title="미리볼 내용 없음"
                    />
                  )}
                </div>
              </InsetPanel>
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="links">
            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="flex flex-col gap-4">
                <NoticePanel
                  badge={`${document.linkedDocumentIds.length}개 연결`}
                  description="이 탭은 문서 관계 관리 전용입니다. 어떤 문서를 같이 묶을지 여기서만 조정합니다."
                  title="연결 문서 관리"
                  tone="default"
                />

                <InsetPanel className="overflow-hidden" padding="none">
                  <div className="border-b border-[var(--border)] px-5 py-4">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">현재 연결</h3>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {linkedDocuments.length === 0 ? (
                      <PanelEmptyState
                        description="아직 연결된 문서가 없습니다. 오른쪽 목록에서 필요한 문서를 선택하세요."
                        title="연결 문서 없음"
                      />
                    ) : (
                      linkedDocuments.map((entry) => (
                        <button
                          className="block w-full px-5 py-4 text-left transition-colors hover:bg-[var(--secondary)]/55"
                          key={entry.id}
                          onClick={() => {
                            logEvent({
                              action: "연결 문서 CTA 클릭",
                              description: entry.title,
                              source: "editor-page",
                            });
                            app.handleDocumentSelect(entry.id);
                          }}
                          type="button"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-[var(--foreground)]">{entry.title}</p>
                            <Badge variant="outline">{translateDocumentType(entry.type)}</Badge>
                            <Badge
                              variant={statusBadgeVariant(entry.lifecycle.review.freshness.status)}
                            >
                              {translateLabel(entry.lifecycle.review.freshness.status)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                            {entry.prePublication.summary}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </InsetPanel>
              </div>

              <InsetPanel className="overflow-hidden" padding="none">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">연결 후보</h3>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        영향 문서를 선택하면 리뷰와 발행 컨텍스트에 함께 반영됩니다.
                      </p>
                    </div>
                    {linkedTypeHints.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {linkedTypeHints.map((type) => (
                          <Badge key={type} variant="info">
                            추천 {translateDocumentType(type)}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {linkableDocuments.length === 0 ? (
                    <PanelEmptyState
                      description="현재 워크스페이스에 연결 가능한 다른 문서가 없습니다."
                      title="연결 후보 없음"
                    />
                  ) : (
                    linkableDocuments.map((entry) => {
                      const isChecked = document.linkedDocumentIds.includes(entry.id);
                      const isRecommended = linkedTypeHints.includes(entry.type);

                      return (
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors",
                            isChecked
                              ? "bg-[var(--secondary)]/55"
                              : "hover:bg-[var(--secondary)]/35",
                            !isLockedByActiveMember && "cursor-not-allowed opacity-75",
                          )}
                          key={entry.id}
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={!isLockedByActiveMember}
                            onCheckedChange={(checked) =>
                              toggleLinkedDocument(entry.id, checked === true)
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-[var(--foreground)]">{entry.title}</p>
                              <Badge variant="outline">{translateDocumentType(entry.type)}</Badge>
                              <Badge
                                variant={statusBadgeVariant(
                                  entry.lifecycle.review.freshness.status,
                                )}
                              >
                                {translateLabel(entry.lifecycle.review.freshness.status)}
                              </Badge>
                              {isRecommended ? <Badge variant="info">추천</Badge> : null}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                              {entry.prePublication.summary}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </InsetPanel>
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="comments">
            <div className="p-5">
              <InsetPanel padding="none">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--foreground)]">대화</h3>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        이 탭은 리뷰 대화만 보여줍니다. 승인 상태는 별도 승인 화면에서 확인합니다.
                      </p>
                    </div>
                    <CompactSecondaryPageAction
                      clientLog="승인 화면 이동"
                      onClick={() => app.handleAreaChange("approvals")}
                    >
                      승인 화면
                    </CompactSecondaryPageAction>
                  </div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {commentThreads.length === 0 ? (
                    <PanelEmptyState
                      description="리뷰 대화가 아직 없습니다. 블록 댓글을 추가하면 리뷰 페이지와 이 탭이 함께 업데이트됩니다."
                      title="댓글 스레드 없음"
                    />
                  ) : (
                    commentThreads.map((thread) => (
                      <div className="px-5 py-4" key={thread.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusBadgeVariant(thread.lifecycle.status)}>
                            {translateLabel(thread.lifecycle.status)}
                          </Badge>
                          <p className="font-medium text-[var(--foreground)]">
                            {thread.anchor.headingPath.join(" / ")}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {thread.anchor.excerpt}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </InsetPanel>
            </div>
          </TabsContent>

          <TabsContent className="mt-0" value="info">
            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
              <div className="flex flex-col gap-4">
                <NoticePanel
                  badge={translateLabel(document.lifecycle.review.freshness.status)}
                  description="편집에 직접 필요하지 않은 상태 정보와 문서 메타는 이 탭으로 모았습니다."
                  title="문서 상태"
                  tone="default"
                />

                <InsetPanel className="overflow-hidden" padding="none">
                  <div className="border-b border-[var(--border)] px-5 py-4">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">메타데이터</h3>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {[
                      { label: "문서 유형", value: translateDocumentType(document.type) },
                      { label: "slug", value: document.slug },
                      {
                        label: "리뷰 상태",
                        value: translateLabel(document.lifecycle.review.status),
                      },
                      {
                        label: "최신성",
                        value: translateLabel(document.lifecycle.review.freshness.status),
                      },
                      {
                        label: "편집 잠금",
                        value: isLockedByActiveMember ? "내가 보유 중" : "잠금 필요",
                      },
                      { label: "연결 문서", value: `${document.linkedDocumentIds.length}개` },
                      { label: "댓글 스레드", value: `${commentThreads.length}개` },
                      { label: "승인 항목", value: `${approvals.length}개` },
                      { label: "마지막 수정", value: formatDateTime(document.lifecycle.updatedAt) },
                    ].map((item) => (
                      <div className="px-5 py-4" key={item.label}>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </InsetPanel>

                <InsetPanel>
                  <p className="text-sm font-medium text-[var(--foreground)]">GitHub 준비 상태</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    {document.prePublication.github.summary}
                  </p>
                  <div className="mt-3">
                    <Badge variant={statusBadgeVariant(document.prePublication.github.status)}>
                      {translateLabel(document.prePublication.github.status)}
                    </Badge>
                  </div>
                </InsetPanel>
              </div>

              <InsetPanel className="overflow-hidden" padding="none">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">템플릿 가이드</h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {template ? (
                    template.sections.map((section) => (
                      <div className="px-5 py-4" key={section.id}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[var(--foreground)]">{section.title}</p>
                          <Badge variant={section.required ? "info" : "outline"}>
                            {section.required ? "필수" : "선택"}
                          </Badge>
                          <Badge variant="outline">{translateLabel(section.kind)}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                          {section.summary}
                        </p>
                        {section.guidance.length > 0 ? (
                          <div className="mt-3 grid gap-2">
                            {section.guidance.map((item) => (
                              <p
                                className="rounded-[var(--radius)] bg-[var(--secondary)]/45 px-3 py-2 text-xs text-[var(--muted-foreground)]"
                                key={item}
                              >
                                {item}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <PanelEmptyState
                      description="이 문서에 연결된 템플릿을 찾지 못했습니다."
                      title="템플릿 정보 없음"
                    />
                  )}
                </div>
              </InsetPanel>
            </div>
          </TabsContent>
        </Tabs>
      </PanelCard>
    </>
  );
}
