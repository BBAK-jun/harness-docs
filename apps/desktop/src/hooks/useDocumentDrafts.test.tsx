import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createDocumentEditingLockFixture,
  createWorkspaceDocumentFixture,
  createWorkspaceGraphFixture,
} from "../test/workspaceGraphFixtures";
import { useDocumentDrafts } from "./useDocumentDrafts";

describe("useDocumentDrafts", () => {
  it("applies source, title, and linked-document drafts when the active member owns the lock", () => {
    const baseDocument = createWorkspaceDocumentFixture({
      id: "doc-1",
      slug: "doc-1",
      title: "Original Title",
      markdownSource: "# Heading\n\nOriginal body",
      linkedDocumentIds: [],
    });
    const linkedDocument = createWorkspaceDocumentFixture({
      id: "doc-2",
      slug: "doc-2",
      title: "Related Document",
    });
    const workspaceGraph = createWorkspaceGraphFixture({
      documents: [baseDocument, linkedDocument],
    });
    const ownedLock = createDocumentEditingLockFixture({
      documentId: baseDocument.id,
      lockedByMembershipId: "mem-1",
    });
    const locks = {
      acquireDocumentEditingLock: vi.fn(() => true),
      getActiveLockForDocument: vi.fn(() => ownedLock),
      releaseDocumentEditingLock: vi.fn(() => true),
      touchDocumentEditingLock: vi.fn(),
    };

    const { result } = renderHook(() =>
      useDocumentDrafts(
        [workspaceGraph],
        {
          activeMembershipId: "mem-1",
          userId: "user-1",
        },
        locks,
      ),
    );

    act(() => {
      result.current.handleDocumentSourceChange(baseDocument, "# Heading\n\nUpdated body");
      result.current.handleDocumentTitleChange(baseDocument, "Updated Title");
      result.current.handleDocumentLinkedDocumentsChange(baseDocument, [linkedDocument.id]);
    });

    expect(locks.touchDocumentEditingLock).toHaveBeenCalledTimes(3);
    expect(result.current.documentDrafts[baseDocument.id]).toBe("# Heading\n\nUpdated body");
    expect(result.current.workspaceGraphs[0]?.documents[0]?.title).toBe("Updated Title");
    expect(result.current.workspaceGraphs[0]?.documents[0]?.linkedDocumentIds).toEqual([
      linkedDocument.id,
    ]);

    act(() => {
      result.current.handleResetDocumentDraft(baseDocument);
    });

    expect(result.current.documentDrafts[baseDocument.id]).toBeUndefined();
    expect(result.current.workspaceGraphs[0]?.documents[0]?.title).toBe("Original Title");
    expect(result.current.workspaceGraphs[0]?.documents[0]?.markdownSource).toBe(
      "# Heading\n\nOriginal body",
    );
    expect(result.current.workspaceGraphs[0]?.documents[0]?.linkedDocumentIds).toEqual([]);
  });

  it("ignores draft writes when another member owns the active lock", () => {
    const baseDocument = createWorkspaceDocumentFixture({
      id: "doc-1",
      slug: "doc-1",
      title: "Original Title",
      markdownSource: "Original body",
    });
    const workspaceGraph = createWorkspaceGraphFixture({
      documents: [baseDocument],
    });
    const foreignLock = createDocumentEditingLockFixture({
      documentId: baseDocument.id,
      lockedByMembershipId: "mem-2",
    });
    const locks = {
      acquireDocumentEditingLock: vi.fn(() => true),
      getActiveLockForDocument: vi.fn(() => foreignLock),
      releaseDocumentEditingLock: vi.fn(() => true),
      touchDocumentEditingLock: vi.fn(),
    };

    const { result } = renderHook(() =>
      useDocumentDrafts(
        [workspaceGraph],
        {
          activeMembershipId: "mem-1",
          userId: "user-1",
        },
        locks,
      ),
    );

    act(() => {
      result.current.handleDocumentSourceChange(baseDocument, "Blocked update");
    });

    expect(locks.touchDocumentEditingLock).not.toHaveBeenCalled();
    expect(result.current.documentDrafts[baseDocument.id]).toBeUndefined();
    expect(result.current.workspaceGraphs[0]?.documents[0]?.markdownSource).toBe("Original body");
  });
});
