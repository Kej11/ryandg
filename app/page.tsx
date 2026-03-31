import { redirect } from "next/navigation";
import { LeywareChatShell } from "../components/leyware-chat-shell";
import { getSiteSessionFromRequest } from "@/lib/server/site-auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSiteSessionFromRequest();

  if (!session.isAuthenticated) {
    redirect("/login?next=%2F");
  }

  return <LeywareChatShell isUnlocked />;
}
