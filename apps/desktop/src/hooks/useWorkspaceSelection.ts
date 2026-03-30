import { useMemo, useState } from "react";
import type { WorkspaceGraph } from "../types/contracts";

function buildSelectedDocumentMap(workspaceGraphs: WorkspaceGraph[]) {
  return Object.fromEntries(
    workspaceGraphs.map((graph) => [graph.workspace.id, graph.documents[0]?.id ?? ""]),
  );
}

interface UseWorkspaceSelectionOptions {
  activeWorkspaceId: string | null;
  selectedDocumentId: string | null;
  onSelectedDocumentChange: (documentId: string) => void;
}

export function useWorkspaceSelection(
  workspaceGraphs: WorkspaceGraph[],
  options: UseWorkspaceSelectionOptions,
) {
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Record<string, string>>(() =>
    buildSelectedDocumentMap(workspaceGraphs),
  );

  const activeWorkspaceGraph = useMemo(
    () => workspaceGraphs.find((graph) => graph.workspace.id === options.activeWorkspaceId) ?? null,
    [options.activeWorkspaceId, workspaceGraphs],
  );

  const activeDocument = useMemo(() => {
    if (!activeWorkspaceGraph) {
      return null;
    }

    const selectedDocumentId =
      options.selectedDocumentId ?? selectedDocumentIds[activeWorkspaceGraph.workspace.id];

    return (
      activeWorkspaceGraph.documents.find((document) => document.id === selectedDocumentId) ??
      activeWorkspaceGraph.documents[0] ??
      null
    );
  }, [activeWorkspaceGraph, options.selectedDocumentId, selectedDocumentIds]);

  const handleDocumentSelect = (documentId: string) => {
    if (!activeWorkspaceGraph) {
      return;
    }

    setSelectedDocumentIds((current) => ({
      ...current,
      [activeWorkspaceGraph.workspace.id]: documentId,
    }));
    options.onSelectedDocumentChange(documentId);
  };

  return {
    activeWorkspaceGraph,
    activeDocument,
    handleDocumentSelect,
  };
}
