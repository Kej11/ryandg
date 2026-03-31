import { createHash, randomBytes } from "node:crypto";

export const ADMIN_AUTH_COOKIE_NAME = "admin-auth";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AdminSession = {
  isAuthenticated: boolean;
  sessionId: string | null;
  username: string | null;
};

function requireAdminEnv(name: "ADMIN_USERNAME" | "ADMIN_PASSWORD") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set for admin authentication.`);
  }

  return value;
}

export function getAdminUsername() {
  return requireAdminEnv("ADMIN_USERNAME");
}

export function getAdminPassword() {
  return requireAdminEnv("ADMIN_PASSWORD");
}

export function validateAdminCredentials(username: string, password: string) {
  return username.trim() === getAdminUsername() && password === getAdminPassword();
}

export function createAdminSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAdminSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
