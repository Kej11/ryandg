import { redirect } from "next/navigation";
import { LeywareChatShell } from "../components/leyware-chat-shell";
import { getAdminSessionFromRequest } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getAdminSessionFromRequest();

  if (!session.isAuthenticated) {
    redirect("/login?next=%2F");
  }

  return <LeywareChatShell isUnlocked />;
}
