import { createHash, randomBytes } from "node:crypto";

export const SITE_AUTH_COOKIE_NAME = "site-auth";
export const SITE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SiteSession = {
  isAuthenticated: boolean;
  sessionId: string | null;
};

function requireSiteEnv(name: "SITE_PASSWORD") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be set for site authentication.`);
  }

  return value;
}

export function getSitePassword() {
  return requireSiteEnv("SITE_PASSWORD");
}

export function validateSitePassword(password: string) {
  return password === getSitePassword();
}

export function createSiteSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSiteSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
