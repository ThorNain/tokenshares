"use client";

/** Bouton de déconnexion : détruit la session serveur (+ session Privy). */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

const PRIVY_ENABLED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

function PrivyLogout({ onDone }: { onDone: () => void }) {
  const { logout } = usePrivy();
  return <InnerButton onClick={async () => { await logout().catch(() => undefined); onDone(); }} />;
}

function InnerButton({ onClick }: { onClick: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await onClick();
      }}
      disabled={busy}
      className="text-sm text-ink-muted hover:text-ink disabled:opacity-50"
    >
      Se déconnecter
    </button>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const done = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  if (PRIVY_ENABLED) return <PrivyLogout onDone={done} />;
  return <InnerButton onClick={done} />;
}
