"use client";

/** Marque une erreur comme résolue / à rouvrir. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function ErrorResolveButton({ errorId, resolved }: { errorId: string; resolved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant={resolved ? "ghost" : "outline"}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/admin/errors/${errorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved: !resolved }),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      {resolved ? "Rouvrir" : "Marquer résolue"}
    </Button>
  );
}
