"use client";

/**
 * Panneau de réclamation d'un cadeau. Le destinataire doit être connecté
 * (compte + wallet Privy créés) ; il saisit le code (pré-rempli depuis le
 * lien), le token est émis dans son wallet, puis il est redirigé vers le suivi
 * de sa commande (où il pourra renseigner son adresse de livraison).
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input, Label, Alert } from "@/components/ui";
import { IconCheck } from "@/components/icons";

export function RedeemPanel({
  initialCode,
  isAuthenticated,
}: {
  initialCode: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/redeem?code=${encodeURIComponent(code)}`)}`);
      return;
    }
    if (code.trim().length < 6) {
      setError("Saisissez un code de réclamation valide.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; orderId?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Réclamation impossible.");
        return;
      }
      setDone(true);
      // Laisse le temps d'afficher le succès puis redirige vers le suivi.
      setTimeout(() => {
        if (data.orderId) router.push(`/dashboard/orders/${data.orderId}`);
        else router.push("/dashboard/portfolio");
        router.refresh();
      }, 1500);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="mx-auto w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-positive text-white">
          <IconCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-ink">Cadeau reçu 🎁</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Le token est en cours d&apos;émission dans votre wallet. Redirection vers le suivi de
          votre commande…
        </p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-semibold text-ink">Réclamer un cadeau 🎁</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Un proche vous a offert un token. Saisissez le code de réclamation pour le recevoir dans
        votre propre wallet.
        {!isAuthenticated
          ? " Vous devrez d'abord vous connecter (un wallet sécurisé sera créé automatiquement)."
          : ""}
      </p>
      <div className="mt-6">
        <Label htmlFor="redeem-code">Code de réclamation</Label>
        <Input
          id="redeem-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Collez votre code ici"
          className="font-mono"
        />
      </div>
      {error ? (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}
      <Button size="lg" className="mt-5 w-full" onClick={submit} loading={busy}>
        {isAuthenticated ? "Recevoir mon cadeau" : "Se connecter pour recevoir"}
      </Button>
      <p className="mt-3 text-center text-xs text-ink-muted">
        Le token sera émis dans votre wallet ; vous pourrez ensuite renseigner votre adresse de
        livraison pour l&apos;objet physique.
      </p>
    </Card>
  );
}
