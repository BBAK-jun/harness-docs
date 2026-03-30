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

  render(
    <FloatingDockProvider>
      <EditorAIAssistantDock
        canSubmit
        entries={[assistantEntry]}
        isOpen
        isPending={false}
        isVisible
        messages={[]}
        onClose={vi.fn()}
        onPromptBlur={vi.fn()}
        onPromptChange={vi.fn()}
        onSelectEntry={vi.fn()}
        onSubmit={onSubmit}
        onToggleOpen={vi.fn()}
        prompt="한글 입력"
        selectedEntry={assistantEntry}
        {...overrides}
      />
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
});
