import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createDocumentTemplateFixture,
  createWorkspaceDocumentFixture,
  createWorkspaceGraphFixture,
} from "../test/workspaceGraphFixtures";
import { useDocumentCommentActions } from "./useDocumentCommentActions";

describe("useDocumentCommentActions", () => {
  it("builds a default block anchor and forwards linked document context", () => {
    const document = createWorkspaceDocumentFixture({
      id: "doc-1",
      slug: "doc-1",
      title: "Commented Document",
      markdownSource: "# Commented Document\n\nFirst meaningful paragraph",
      linkedDocumentIds: ["doc-2"],
    });
    const workspaceGraph = createWorkspaceGraphFixture({
      documents: [document],
      templates: [
        createDocumentTemplateFixture({
          id: "tpl-1",
          sections: [
            {
              id: "sec-1",
              title: "Summary",
              kind: "list",
              summary: "Summary section",
              required: true,
              defaultMarkdown: "",
              guidance: [],
              linkedDocumentTypeHints: [],
            },
          ],
        }),
      ],
    });
    const createBlockCommentThread = vi.fn();

    const { result } = renderHook(() =>
      useDocumentCommentActions({
        activeMembershipId: "mem-1",
        activeWorkspaceGraph: workspaceGraph,
        createBlockCommentThread,
      }),
    );

    act(() => {
      result.current.handleCreateBlockComment(document, "Please review this block");
    });

    expect(createBlockCommentThread).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: document.workspaceId,
        documentId: document.id,
        authorMembershipId: "mem-1",
        bodyMarkdown: "Please review this block",
        linkedDocumentIds: ["doc-2"],
        triggeredReviewDocumentIds: ["doc-2"],
        anchor: {
          documentId: document.id,
          kind: "block",
          blockId: "sec-1",
          blockKind: "list_item",
          headingPath: ["Summary"],
          excerpt: "First meaningful paragraph",
          startOffset: null,
          endOffset: null,
        },
      }),
    );
  });
});
