import {
  appSessions,
  authAccounts,
  createDatabase,
  type HarnessDocsDatabase,
  users,
} from "@harness-docs/db";
import type {
  AuthSessionExchangeRequestDto,
  AuthenticatedApiSessionDto,
  SessionUserDto,
} from "@harness-docs/contracts";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { ApiAuthDataSource } from "../../application/ports.ts";

const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;

const githubOAuthProvider = {
  id: "github_oauth",
  label: "GitHub OAuth",
  kind: "oauth",
} as const;

function buildId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function now() {
  return new Date();
}

function mapUser(row: typeof users.$inferSelect): SessionUserDto {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    avatarInitials: row.avatarInitials,
    githubLogin: row.githubLogin,
    primaryEmail: row.primaryEmail,
  };
}

function createAvatarInitials(name: string, login: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length > 0) {
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  }

  return login.slice(0, 2).toUpperCase();
}

function normalizeName(input: AuthSessionExchangeRequestDto["identity"]) {
  return input.name.trim() || input.login;
}

function normalizeHandle(login: string) {
  return `@${login.replace(/^@+/, "")}`;
}

async function findUserForIdentity(
  db: HarnessDocsDatabase,
  identity: AuthSessionExchangeRequestDto["identity"],
) {
  const [account] = await db
    .select({
      user: users,
    })
    .from(authAccounts)
    .innerJoin(users, eq(authAccounts.userId, users.id))
    .where(
      and(
        eq(authAccounts.provider, "github_oauth"),
        eq(authAccounts.providerAccountId, identity.login),
      ),
    )
    .limit(1);

  if (account?.user) {
    return account.user;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      identity.email
        ? or(eq(users.githubLogin, identity.login), eq(users.primaryEmail, identity.email))
        : eq(users.githubLogin, identity.login),
    )
    .limit(1);

  return user;
}

async function upsertIdentityAccount(
  db: HarnessDocsDatabase,
  userId: string,
  identity: AuthSessionExchangeRequestDto["identity"],
  authenticatedAt: Date,
) {
  const [existing] = await db
    .select()
    .from(authAccounts)
    .where(
      and(
        eq(authAccounts.provider, "github_oauth"),
        eq(authAccounts.providerAccountId, identity.login),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(authAccounts)
      .set({
        userId,
        providerEmail: identity.email,
        lastAuthenticatedAt: authenticatedAt,
        updatedAt: authenticatedAt,
      })
      .where(eq(authAccounts.id, existing.id));

    return;
  }

  await db.insert(authAccounts).values({
    id: buildId("acc"),
    userId,
    provider: "github_oauth",
    providerAccountId: identity.login,
    providerEmail: identity.email,
    lastAuthenticatedAt: authenticatedAt,
    createdAt: authenticatedAt,
    updatedAt: authenticatedAt,
  });
}

async function issueSession(
  db: HarnessDocsDatabase,
  user: typeof users.$inferSelect,
  authenticatedAt: Date,
) {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(authenticatedAt.getTime() + sessionLifetimeMs);

  await db.insert(appSessions).values({
    id: buildId("aps"),
    userId: user.id,
    sessionToken,
    expiresAt,
    lastAccessedAt: authenticatedAt,
    createdAt: authenticatedAt,
    updatedAt: authenticatedAt,
  });

  return {
    status: "authenticated",
    provider: githubOAuthProvider,
    user: mapUser(user),
    sessionToken,
    expiresAt: expiresAt.toISOString(),
  } satisfies AuthenticatedApiSessionDto;
}

export function createPostgresAuthSessionSource(
  db: HarnessDocsDatabase = createDatabase(),
): ApiAuthDataSource {
  return {
    async exchangeSession(input) {
      const authenticatedAt = now();
      const identity = {
        ...input.identity,
        login: input.identity.login.trim(),
        name: normalizeName(input.identity),
      };
      let user = await findUserForIdentity(db, identity);

      if (user) {
        await db
          .update(users)
          .set({
            name: identity.name,
            handle: normalizeHandle(identity.login),
            avatarInitials: createAvatarInitials(identity.name, identity.login),
            githubLogin: identity.login,
            primaryEmail: identity.email ?? user.primaryEmail,
            updatedAt: authenticatedAt,
          })
          .where(eq(users.id, user.id));

        [user] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      } else {
        const userId = buildId("usr");

        await db.insert(users).values({
          id: userId,
          name: identity.name,
          handle: normalizeHandle(identity.login),
          avatarInitials: createAvatarInitials(identity.name, identity.login),
          githubLogin: identity.login,
          primaryEmail: identity.email ?? `${identity.login}@users.noreply.github.com`,
          createdAt: authenticatedAt,
          updatedAt: authenticatedAt,
        });

        [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      }

      if (!user) {
        throw new Error("Failed to resolve authenticated user.");
      }

      await upsertIdentityAccount(db, user.id, identity, authenticatedAt);

      return issueSession(db, user, authenticatedAt);
    },
    async getSession(sessionToken) {
      const accessedAt = now();
      const [row] = await db
        .select({
          session: appSessions,
          user: users,
        })
        .from(appSessions)
        .innerJoin(users, eq(appSessions.userId, users.id))
        .where(
          and(
            eq(appSessions.sessionToken, sessionToken),
            gt(appSessions.expiresAt, accessedAt),
            isNull(appSessions.revokedAt),
          ),
        )
        .limit(1);

      if (!row) {
        return null;
      }

      await db
        .update(appSessions)
        .set({
          lastAccessedAt: accessedAt,
          updatedAt: accessedAt,
        })
        .where(eq(appSessions.id, row.session.id));

      return {
        status: "authenticated",
        provider: githubOAuthProvider,
        user: mapUser(row.user),
        sessionToken: row.session.sessionToken,
        expiresAt: row.session.expiresAt.toISOString(),
      } satisfies AuthenticatedApiSessionDto;
    },
    async revokeSession(sessionToken) {
      const revokedAt = now();

      await db
        .update(appSessions)
        .set({
          revokedAt,
          updatedAt: revokedAt,
        })
        .where(and(eq(appSessions.sessionToken, sessionToken), isNull(appSessions.revokedAt)));
    },
  };
}
