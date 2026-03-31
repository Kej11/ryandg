import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/admin-login";
import { ADMIN_AUTH_COOKIE_NAME, hasValidAdminCookie } from "@/lib/admin-auth";

export default async function LoginPage() {
  const cookieStore = await cookies();

  if (hasValidAdminCookie(cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value)) {
    redirect("/admin");
  }

  return <AdminLogin />;
}
