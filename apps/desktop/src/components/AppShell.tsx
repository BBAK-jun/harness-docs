import type { AITaskExecutionResult } from "../domain/aiTasks";
import type { PublishExecutionResult } from "../domain/publishing";
import { isDocumentWorkspaceArea } from "../navigation";
import { AITaskWorkspace } from "./AITaskWorkspace";
import { DocumentLibrary } from "./DocumentLibrary";
import { EditorWorkspace } from "./EditorWorkspace";
import { PublishFlowWorkspace } from "./PublishFlowWorkspace";
import { WorkspaceAreaOverview } from "./WorkspaceAreaOverview";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import type {
  AIProvider,
  AITaskEntryPoint,
  DocumentEditingLock,
  NavigationArea,
  WorkspaceSummary
} from "../types";
import type { WorkspaceDocument, WorkspaceGraph } from "../types";

interface AppShellProps {
  workspace: WorkspaceSummary;
  workspaceGraph: WorkspaceGraph | null;
  activeArea: NavigationArea;
  preferredAIProvider: AIProvider;
  aiEntryPoints: AITaskEntryPoint[];
  aiTaskState: {
    status: "idle" | "running" | "succeeded" | "failed";
    error: string | null;
    result: AITaskExecutionResult | null;
    entryId?: string | null;
  };
  publishState: {
    status: "idle" | "running" | "succeeded" | "failed";
    error: string | null;
    result: PublishExecutionResult | null;
  };
  activeDocument: WorkspaceDocument | null;
  activeMembershipId: string | null;
  activeDocumentSource: string;
  activeDocumentLock: DocumentEditingLock | null;
  onAreaChange: (area: NavigationArea) => void;
  onPreferredAIProviderChange: (provider: AIProvider) => void;
  onDocumentSelect: (documentId: string) => void;
  onLaunchAITaskEntryPoint: (entry: AITaskEntryPoint) => void;
  onExecutePublish: () => void;
  onDocumentSourceChange: (document: WorkspaceDocument, source: string) => void;
  onStartEditing: (document: WorkspaceDocument) => void;
  onReleaseEditing: (document: WorkspaceDocument) => void;
  onCreateBlockComment: (document: WorkspaceDocument, bodyMarkdown: string) => void;
  onOpenDocument: (documentId: string) => void;
  onLeaveWorkspace: () => void;
}

export function AppShell({
  workspace,
  workspaceGraph,
  activeArea,
  preferredAIProvider,
  aiEntryPoints,
  aiTaskState,
  publishState,
  activeDocument,
  activeMembershipId,
  activeDocumentSource,
  activeDocumentLock,
  onAreaChange,
  onPreferredAIProviderChange,
  onDocumentSelect,
  onLaunchAITaskEntryPoint,
  onExecutePublish,
  onDocumentSourceChange,
  onStartEditing,
  onReleaseEditing,
  onCreateBlockComment,
  onOpenDocument,
  onLeaveWorkspace
}: AppShellProps) {
  const content = renderShellContent({
    workspace,
    workspaceGraph,
    activeArea,
    preferredAIProvider,
    aiEntryPoints,
    aiTaskState,
    publishState,
    activeDocument,
    activeMembershipId,
    activeDocumentSource,
    activeDocumentLock,
    onPreferredAIProviderChange,
    onDocumentSelect,
    onLaunchAITaskEntryPoint,
    onExecutePublish,
    onDocumentSourceChange,
    onStartEditing,
    onReleaseEditing,
    onCreateBlockComment,
    onOpenDocument
  });

  return (
    <div className="shell">
      <WorkspaceHeader onLeaveWorkspace={onLeaveWorkspace} workspace={workspace} />
      <WorkspaceNavigation activeArea={activeArea} onAreaChange={onAreaChange} />
      {content}
    </div>
  );
}

function renderShellContent({
  workspace,
  workspaceGraph,
  activeArea,
  preferredAIProvider,
  aiEntryPoints,
  aiTaskState,
  publishState,
  activeDocument,
  activeMembershipId,
  activeDocumentSource,
  activeDocumentLock,
  onPreferredAIProviderChange,
  onDocumentSelect,
  onLaunchAITaskEntryPoint,
  onExecutePublish,
  onDocumentSourceChange,
  onStartEditing,
  onReleaseEditing,
  onCreateBlockComment,
  onOpenDocument
}: Omit<AppShellProps, "onAreaChange" | "onLeaveWorkspace">) {
  if (activeArea === "documents" && workspaceGraph) {
    return (
      <DocumentLibrary
        activeDocument={activeDocument}
        aiEntryPoints={aiEntryPoints}
        onDocumentSelect={onDocumentSelect}
        onLaunchAITaskEntryPoint={onLaunchAITaskEntryPoint}
        onOpenDocument={onOpenDocument}
        workspace={workspace}
        workspaceGraph={workspaceGraph}
      />
    );
  }

  if (activeArea === "ai" && workspaceGraph) {
    return (
      <AITaskWorkspace
        entryPoints={aiEntryPoints}
        executionState={aiTaskState}
        onLaunchEntryPoint={onLaunchAITaskEntryPoint}
        workspaceGraph={workspaceGraph}
      />
    );
  }

  if (activeArea === "publish" && workspaceGraph) {
    return (
      <PublishFlowWorkspace
        aiEntryPoints={aiEntryPoints}
        executionState={publishState}
        onExecutePublish={onExecutePublish}
        onLaunchAITaskEntryPoint={onLaunchAITaskEntryPoint}
        workspaceGraph={workspaceGraph}
      />
    );
  }

  if (isDocumentWorkspaceArea(activeArea) && workspaceGraph) {
    return (
      <EditorWorkspace
        activeArea={activeArea}
        activeDocument={activeDocument}
        activeDocumentLock={activeDocumentLock}
        activeDocumentSource={activeDocumentSource}
        activeMembershipId={activeMembershipId}
        aiEntryPoints={aiEntryPoints}
        onCreateBlockComment={onCreateBlockComment}
        onDocumentSelect={onDocumentSelect}
        onDocumentSourceChange={onDocumentSourceChange}
        onLaunchAITaskEntryPoint={onLaunchAITaskEntryPoint}
        onReleaseEditing={onReleaseEditing}
        onStartEditing={onStartEditing}
        workspaceGraph={workspaceGraph}
      />
    );
  }

  return (
    <WorkspaceAreaOverview
      activeArea={activeArea}
      onPreferredAIProviderChange={onPreferredAIProviderChange}
      preferredAIProvider={preferredAIProvider}
      workspace={workspace}
    />
  );
}
