import { createHash } from "node:crypto";

export const ADMIN_AUTH_COOKIE_NAME = "admin-auth";
export const DEMO_ADMIN_USERNAME = "ryandg";
export const DEMO_ADMIN_PASSWORD = "addyandarcher";

export type AdminSession = {
  isAuthenticated: boolean;
  username: string | null;
};

export function createAdminToken(username: string, password: string) {
  return createHash("sha256").update(`${username}:${password}`).digest("hex");
}

export function getExpectedAdminToken() {
  return createAdminToken(DEMO_ADMIN_USERNAME, DEMO_ADMIN_PASSWORD);
}

export function hasValidAdminCookie(cookieValue?: string) {
  if (!cookieValue) {
    return false;
  }

  return cookieValue === getExpectedAdminToken();
}

export function getAdminSessionFromCookie(cookieValue?: string): AdminSession {
  if (!hasValidAdminCookie(cookieValue)) {
    return {
      isAuthenticated: false,
      username: null
    };
  }

  return {
    isAuthenticated: true,
    username: DEMO_ADMIN_USERNAME
  };
}
