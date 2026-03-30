"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  PASSWORD_COOKIE_NAME,
  createPasswordToken,
  getConfiguredPassword
} from "../lib/password-gate";

export type PasswordGateState = {
  error: string;
};

export async function unlockSite(
  _previousState: PasswordGateState,
  formData: FormData
): Promise<PasswordGateState> {
  const submittedPassword = formData.get("password");

  if (typeof submittedPassword !== "string" || submittedPassword !== getConfiguredPassword()) {
    return {
      error: "Incorrect password. Try again."
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(PASSWORD_COOKIE_NAME, createPasswordToken(submittedPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  redirect("/");
}
