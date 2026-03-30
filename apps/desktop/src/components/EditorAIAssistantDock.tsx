import { useRef, type FocusEventHandler, type KeyboardEventHandler } from "react";
import { Bot, Copy, LoaderCircle, RefreshCcw, SendHorizontal, WandSparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useFloatingDockItem } from "@/components/FloatingDockProvider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { AITaskEntryPoint, EditorAIDraftProposal } from "../types/domain-ui";

export type EditorAIAssistantMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  label?: string;
  format?: "markdown" | "plain";
  isStreaming?: boolean;
  tone?: "default" | "warning" | "danger";
  proposal?: EditorAIDraftProposal | null;
  isCompareOpen?: boolean;
  canUndoApply?: boolean;
  statusText?: string | null;
};

function normalizeStreamingMarkdown(content: string, isStreaming: boolean) {
  const normalized = content.replace(/\r\n/g, "\n");

  if (!isStreaming) {
    return normalized;
  }

  const codeFenceCount = normalized.match(/```/g)?.length ?? 0;

  return `${normalized}${codeFenceCount % 2 === 1 ? "\n```" : ""}`;
}

export function EditorAIAssistantDock({
  entries,
  emptyStateMessage,
  isOpen,
  isPending,
  isVisible,
  messages,
  currentDocumentSource,
  prompt,
  promptError,
  selectedEntry,
  canSubmit,
  canApplyDrafts,
  onClose,
  onApplyDraft,
  onCopyDraft,
  onPromptBlur,
  onPromptChange,
  onSelectEntry,
  onSubmit,
  onToggleCompare,
  onToggleOpen,
  onUndoDraftApply,
}: {
  entries: AITaskEntryPoint[];
  emptyStateMessage?: string;
  isOpen: boolean;
  isPending: boolean;
  isVisible: boolean;
  messages: EditorAIAssistantMessage[];
  currentDocumentSource: string;
  prompt: string;
  promptError?: string | null;
  selectedEntry: AITaskEntryPoint | null;
  canSubmit: boolean;
  canApplyDrafts: boolean;
  onClose: () => void;
  onApplyDraft: (messageId: string) => void;
  onCopyDraft: (messageId: string) => void;
  onPromptBlur: FocusEventHandler<HTMLTextAreaElement>;
  onPromptChange: (value: string) => void;
  onSelectEntry: (id: string) => void;
  onSubmit: () => void;
  onToggleCompare: (messageId: string) => void;
  onToggleOpen: () => void;
  onUndoDraftApply: (messageId: string) => void;
}) {
  const isPromptComposingRef = useRef(false);

  const handlePromptKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    const nativeEvent = event.nativeEvent;
    const isComposing =
      isPromptComposingRef.current || nativeEvent.isComposing || nativeEvent.keyCode === 229;

    if (isComposing) {
      return;
    }

    event.preventDefault();
    onSubmit();
  };

  useFloatingDockItem({
    id: "editor-ai-assistant",
    isVisible,
    order: 80,
    panel: isOpen ? (
      <div className="w-[min(calc(100vw-2rem),clamp(36rem,46vw,52rem))] pb-2">
        <div className="flex max-h-[min(84vh,62rem)] min-h-[620px] flex-col overflow-hidden rounded-[calc(var(--radius)+10px)] border border-[var(--border)] bg-[var(--background)] shadow-[0_32px_96px_-42px_rgba(15,23,42,0.56)]">
          <div className="border-b border-[var(--border)] px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <Bot className="size-4" />
                  AI 편집 도우미
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  편집 화면을 가리지 않고 현재 문서를 기준으로 초안 제안만 제공합니다.
                </p>
              </div>
              <Button
                className="h-8 w-8 shrink-0 rounded-full"
                clientLog="에디터 AI 도우미 닫기"
                onClick={onClose}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
                <span className="sr-only">닫기</span>
              </Button>
            </div>
          </div>

          <div className="border-b border-[var(--border)] px-6 py-4">
            <ToggleGroup
              className="flex flex-wrap justify-start gap-2"
              onValueChange={(value) => {
                if (value) {
                  onSelectEntry(value);
                }
              }}
              type="single"
              value={selectedEntry?.id}
            >
              {entries.map((entry) => (
                <ToggleGroupItem
                  className={cn(
                    "h-auto rounded-full px-3 py-1.5 text-xs",
                    "border border-[var(--border)] bg-transparent text-[var(--muted-foreground)]",
                    "data-[state=on]:border-transparent data-[state=on]:bg-[var(--foreground)] data-[state=on]:text-[var(--background)]",
                  )}
                  key={entry.id}
                  value={entry.id}
                  variant="outline"
                >
                  {entry.triggerLabel}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="mt-3 rounded-[var(--radius)] bg-[var(--secondary)]/35 px-3 py-2 text-xs text-[var(--muted-foreground)]">
              {selectedEntry
                ? `${selectedEntry.title} · ${selectedEntry.description}`
                : (emptyStateMessage ?? "사용 가능한 AI 작업이 없습니다.")}
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-[var(--secondary)]/20">
            <ScrollArea className="h-full">
              <div className="space-y-3 px-6 py-5">
                {messages.length === 0 ? (
                  <div className="space-y-3 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--background)]/92 px-4 py-4">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      무엇을 도와드릴까요?
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                      {selectedEntry
                        ? "예: 이 섹션을 더 명확하게 써줘, 승인 코멘트를 반영한 초안을 제안해줘, 연결 문서 기준으로 빠진 내용을 찾아줘"
                        : (emptyStateMessage ?? "사용 가능한 AI 작업이 없습니다.")}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        className={cn(
                          "max-w-[96%] rounded-[var(--radius)] px-4 py-3 text-sm leading-6 shadow-sm",
                          message.role === "user"
                            ? "ml-auto max-w-[88%] bg-[var(--foreground)] text-[var(--background)]"
                            : message.role === "system"
                              ? cn(
                                  "mr-auto border",
                                  message.tone === "danger"
                                    ? "border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] text-[color:var(--destructive)]"
                                    : "border-[rgba(146,64,14,0.16)] bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
                                )
                              : "mr-auto border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]",
                        )}
                        key={message.id}
                      >
                        {message.label ? (
                          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] opacity-70">
                            {message.label}
                          </p>
                        ) : null}
                        <div
                          className={cn(
                            "min-w-0",
                            "max-h-[44vh] overflow-y-auto overscroll-contain pr-2",
                          )}
                        >
                          {message.format === "markdown" ? (
                            <div className="prose-harness max-w-none text-[inherit]">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {normalizeStreamingMarkdown(
                                  message.content,
                                  message.isStreaming === true,
                                )}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "whitespace-pre-wrap",
                                message.role === "system" && "font-mono text-xs leading-5",
                              )}
                            >
                              {message.content}
                            </div>
                          )}
                        </div>
                        {message.role === "assistant" &&
                        message.proposal &&
                        !message.isStreaming ? (
                          <div className="mt-4 space-y-3 border-t border-[var(--border)]/80 pt-3">
                            {message.proposal.recommendation ? (
                              <div className="rounded-[calc(var(--radius)-2px)] bg-[var(--secondary)]/55 px-3 py-2 text-xs leading-5 text-[var(--muted-foreground)]">
                                {message.proposal.recommendation}
                              </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                className="h-8"
                                clientLog="AI 초안 적용"
                                disabled={!canApplyDrafts || isPending}
                                onClick={() => onApplyDraft(message.id)}
                                size="sm"
                                type="button"
                                variant="softOutline"
                              >
                                <WandSparkles className="size-3.5" />
                                초안 적용
                              </Button>
                              <Button
                                className="h-8"
                                clientLog="AI 초안 복사"
                                onClick={() => onCopyDraft(message.id)}
                                size="sm"
                                type="button"
                                variant="quiet"
                              >
                                <Copy className="size-3.5" />
                                복사
                              </Button>
                              <Button
                                className="h-8"
                                clientLog="AI 초안 비교 보기"
                                onClick={() => onToggleCompare(message.id)}
                                size="sm"
                                type="button"
                                variant="quiet"
                              >
                                {message.isCompareOpen ? "비교 닫기" : "비교 보기"}
                              </Button>
                              {message.canUndoApply ? (
                                <Button
                                  className="h-8"
                                  clientLog="AI 초안 적용 되돌리기"
                                  onClick={() => onUndoDraftApply(message.id)}
                                  size="sm"
                                  type="button"
                                  variant="quiet"
                                >
                                  <RefreshCcw className="size-3.5" />
                                  되돌리기
                                </Button>
                              ) : null}
                            </div>
                            {!canApplyDrafts ? (
                              <p className="text-xs text-[var(--muted-foreground)]">
                                편집 잠금을 보유 중일 때만 초안을 적용할 수 있습니다.
                              </p>
                            ) : null}
                            {message.statusText ? (
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {message.statusText}
                              </p>
                            ) : null}
                            {message.isCompareOpen ? (
                              <div className="grid gap-3 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] bg-[var(--secondary)]/35 p-3">
                                <div className="space-y-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                                    현재 본문
                                  </p>
                                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-[calc(var(--radius)-4px)] bg-[var(--background)] px-3 py-2 text-xs leading-5 text-[var(--foreground)]">
                                    {currentDocumentSource}
                                  </pre>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                                    제안 초안
                                  </p>
                                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-[calc(var(--radius)-4px)] bg-[var(--background)] px-3 py-2 text-xs leading-5 text-[var(--foreground)]">
                                    {message.proposal.draftMarkdown}
                                  </pre>
                                </div>
                                {message.proposal.notes ? (
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                                      메모
                                    </p>
                                    <div className="rounded-[calc(var(--radius)-4px)] bg-[var(--background)] px-3 py-2 text-xs leading-5 text-[var(--muted-foreground)]">
                                      {message.proposal.notes}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {isPending ? (
                      <div className="mr-auto flex max-w-[90%] items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        <LoaderCircle className="size-4 animate-spin" />
                        AI가 답변을 작성하고 있습니다.
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-5">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSubmit();
              }}
            >
              <Textarea
                className="min-h-[128px] resize-none"
                disabled={!selectedEntry || isPending}
                onBlur={onPromptBlur}
                onChange={(event) => onPromptChange(event.target.value)}
                onCompositionEnd={() => {
                  isPromptComposingRef.current = false;
                }}
                onCompositionStart={() => {
                  isPromptComposingRef.current = true;
                }}
                onKeyDown={handlePromptKeyDown}
                placeholder="AI에게 현재 문서에서 어떤 도움을 받고 싶은지 구체적으로 적어주세요."
                value={prompt}
              />
              {promptError ? (
                <p className="text-xs text-[var(--destructive)]">{promptError}</p>
              ) : (
                <p className="text-xs text-[var(--muted-foreground)]">
                  `Enter`로 전송하고 `Shift+Enter`로 줄바꿈합니다.
                </p>
              )}
              <Button className="w-full" disabled={!canSubmit} type="submit">
                {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizontal />}
                도움 요청하기
              </Button>
            </form>
          </div>
        </div>
      </div>
    ) : undefined,
    trigger: (
      <Button
        className="h-12 rounded-full px-4 shadow-xl"
        clientLog={isOpen ? "에디터 AI 도우미 닫기" : "에디터 AI 도우미 열기"}
        onClick={onToggleOpen}
        type="button"
        variant={isOpen ? "secondary" : "default"}
      >
        <Bot />
        {isOpen ? "도우미 닫기" : "AI 도우미"}
      </Button>
    ),
  });

  return null;
}
