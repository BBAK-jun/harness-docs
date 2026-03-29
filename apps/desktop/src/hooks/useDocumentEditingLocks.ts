import { useEffect, useMemo, useState } from "react";
import type {
  DocumentEditingLock,
  DocumentEditingReleaseReason,
  NavigationArea,
  WorkspaceDocument,
  WorkspaceGraph,
} from "../types/contracts";
import type { MembershipId } from "../types/domain-ui";

const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 30;
const LOCK_CLEANUP_INTERVAL_MS = 15_000;

interface AcquireDocumentEditingLockInput {
  document: WorkspaceDocument;
  membershipId: MembershipId;
  area?: NavigationArea;
}

interface ReleaseDocumentEditingLockInput {
  documentId: string;
  membershipId: MembershipId;
  reason?: DocumentEditingReleaseReason;
}

interface TouchDocumentEditingLockInput {
  documentId: string;
  membershipId: MembershipId;
}

function getLockDeadline(lock: DocumentEditingLock) {
  const inactivityDeadline =
    Date.parse(lock.lastActivityAt) + lock.inactivityTimeoutMinutes * 60 * 1000;
  const explicitDeadline = Date.parse(lock.expiresAt);

  return Math.min(inactivityDeadline, explicitDeadline);
}

function isLockActive(lock: DocumentEditingLock, now: number) {
  return lock.lifecycle.status === "active" && getLockDeadline(lock) > now;
}

function hasLockTimedOut(lock: DocumentEditingLock, now: number) {
  return (
    lock.lifecycle.status === "active" &&
    Date.parse(lock.lastActivityAt) + lock.inactivityTimeoutMinutes * 60 * 1000 <= now
  );
}

function expireLock(lock: DocumentEditingLock, now: Date): DocumentEditingLock {
  const timestamp = now.toISOString();

  return {
    ...lock,
    lifecycle: {
      ...lock.lifecycle,
      status: "expired",
      expiredAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

function releaseTimedOutLock(lock: DocumentEditingLock, now: Date): DocumentEditingLock {
  const timestamp = now.toISOString();

  return {
    ...lock,
    releasedByMembershipId: null,
    releaseReason: "timeout",
    lifecycle: {
      ...lock.lifecycle,
      status: "released",
      releasedAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

function releaseLock(
  lock: DocumentEditingLock,
  membershipId: MembershipId,
  reason: DocumentEditingReleaseReason,
  now: Date,
): DocumentEditingLock {
  const timestamp = now.toISOString();

  return {
    ...lock,
    releasedByMembershipId: membershipId,
    releaseReason: reason,
    lifecycle: {
      ...lock.lifecycle,
      status: "released",
      releasedAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

function touchLock(lock: DocumentEditingLock, now: Date): DocumentEditingLock {
  const timestamp = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + lock.inactivityTimeoutMinutes * 60 * 1000,
  ).toISOString();

  return {
    ...lock,
    lastActivityAt: timestamp,
    expiresAt,
    lifecycle: {
      ...lock.lifecycle,
      updatedAt: timestamp,
    },
  };
}

function createLock(
  document: WorkspaceDocument,
  membershipId: MembershipId,
  area: NavigationArea,
  now: Date,
): DocumentEditingLock {
  const timestamp = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + DEFAULT_INACTIVITY_TIMEOUT_MINUTES * 60 * 1000,
  ).toISOString();

  return {
    id: `lock_${document.id}_${membershipId}_${now.getTime()}`,
    workspaceId: document.workspaceId,
    documentId: document.id,
    lockedByMembershipId: membershipId,
    acquiredFromArea: area,
    inactivityTimeoutMinutes: DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
    acquiredAt: timestamp,
    expiresAt,
    lastActivityAt: timestamp,
    lifecycle: {
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

function collectInitialLockState(workspaceGraphs: WorkspaceGraph[]) {
  const initialEntries = workspaceGraphs.flatMap((graph) =>
    graph.documents
      .map((document) => document.lifecycle.activeEditLock)
      .concat(graph.documentLocks)
      .filter((lock): lock is DocumentEditingLock => Boolean(lock))
      .map((lock) => [lock.documentId, lock] as const),
  );

  return Object.fromEntries(initialEntries);
}

export function useDocumentEditingLocks(workspaceGraphs: WorkspaceGraph[]) {
  const initialLocks = useMemo(() => collectInitialLockState(workspaceGraphs), [workspaceGraphs]);
  const [locksByDocumentId, setLocksByDocumentId] =
    useState<Record<string, DocumentEditingLock>>(initialLocks);

  useEffect(() => {
    setLocksByDocumentId(initialLocks);
  }, [initialLocks]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = new Date();
      const nowMs = now.getTime();

      setLocksByDocumentId((current) => {
        let didChange = false;
        const nextEntries = Object.entries(current).map(([documentId, lock]) => {
          if (hasLockTimedOut(lock, nowMs)) {
            didChange = true;
            return [documentId, releaseTimedOutLock(lock, now)] as const;
          }

          if (!isLockActive(lock, nowMs) && lock.lifecycle.status === "active") {
            didChange = true;
            return [documentId, expireLock(lock, now)] as const;
          }

          return [documentId, lock] as const;
        });

        return didChange ? Object.fromEntries(nextEntries) : current;
      });
    }, LOCK_CLEANUP_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const getActiveLockForDocument = (documentId: string) => {
    const lock = locksByDocumentId[documentId];

    if (!lock) {
      return null;
    }

    return isLockActive(lock, Date.now()) ? lock : null;
  };

  const getDocumentLockForDocument = (documentId: string) => locksByDocumentId[documentId] ?? null;

  const acquireDocumentEditingLock = ({
    document,
    membershipId,
    area = "editor",
  }: AcquireDocumentEditingLockInput) => {
    const now = new Date();
    const nextLock = createLock(document, membershipId, area, now);
    let acquired = false;

    setLocksByDocumentId((current) => {
      const existingLock = current[document.id];

      if (existingLock && isLockActive(existingLock, now.getTime())) {
        if (existingLock.lockedByMembershipId === membershipId) {
          acquired = true;
        }

        return current;
      }

      acquired = true;

      return {
        ...current,
        [document.id]: nextLock,
      };
    });

    return acquired;
  };

  const releaseDocumentEditingLock = ({
    documentId,
    membershipId,
    reason = "manual_release",
  }: ReleaseDocumentEditingLockInput) => {
    const now = new Date();
    let released = false;

    setLocksByDocumentId((current) => {
      const existingLock = current[documentId];

      if (
        !existingLock ||
        !isLockActive(existingLock, now.getTime()) ||
        existingLock.lockedByMembershipId !== membershipId
      ) {
        return current;
      }

      released = true;

      return {
        ...current,
        [documentId]: releaseLock(existingLock, membershipId, reason, now),
      };
    });

    return released;
  };

  const touchDocumentEditingLock = ({
    documentId,
    membershipId,
  }: TouchDocumentEditingLockInput) => {
    const now = new Date();

    setLocksByDocumentId((current) => {
      const existingLock = current[documentId];

      if (
        !existingLock ||
        !isLockActive(existingLock, now.getTime()) ||
        existingLock.lockedByMembershipId !== membershipId
      ) {
        return current;
      }

      return {
        ...current,
        [documentId]: touchLock(existingLock, now),
      };
    });
  };

  return {
    locksByDocumentId,
    getDocumentLockForDocument,
    getActiveLockForDocument,
    acquireDocumentEditingLock,
    releaseDocumentEditingLock,
    touchDocumentEditingLock,
  };
}
