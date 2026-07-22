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
import { useCreateWallet, usePrivy, useWallets } from "@privy-io/react-auth";
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
  const { createWallet } = useCreateWallet();
  const { ready: walletsReady, wallets } = useWallets();
  const [error, setError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const exchanging = useRef(false);

  useEffect(() => {
    // Privy termine la création automatique du wallet avant de marquer la
    // collection de wallets comme prête. Attendre les deux états évite de
    // créer une session applicative sans wallet lors de la première connexion.
    if (!ready || !authenticated || !walletsReady || exchanging.current) return;
    exchanging.current = true;
    setProvisioning(true);
    (async () => {
      try {
        const embedded = wallets.find((wallet) => wallet.walletClientType === "privy");
        // Filet de sécurité pour un ancien compte Privy ou une création
        // automatique qui n'aurait pas été appliquée lors d'une session passée.
        if (!embedded) {
          await createWallet();
        }

        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error("Jeton Privy indisponible.");
        const res = await fetch("/api/auth/privy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Échec de la création de session.");
        }
        router.push(next);
        router.refresh();
      } catch (e) {
        exchanging.current = false;
        setProvisioning(false);
        setError(e instanceof Error ? e.message : "Erreur de connexion.");
      }
    })();
  }, [
    ready,
    authenticated,
    walletsReady,
    createWallet,
    getAccessToken,
    wallets,
    router,
    next,
    retryNonce,
  ]);

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
      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={!ready || provisioning || (authenticated && !walletsReady)}
        loading={provisioning}
        onClick={() => {
          setError(null);
          if (authenticated) setRetryNonce((value) => value + 1);
          else login();
        }}
      >
        {authenticated && error ? "Réessayer" : "Se connecter"}
      </Button>
      <p className="mt-4 text-center text-sm text-ink-muted">
        Nouveau sur la plateforme ?{" "}
        <button
          type="button"
          className="font-medium text-accent hover:underline"
          disabled={!ready || provisioning}
          onClick={() => {
            setError(null);
            login();
          }}
        >
          Créer un compte
        </button>
      </p>
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
      body: JSON.stringify({ ...values, intent: mode }),
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
      <h1 className="text-xl font-semibold text-ink">
        {mode === "signin" ? "Connexion" : "Créer un compte"}
      </h1>
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
        {mode === "signup" ? (
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
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {mode === "signin" ? "Se connecter" : "Créer mon compte"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">
        {mode === "signin" ? "Vous n’avez pas encore de compte ?" : "Vous avez déjà un compte ?"}{" "}
        <button
          type="button"
          className="font-medium text-accent hover:underline"
          onClick={() => {
            setError(null);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
        >
          {mode === "signin" ? "Créer un compte" : "Se connecter"}
        </button>
      </p>
    </Card>
  );
}
