import { cookies } from "next/headers";
import { LeywareChatShell } from "../components/leyware-chat-shell";
import { PasswordGateModal } from "../components/password-gate-modal";
import { PASSWORD_COOKIE_NAME, hasValidPasswordCookie } from "../lib/password-gate";

export default async function HomePage() {
  const cookieStore = await cookies();
  const passwordCookie = cookieStore.get(PASSWORD_COOKIE_NAME)?.value;
  const isUnlocked = hasValidPasswordCookie(passwordCookie);

  return (
    <>
      <div aria-hidden={!isUnlocked} className={isUnlocked ? "" : "pointer-events-none select-none"}>
        <LeywareChatShell isUnlocked={isUnlocked} />
      </div>
      {!isUnlocked ? <PasswordGateModal /> : null}
    </>
  );
}
