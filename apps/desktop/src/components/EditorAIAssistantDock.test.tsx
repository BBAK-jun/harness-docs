import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FloatingDockProvider } from "@/components/FloatingDockProvider";
import type { AITaskEntryPoint } from "../types/domain-ui";
import { EditorAIAssistantDock } from "./EditorAIAssistantDock";

const assistantEntry: AITaskEntryPoint = {
  id: "entry-1",
  workspaceId: "workspace-1",
  documentId: "document-1",
  publishRecordId: null,
  scope: "document",
  discoverableFrom: ["document_workspace"],
  provider: "Codex",
  kind: "document_content",
  title: "문서 초안 제안",
  description: "현재 문서를 기준으로 초안을 제안합니다.",
  triggerLabel: "초안 제안",
  contextLabel: "문서 편집",
  suggestedIntent: "revise_document",
  referenceDocumentIds: [],
  invalidatedByDocumentIds: [],
  existingSuggestionIds: [],
};

function renderDock(overrides?: Partial<ComponentProps<typeof EditorAIAssistantDock>>) {
  const onSubmit = overrides?.onSubmit ?? vi.fn();
  const props: ComponentProps<typeof EditorAIAssistantDock> = {
    canApplyDrafts: true,
    canSubmit: true,
    currentDocumentSource: "# 현재 본문",
    entries: [assistantEntry],
    isOpen: true,
    isPending: false,
    isVisible: true,
    messages: [],
    onApplyDraft: vi.fn(),
    onClose: vi.fn(),
    onCopyDraft: vi.fn(),
    onPromptBlur: vi.fn(),
    onPromptChange: vi.fn(),
    onSelectEntry: vi.fn(),
    onSubmit,
    onToggleCompare: vi.fn(),
    onToggleOpen: vi.fn(),
    onUndoDraftApply: vi.fn(),
    prompt: "한글 입력",
    selectedEntry: assistantEntry,
    ...overrides,
  };

  render(
    <FloatingDockProvider>
      <EditorAIAssistantDock {...props} />
    </FloatingDockProvider>,
  );

  return {
    onSubmit,
    textarea: screen.getByPlaceholderText(
      "AI에게 현재 문서에서 어떤 도움을 받고 싶은지 구체적으로 적어주세요.",
    ),
  };
}

describe("EditorAIAssistantDock", () => {
  it("submits on Enter when IME composition is not active", () => {
    const { onSubmit, textarea } = renderDock();

    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit while Korean IME composition is active", () => {
    const { onSubmit, textarea } = renderDock();

    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps Shift+Enter for multiline input", () => {
    const { onSubmit, textarea } = renderDock();

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows assistant message content to scroll inside the bubble", () => {
    renderDock({
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content: "길어진 답변",
          format: "plain",
        },
      ],
    });

    expect(screen.getByText("길어진 답변").parentElement?.className).toContain("overflow-y-auto");
  });

  it("renders proposal actions for assistant messages with an applyable draft", () => {
    const onCopyDraft = vi.fn();

    renderDock({
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content: "## Recommendation\n\n요약",
          format: "markdown",
          proposal: {
            recommendation: "문서 구조를 더 명확히 정리합니다.",
            draftMarkdown: "## Architecture\n\n정리된 본문",
            notes: null,
          },
          isStreaming: false,
        },
      ],
      onCopyDraft,
    });

    expect(screen.getByRole("button", { name: "초안 적용" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "복사" }));
    expect(screen.getByRole("button", { name: "비교 보기" })).toBeTruthy();
    expect(onCopyDraft).toHaveBeenCalledWith("assistant-1");
  });

  it("disables the apply action when the edit lock is unavailable", () => {
    renderDock({
      canApplyDrafts: false,
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content: "## Recommendation\n\n요약",
          format: "markdown",
          proposal: {
            recommendation: "문서 구조를 더 명확히 정리합니다.",
            draftMarkdown: "## Architecture\n\n정리된 본문",
            notes: null,
          },
          isStreaming: false,
        },
      ],
    });

    expect(screen.getByRole("button", { name: "초안 적용" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("편집 잠금을 보유 중일 때만 초안을 적용할 수 있습니다.")).toBeTruthy();
  });

  it("toggles compare content when requested by the parent", () => {
    renderDock({
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content: "## Recommendation\n\n요약",
          format: "markdown",
          proposal: {
            recommendation: "문서 구조를 더 명확히 정리합니다.",
            draftMarkdown: "## Architecture\n\n정리된 본문",
            notes: "메모",
          },
          isStreaming: false,
          isCompareOpen: true,
        },
      ],
    });

    expect(screen.getByText("현재 본문")).toBeTruthy();
    expect(screen.getByText("제안 초안")).toBeTruthy();
    expect(screen.getAllByText("메모").length).toBe(2);
    expect(screen.getByRole("button", { name: "비교 닫기" })).toBeTruthy();
  });
});
