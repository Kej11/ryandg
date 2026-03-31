import { redirect } from "next/navigation";
import { AdminLogin } from "@/components/admin/admin-login";
import { getAdminSessionFromRequest } from "@/lib/server/admin-auth";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

function getSafeRedirectTarget(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAdminSessionFromRequest();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const redirectTo = getSafeRedirectTarget(resolvedSearchParams?.next);

  if (session.isAuthenticated) {
    redirect(redirectTo);
  }

  return <AdminLogin redirectTo={redirectTo} />;
}
