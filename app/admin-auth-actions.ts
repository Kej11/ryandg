"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_AUTH_COOKIE_NAME,
  DEMO_ADMIN_PASSWORD,
  DEMO_ADMIN_USERNAME,
  createAdminToken
} from "@/lib/admin-auth";

export type AdminLoginState = {
  error: string;
};

export async function loginAdmin(
  _previousState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const username = formData.get("username");
  const password = formData.get("password");

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.trim() !== DEMO_ADMIN_USERNAME ||
    password !== DEMO_ADMIN_PASSWORD
  ) {
    return {
      error: "Incorrect username or password."
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(
    ADMIN_AUTH_COOKIE_NAME,
    createAdminToken(DEMO_ADMIN_USERNAME, DEMO_ADMIN_PASSWORD),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    }
  );

  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_AUTH_COOKIE_NAME);
  redirect("/login");
}
