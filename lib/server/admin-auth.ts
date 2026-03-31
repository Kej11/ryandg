import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE_NAME, hasValidAdminCookie } from "@/lib/admin-auth";

const ADMIN_AUTH_ERROR_MESSAGE = "Admin authentication is required.";

export async function assertAdminRequest() {
  const cookieStore = await cookies();

  if (!hasValidAdminCookie(cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value)) {
    throw new Error(ADMIN_AUTH_ERROR_MESSAGE);
  }
}

export function isAdminAuthError(error: unknown) {
  return error instanceof Error && error.message === ADMIN_AUTH_ERROR_MESSAGE;
}
