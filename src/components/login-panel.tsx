"use client";

/**
 * Panneau de connexion :
 *  - Privy configuré  → connexion e-mail / passkey + embedded wallet ;
 *  - sinon            → connexion de DÉMONSTRATION (e-mail seul, wallet fictif),
 *    clairement identifiée comme telle.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Button, Card, Input, Label, Alert, FieldError } from "@/components/ui";

const PRIVY_ENABLED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export function LoginPanel() {
  return PRIVY_ENABLED ? <PrivyLoginPanel /> : <DemoLoginPanel />;
}

function useNextPath(): string {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard/portfolio";
  // Uniquement des chemins internes (anti open-redirect).
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard/portfolio";
}

// --- Privy ----------------------------------------------------------------------

function PrivyLoginPanel() {
  const router = useRouter();
  const next = useNextPath();
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [error, setError] = useState<string | null>(null);
  const exchanging = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || exchanging.current) return;
    exchanging.current = true;
    (async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error("Jeton Privy indisponible.");
        const embedded = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
        const res = await fetch("/api/auth/privy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, walletAddress: embedded?.address }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Échec de la création de session.");
        }
        router.push(next);
        router.refresh();
      } catch (e) {
        exchanging.current = false;
        setError(e instanceof Error ? e.message : "Erreur de connexion.");
      }
    })();
  }, [ready, authenticated, getAccessToken, wallets, router, next]);

  return (
    <Card className="mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-semibold text-ink">Connexion</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Connectez-vous par e-mail ou passkey. Un wallet numérique sécurisé (Privy) est créé
        automatiquement à votre première connexion — votre clé privée ne quitte jamais votre
        appareil et n&apos;est jamais transmise à nos serveurs.
      </p>
      {error ? (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}
      <Button size="lg" className="mt-6 w-full" disabled={!ready} onClick={() => login()}>
        Continuer avec Privy
      </Button>
    </Card>
  );
}

// --- Démonstration -----------------------------------------------------------------

const demoSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});
type DemoForm = z.infer<typeof demoSchema>;

function DemoLoginPanel() {
  const router = useRouter();
  const next = useNextPath();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DemoForm>({ resolver: zodResolver(demoSchema) });

  async function onSubmit(values: DemoForm) {
    setError(null);
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Connexion impossible.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-semibold text-ink">Connexion</h1>
      <Alert tone="warning" className="mt-4">
        Mode démonstration : Privy n&apos;est pas configuré. La connexion se fait par e-mail seul
        et un wallet fictif est associé à votre compte. Aucun mot de passe n&apos;est demandé ni
        stocké.
      </Alert>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input id="email" type="email" placeholder="vous@exemple.fr" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">Prénom (optionnel)</Label>
            <Input id="firstName" {...register("firstName")} />
          </div>
          <div>
            <Label htmlFor="lastName">Nom (optionnel)</Label>
            <Input id="lastName" {...register("lastName")} />
          </div>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Se connecter
        </Button>
      </form>
    </Card>
  );
}
