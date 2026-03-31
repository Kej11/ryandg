import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin/admin-console";
import {
  ADMIN_AUTH_COOKIE_NAME,
  DEMO_ADMIN_USERNAME,
  hasValidAdminCookie
} from "@/lib/admin-auth";
import { listAdminDocuments } from "@/lib/server/documents/repository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();

  if (!hasValidAdminCookie(cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  try {
    const documents = await listAdminDocuments();

    return (
      <AdminConsole
        initialDocuments={documents}
        username={DEMO_ADMIN_USERNAME}
      />
    );
  } catch (error) {
    return (
      <AdminConsole
        initialDocuments={[]}
        username={DEMO_ADMIN_USERNAME}
        initialLoadError={
          error instanceof Error
            ? error.message
            : "Unable to load persistent documents."
        }
      />
    );
  }
}
