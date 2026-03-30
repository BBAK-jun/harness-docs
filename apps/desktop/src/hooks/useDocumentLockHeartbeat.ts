import { useEffect, useRef } from "react";
import type { DesktopWindowService } from "../desktop/contracts";
import type { DocumentEditingLock } from "../types/contracts";
import type { MembershipId } from "../types/domain-ui";

const HEARTBEAT_THROTTLE_MS = 60_000;

interface UseDocumentLockHeartbeatOptions {
  activeDocumentId: string | null;
  activeLock: DocumentEditingLock | null;
  activeMembershipId: MembershipId | null;
  desktopWindow: DesktopWindowService;
  touchDocumentEditingLock: (input: {
    documentId: string;
    membershipId: MembershipId;
  }) => void;
}

export function useDocumentLockHeartbeat(options: UseDocumentLockHeartbeatOptions) {
  const lastInteractionTouchMsRef = useRef(0);

  useEffect(() => {
    const activeDocumentId = options.activeDocumentId;
    const activeMembershipId = options.activeMembershipId;
    const activeLock = options.activeLock;

    if (
      !activeDocumentId ||
      !activeMembershipId ||
      activeLock?.lifecycle.status !== "active" ||
      activeLock.lockedByMembershipId !== activeMembershipId
    ) {
      return;
    }

    const touchActiveLock = () => {
      const now = Date.now();

      if (now - lastInteractionTouchMsRef.current < HEARTBEAT_THROTTLE_MS) {
        return;
      }

      lastInteractionTouchMsRef.current = now;
      options.touchDocumentEditingLock({
        documentId: activeDocumentId,
        membershipId: activeMembershipId,
      });
    };

    return options.desktopWindow.subscribeToUserActivity(touchActiveLock);
  }, [
    options.activeDocumentId,
    options.activeLock,
    options.activeMembershipId,
    options.desktopWindow,
    options.touchDocumentEditingLock,
  ]);
}
