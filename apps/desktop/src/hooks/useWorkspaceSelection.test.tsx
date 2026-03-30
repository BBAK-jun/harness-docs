import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createWorkspaceDocumentFixture,
  createWorkspaceGraphFixture,
} from "../test/workspaceGraphFixtures";
import { useWorkspaceSelection } from "./useWorkspaceSelection";

describe("useWorkspaceSelection", () => {
  it("defaults to the first document and remembers local selection", () => {
    const onSelectedDocumentChange = vi.fn();
    const workspaceGraph = createWorkspaceGraphFixture({
      documents: [
        createWorkspaceDocumentFixture({
          id: "doc-1",
          slug: "doc-1",
          title: "Document One",
        }),
        createWorkspaceDocumentFixture({
          id: "doc-2",
          slug: "doc-2",
          title: "Document Two",
        }),
      ],
      workspace: createWorkspaceGraphFixture().workspace,
    });

    const { result } = renderHook(() =>
      useWorkspaceSelection([workspaceGraph], {
        activeWorkspaceId: workspaceGraph.workspace.id,
        selectedDocumentId: null,
        onSelectedDocumentChange,
      }),
    );

    expect(result.current.activeDocument?.id).toBe("doc-1");

    act(() => {
      result.current.handleDocumentSelect("doc-2");
    });

    expect(result.current.activeDocument?.id).toBe("doc-2");
    expect(onSelectedDocumentChange).toHaveBeenCalledWith("doc-2");
  });

  it("prioritizes route-selected document over remembered local selection", () => {
    const workspaceGraph = createWorkspaceGraphFixture({
      documents: [
        createWorkspaceDocumentFixture({
          id: "doc-1",
          slug: "doc-1",
          title: "Document One",
        }),
        createWorkspaceDocumentFixture({
          id: "doc-2",
          slug: "doc-2",
          title: "Document Two",
        }),
      ],
    });

    const { result, rerender } = renderHook(
      ({ selectedDocumentId }: { selectedDocumentId: string | null }) =>
        useWorkspaceSelection([workspaceGraph], {
          activeWorkspaceId: workspaceGraph.workspace.id,
          selectedDocumentId,
          onSelectedDocumentChange: vi.fn(),
        }),
      {
        initialProps: {
          selectedDocumentId: null,
        } as { selectedDocumentId: string | null },
      },
    );

    act(() => {
      result.current.handleDocumentSelect("doc-2");
    });

    expect(result.current.activeDocument?.id).toBe("doc-2");

    rerender({
      selectedDocumentId: "doc-1",
    });

    expect(result.current.activeDocument?.id).toBe("doc-1");
  });
});
