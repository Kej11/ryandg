import { createHash } from "node:crypto";

export const PASSWORD_COOKIE_NAME = "site-password-gate";

export function getConfiguredPassword() {
  const password = process.env.SITE_PASSWORD;

  if (!password) {
    throw new Error("SITE_PASSWORD must be set in .env.local");
  }

  return password;
}

export function createPasswordToken(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function getExpectedPasswordToken() {
  return createPasswordToken(getConfiguredPassword());
}

export function hasValidPasswordCookie(cookieValue?: string) {
  if (!cookieValue) {
    return false;
  }

  return cookieValue === getExpectedPasswordToken();
}
