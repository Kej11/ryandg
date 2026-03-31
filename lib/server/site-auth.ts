import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  SITE_AUTH_COOKIE_NAME,
  SITE_SESSION_MAX_AGE_SECONDS,
  createSiteSessionToken,
  hashSiteSessionToken,
  type SiteSession
} from "@/lib/site-auth";
import { getDocumentSql } from "@/lib/server/documents/db";

const SITE_AUTH_ERROR_MESSAGE = "Site authentication is required.";

type SiteSessionRow = {
  id: string;
  expires_at: string;
};

async function purgeExpiredSiteSessions() {
  const sql = getDocumentSql();

  await sql.query("DELETE FROM site_sessions WHERE expires_at <= NOW()");
}

export async function createSiteSession() {
  const sql = getDocumentSql();
  const token = createSiteSessionToken();
  const tokenHash = hashSiteSessionToken(token);
  const sessionId = randomUUID();

  await purgeExpiredSiteSessions();
  await sql.query(
    `
      INSERT INTO site_sessions (
        id,
        token_hash,
        expires_at,
        created_at,
        last_seen_at
      )
      VALUES ($1, $2, NOW() + ($3 || ' seconds')::interval, NOW(), NOW())
    `,
    [sessionId, tokenHash, SITE_SESSION_MAX_AGE_SECONDS]
  );

  return token;
}

export async function getSiteSessionFromRequest(): Promise<SiteSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SITE_AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return {
      isAuthenticated: false,
      sessionId: null
    };
  }

  const sql = getDocumentSql();
  const tokenHash = hashSiteSessionToken(token);
  const rows = await sql.query(
    `
      SELECT id, expires_at
      FROM site_sessions
      WHERE token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  );

  const session = (rows as SiteSessionRow[])[0];

  if (!session) {
    return {
      isAuthenticated: false,
      sessionId: null
    };
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await sql.query("DELETE FROM site_sessions WHERE id = $1", [session.id]);

    return {
      isAuthenticated: false,
      sessionId: null
    };
  }

  await sql.query(
    `
      UPDATE site_sessions
      SET last_seen_at = NOW()
      WHERE id = $1
    `,
    [session.id]
  );

  return {
    isAuthenticated: true,
    sessionId: session.id
  };
}

export async function revokeSiteSession(token?: string) {
  if (!token) {
    return;
  }

  const sql = getDocumentSql();

  await sql.query("DELETE FROM site_sessions WHERE token_hash = $1", [
    hashSiteSessionToken(token)
  ]);
}

export async function assertSiteRequest() {
  const session = await getSiteSessionFromRequest();

  if (!session.isAuthenticated) {
    throw new Error(SITE_AUTH_ERROR_MESSAGE);
  }

  return session;
}

export function isSiteAuthError(error: unknown) {
  return error instanceof Error && error.message === SITE_AUTH_ERROR_MESSAGE;
}
