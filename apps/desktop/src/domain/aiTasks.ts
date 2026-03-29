import type { AIDraftSuggestion, AIProvider, WorkspaceGraph } from "../types/contracts";
import type { AITaskEntryPoint } from "../types/domain-ui";

export interface AITaskExecutionInput {
  workspaceGraph: WorkspaceGraph;
  entry: AITaskEntryPoint;
  prompt: string;
}

export interface AITaskExecutionResult {
  provider: AIProvider;
  command: string;
  promptLabel: string;
  output: string;
  workingDirectory: string;
  startedAt: string;
  completedAt: string;
  suggestion: AIDraftSuggestion | null;
}

export interface AITaskService {
  runEntryPoint: (input: AITaskExecutionInput) => Promise<AITaskExecutionResult>;
}
