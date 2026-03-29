import { useCallback, useEffect, useMemo, useState } from "react";
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

function collectBaseLockState(workspaceGraphs: WorkspaceGraph[]) {
  const initialEntries = workspaceGraphs.flatMap((graph) =>
    graph.documents
      .map((document) => document.lifecycle.activeEditLock)
      .concat(graph.documentLocks)
      .filter((lock): lock is DocumentEditingLock => Boolean(lock))
      .map((lock) => [lock.documentId, lock] as const),
  );

  return Object.fromEntries(initialEntries);
}

function normalizeLock(lock: DocumentEditingLock, now: Date) {
  const nowMs = now.getTime();

  if (hasLockTimedOut(lock, nowMs)) {
    return releaseTimedOutLock(lock, now);
  }

  if (!isLockActive(lock, nowMs) && lock.lifecycle.status === "active") {
    return expireLock(lock, now);
  }

  return lock;
}

export function useDocumentEditingLocks(workspaceGraphs: WorkspaceGraph[]) {
  const baseLocksByDocumentId = useMemo(
    () => collectBaseLockState(workspaceGraphs),
    [workspaceGraphs],
  );
  const [lockOverridesByDocumentId, setLockOverridesByDocumentId] = useState<
    Record<string, DocumentEditingLock>
  >({});

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = new Date();

      setLockOverridesByDocumentId((current) => {
        const combinedLocksByDocumentId = {
          ...baseLocksByDocumentId,
          ...current,
        };
        let didChange = false;
        const nextOverrides = { ...current };

        for (const [documentId, lock] of Object.entries(combinedLocksByDocumentId)) {
          const normalizedLock = normalizeLock(lock, now);

          if (normalizedLock !== lock) {
            nextOverrides[documentId] = normalizedLock;
            didChange = true;
          }
        }

        return didChange ? nextOverrides : current;
      });
    }, LOCK_CLEANUP_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [baseLocksByDocumentId]);

  const getDocumentLockForDocument = useCallback(
    (documentId: string) => {
      const lock = lockOverridesByDocumentId[documentId] ?? baseLocksByDocumentId[documentId];

      if (!lock) {
        return null;
      }

      return normalizeLock(lock, new Date());
    },
    [baseLocksByDocumentId, lockOverridesByDocumentId],
  );

  const getActiveLockForDocument = useCallback(
    (documentId: string) => {
      const lock = getDocumentLockForDocument(documentId);

      if (!lock) {
        return null;
      }

      return isLockActive(lock, Date.now()) ? lock : null;
    },
    [getDocumentLockForDocument],
  );

  const acquireDocumentEditingLock = useCallback(
    ({ document, membershipId, area = "editor" }: AcquireDocumentEditingLockInput) => {
      const now = new Date();
      const nextLock = createLock(document, membershipId, area, now);
      let acquired = false;

      setLockOverridesByDocumentId((current) => {
        const existingLock = current[document.id] ?? baseLocksByDocumentId[document.id];
        const normalizedLock = existingLock ? normalizeLock(existingLock, now) : null;

        if (normalizedLock && isLockActive(normalizedLock, now.getTime())) {
          if (normalizedLock.lockedByMembershipId === membershipId) {
            acquired = true;
          }

          if (normalizedLock !== existingLock) {
            return {
              ...current,
              [document.id]: normalizedLock,
            };
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
    },
    [baseLocksByDocumentId],
  );

  const releaseDocumentEditingLock = useCallback(
    ({ documentId, membershipId, reason = "manual_release" }: ReleaseDocumentEditingLockInput) => {
      const now = new Date();
      let released = false;

      setLockOverridesByDocumentId((current) => {
        const existingLock = current[documentId] ?? baseLocksByDocumentId[documentId];
        const normalizedLock = existingLock ? normalizeLock(existingLock, now) : null;

        if (
          !normalizedLock ||
          !isLockActive(normalizedLock, now.getTime()) ||
          normalizedLock.lockedByMembershipId !== membershipId
        ) {
          if (normalizedLock && normalizedLock !== existingLock) {
            return {
              ...current,
              [documentId]: normalizedLock,
            };
          }

          return current;
        }

        released = true;

        return {
          ...current,
          [documentId]: releaseLock(normalizedLock, membershipId, reason, now),
        };
      });

      return released;
    },
    [baseLocksByDocumentId],
  );

  const touchDocumentEditingLock = useCallback(
    ({ documentId, membershipId }: TouchDocumentEditingLockInput) => {
      const now = new Date();

      setLockOverridesByDocumentId((current) => {
        const existingLock = current[documentId] ?? baseLocksByDocumentId[documentId];
        const normalizedLock = existingLock ? normalizeLock(existingLock, now) : null;

        if (
          !normalizedLock ||
          !isLockActive(normalizedLock, now.getTime()) ||
          normalizedLock.lockedByMembershipId !== membershipId
        ) {
          if (normalizedLock && normalizedLock !== existingLock) {
            return {
              ...current,
              [documentId]: normalizedLock,
            };
          }

          return current;
        }

        return {
          ...current,
          [documentId]: touchLock(normalizedLock, now),
        };
      });
    },
    [baseLocksByDocumentId],
  );

  return {
    getDocumentLockForDocument,
    getActiveLockForDocument,
    acquireDocumentEditingLock,
    releaseDocumentEditingLock,
    touchDocumentEditingLock,
  };
}
