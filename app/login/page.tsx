import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/admin-login";
import { getAdminSessionFromRequest } from "@/lib/server/admin-auth";

export default async function LoginPage() {
  const session = await getAdminSessionFromRequest();

  if (session.isAuthenticated) {
    redirect("/admin");
  }

  return <AdminLogin />;
}
