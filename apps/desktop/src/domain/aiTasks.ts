import type { AIDraftSuggestion, AIProvider, WorkspaceGraph } from "../types/contracts";
import type { AITaskEntryPoint } from "../types/domain-ui";

export interface AITaskExecutionInput {
  workspaceGraph: WorkspaceGraph;
  entry: AITaskEntryPoint;
  prompt: string;
}

export interface AITaskExecutionHandle {
  taskId: string;
  provider: AIProvider;
  command: string;
  promptLabel: string;
  workingDirectory: string;
  startedAt: string;
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

export type AITaskOutputStream = "stdout" | "stderr";

export type AITaskExecutionEvent =
  | {
      type: "output";
      taskId: string;
      stream: AITaskOutputStream;
      chunk: string;
    }
  | {
      type: "completed";
      taskId: string;
      result: AITaskExecutionResult;
    }
  | {
      type: "failed";
      taskId: string;
      error: string;
      completedAt: string;
    }
  | {
      type: "cancelled";
      taskId: string;
      completedAt: string;
    };

export interface AITaskExecutionObserver {
  onEvent?: (event: AITaskExecutionEvent) => void;
}

export interface AITaskRunningExecution extends AITaskExecutionHandle {
  result: Promise<AITaskExecutionResult>;
  cancel: () => Promise<void>;
}

export interface AITaskService {
  runEntryPoint: (input: AITaskExecutionInput) => Promise<AITaskExecutionResult>;
  startEntryPoint: (
    input: AITaskExecutionInput,
    observer?: AITaskExecutionObserver,
  ) => Promise<AITaskRunningExecution>;
}
