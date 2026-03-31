"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SITE_AUTH_COOKIE_NAME,
  SITE_SESSION_MAX_AGE_SECONDS,
  validateSitePassword
} from "@/lib/site-auth";
import { createSiteSession, revokeSiteSession } from "@/lib/server/site-auth";

export type SiteLoginState = {
  error: string;
};

function getSafeRedirectTarget(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function loginSite(
  _previousState: SiteLoginState,
  formData: FormData
): Promise<SiteLoginState> {
  const password = formData.get("password");
  const redirectTo = getSafeRedirectTarget(formData.get("redirectTo"));

  if (typeof password !== "string" || !validateSitePassword(password)) {
    return {
      error: "Incorrect password."
    };
  }

  const cookieStore = await cookies();
  const sessionToken = await createSiteSession();

  cookieStore.set(SITE_AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SITE_SESSION_MAX_AGE_SECONDS
  });

  redirect(redirectTo);
}

export async function logoutSite() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SITE_AUTH_COOKIE_NAME)?.value;

  await revokeSiteSession(sessionToken);
  cookieStore.delete(SITE_AUTH_COOKIE_NAME);
  redirect("/login");
}
