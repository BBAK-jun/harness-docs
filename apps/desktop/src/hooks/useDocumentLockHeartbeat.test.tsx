import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DesktopWindowService } from "../desktop/contracts";
import { createDocumentEditingLockFixture } from "../test/workspaceGraphFixtures";
import { useDocumentLockHeartbeat } from "./useDocumentLockHeartbeat";

describe("useDocumentLockHeartbeat", () => {
  it("subscribes to user activity and throttles lock touches", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-03-29T10:00:00.000Z"));

      let activityListener: (() => void) | null = null;
      const unsubscribe = vi.fn();
      const desktopWindow: DesktopWindowService = {
        subscribeToUserActivity: vi.fn((listener: () => void) => {
          activityListener = listener;
          return unsubscribe;
        }),
      };
      const touchDocumentEditingLock = vi.fn();

      const { unmount } = renderHook(() =>
        useDocumentLockHeartbeat({
          activeDocumentId: "doc-1",
          activeLock: createDocumentEditingLockFixture({
            documentId: "doc-1",
            lockedByMembershipId: "mem-1",
          }),
          activeMembershipId: "mem-1",
          desktopWindow,
          touchDocumentEditingLock,
        }),
      );

      expect(desktopWindow.subscribeToUserActivity).toHaveBeenCalledTimes(1);
      expect(activityListener).not.toBeNull();

      act(() => {
        activityListener?.();
      });

      expect(touchDocumentEditingLock).toHaveBeenCalledTimes(1);
      expect(touchDocumentEditingLock).toHaveBeenLastCalledWith({
        documentId: "doc-1",
        membershipId: "mem-1",
      });

      act(() => {
        activityListener?.();
      });

      expect(touchDocumentEditingLock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60_001);

      act(() => {
        activityListener?.();
      });

      expect(touchDocumentEditingLock).toHaveBeenCalledTimes(2);

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    } finally {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    }
  });

  it("does not subscribe when the active lock belongs to another member", () => {
    const desktopWindow: DesktopWindowService = {
      subscribeToUserActivity: vi.fn(),
    };

    renderHook(() =>
      useDocumentLockHeartbeat({
        activeDocumentId: "doc-1",
        activeLock: createDocumentEditingLockFixture({
          documentId: "doc-1",
          lockedByMembershipId: "mem-2",
        }),
        activeMembershipId: "mem-1",
        desktopWindow,
        touchDocumentEditingLock: vi.fn(),
      }),
    );

    expect(desktopWindow.subscribeToUserActivity).not.toHaveBeenCalled();
  });
});
