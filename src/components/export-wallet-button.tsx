"use client";

/**
 * « Exporter ou récupérer mon wallet » : utilise EXCLUSIVEMENT le flux
 * sécurisé de Privy (la clé privée n'est jamais visible par l'application ni
 * par le serveur). En mode démonstration (sans Privy), affiche une explication.
 */
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button, Alert } from "@/components/ui";

const PRIVY_ENABLED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

function PrivyExport() {
  const { ready, authenticated, exportWallet } = usePrivy();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        variant="outline"
        disabled={!ready || !authenticated}
        onClick={async () => {
          try {
            await exportWallet();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Export indisponible pour ce compte.",
            );
          }
        }}
      >
        Exporter ou récupérer mon wallet
      </Button>
      <p className="text-xs text-ink-muted">
        L&apos;export s&apos;effectue dans une fenêtre sécurisée Privy. Ne partagez jamais votre
        clé privée ni votre phrase de récupération.
      </p>
    </div>
  );
}

export function ExportWalletButton() {
  if (!PRIVY_ENABLED) {
    return (
      <Alert tone="warning">
        Mode démonstration : le wallet associé à ce compte est fictif (aucune clé privée
        n&apos;existe). Avec Privy configuré, ce bouton ouvre le flux d&apos;export sécurisé de
        Privy — la clé ne transite jamais par nos serveurs.
      </Alert>
    );
  }
  return <PrivyExport />;
}
