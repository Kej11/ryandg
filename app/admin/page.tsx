import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin/admin-console";
import { getAdminUsername } from "@/lib/admin-auth";
import { getAdminSessionFromRequest } from "@/lib/server/admin-auth";
import { listAdminDocuments } from "@/lib/server/documents/repository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSessionFromRequest();

  if (!session.isAuthenticated) {
    redirect("/login");
  }

  try {
    const documents = await listAdminDocuments();

    return (
      <AdminConsole
        initialDocuments={documents}
        username={session.username ?? getAdminUsername()}
      />
    );
  } catch (error) {
    return (
      <AdminConsole
        initialDocuments={[]}
        username={session.username ?? getAdminUsername()}
        initialLoadError={
          error instanceof Error
            ? error.message
            : "Unable to load persistent documents."
        }
      />
    );
  }
}
