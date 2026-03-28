import type { AITaskExecutionInput, AITaskExecutionResult, AITaskService } from "../domain/aiTasks";
import { mockSession } from "../data/mockSession";
import type {
  AIDraftSuggestion,
} from "../types";

function createMockSuggestion(input: AITaskExecutionInput): AIDraftSuggestion | null {
  const document =
    input.entry.documentId != null
      ? (input.workspaceGraph.documents.find((entry) => entry.id === input.entry.documentId) ??
        null)
      : (input.workspaceGraph.documents[0] ?? null);

  if (!document) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: `ai_mock_${input.entry.id}`,
    workspaceId: input.workspaceGraph.workspace.id,
    documentId: document.id,
    templateId: document.templateId,
    provider: input.entry.provider,
    kind: input.entry.kind,
    summary: `Mock ${input.entry.provider} output for ${input.entry.title}`,
    promptLabel: input.entry.title,
    authoringContext: {
      workspaceId: input.workspaceGraph.workspace.id,
      currentDocumentId: document.id,
      templateId: document.templateId,
      currentUserMembershipId: input.workspaceGraph.workspace.leadMembershipId,
      activeArea: "ai",
      intent: input.entry.suggestedIntent,
      linkedDocumentIds: document.linkedDocumentIds,
      invalidatedByDocumentIds: input.entry.invalidatedByDocumentIds,
      referenceDocumentIds: input.entry.referenceDocumentIds,
    },
    sections: [
      {
        sectionId: "mock-output",
        title: input.entry.title,
        markdown: "Mock AI output generated from browser fallback services.",
        rationale: "Use the Tauri runtime to execute Codex or Claude for real.",
      },
    ],
    suggestedLinkedDocumentIds: input.entry.referenceDocumentIds,
    lifecycle: {
      status: "proposed",
      createdAt: now,
      updatedAt: now,
      generatedAt: now,
    },
  };
}

export function createMockAITaskService(): AITaskService {
  return {
    async runEntryPoint(input) {
      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();

      return {
        provider: input.entry.provider,
        command: "mock-ai-task",
        promptLabel: input.entry.title,
        output: `Mock ${input.entry.provider} run for ${input.entry.title}\n\n${input.prompt}`,
        workingDirectory: "/mock/ai-workspace",
        startedAt,
        completedAt,
        suggestion: createMockSuggestion(input),
      };
    },
  };
}
