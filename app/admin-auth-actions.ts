"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  validateAdminCredentials
} from "@/lib/admin-auth";
import { createAdminSession, revokeAdminSession } from "@/lib/server/admin-auth";

export type AdminLoginState = {
  error: string;
};

function getSafeRedirectTarget(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function loginAdmin(
  _previousState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const username = formData.get("username");
  const password = formData.get("password");
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo"));

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !validateAdminCredentials(username, password)
  ) {
    return {
      error: "Incorrect username or password."
    };
  }

  const cookieStore = await cookies();
  const sessionToken = await createAdminSession(username.trim());

  cookieStore.set(
    ADMIN_AUTH_COOKIE_NAME,
    sessionToken,
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
    }
  );

  redirect(redirectTo);
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;

  await revokeAdminSession(sessionToken);

  cookieStore.delete(ADMIN_AUTH_COOKIE_NAME);
  redirect("/login");
}
