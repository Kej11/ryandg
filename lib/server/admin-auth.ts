import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  getAdminUsername,
  hashAdminSessionToken,
  type AdminSession
} from "@/lib/admin-auth";
import { getDocumentSql } from "@/lib/server/documents/db";

const ADMIN_AUTH_ERROR_MESSAGE = "Admin authentication is required.";

type AdminSessionRow = {
  id: string;
  username: string;
  expires_at: string;
};

async function purgeExpiredAdminSessions() {
  const sql = getDocumentSql();

  await sql.query("DELETE FROM admin_sessions WHERE expires_at <= NOW()");
}

export async function createAdminSession(username = getAdminUsername()) {
  const sql = getDocumentSql();
  const token = createAdminSessionToken();
  const tokenHash = hashAdminSessionToken(token);
  const sessionId = randomUUID();

  await purgeExpiredAdminSessions();
  await sql.query(
    `
      INSERT INTO admin_sessions (
        id,
        token_hash,
        username,
        expires_at,
        created_at,
        last_seen_at
      )
      VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval, NOW(), NOW())
    `,
    [sessionId, tokenHash, username, ADMIN_SESSION_MAX_AGE_SECONDS]
  );

  return token;
}

export async function getAdminSessionFromRequest(): Promise<AdminSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return {
      isAuthenticated: false,
      sessionId: null,
      username: null
    };
  }

  const sql = getDocumentSql();
  const tokenHash = hashAdminSessionToken(token);
  const rows = await sql.query(
    `
      SELECT id, username, expires_at
      FROM admin_sessions
      WHERE token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  );

  const session = (rows as AdminSessionRow[])[0];

  if (!session) {
    return {
      isAuthenticated: false,
      sessionId: null,
      username: null
    };
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await sql.query("DELETE FROM admin_sessions WHERE id = $1", [session.id]);

    return {
      isAuthenticated: false,
      sessionId: null,
      username: null
    };
  }

  await sql.query(
    `
      UPDATE admin_sessions
      SET last_seen_at = NOW()
      WHERE id = $1
    `,
    [session.id]
  );

  return {
    isAuthenticated: true,
    sessionId: session.id,
    username: session.username
  };
}

export async function revokeAdminSession(token?: string) {
  if (!token) {
    return;
  }

  const sql = getDocumentSql();

  await sql.query("DELETE FROM admin_sessions WHERE token_hash = $1", [
    hashAdminSessionToken(token)
  ]);
}

export async function assertAdminRequest() {
  const session = await getAdminSessionFromRequest();

  if (!session.isAuthenticated) {
    throw new Error(ADMIN_AUTH_ERROR_MESSAGE);
  }

  return session;
}

export function isAdminAuthError(error: unknown) {
  return error instanceof Error && error.message === ADMIN_AUTH_ERROR_MESSAGE;
}
