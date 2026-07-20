"use client";

/** Formulaire de connexion administrateur (identifiants côté serveur). */
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, Input, Label, Alert, FieldError } from "@/components/ui";

const schema = z.object({
  email: z.string().email("E-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});
type FormValues = z.infer<typeof schema>;

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Connexion refusée.");
      return;
    }
    const next = params.get("next");
    router.push(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md p-8">
      <h1 className="text-xl font-semibold text-ink">Espace entreprise</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Accès réservé aux administrateurs. Les identifiants de démonstration sont documentés dans
        le README (variables d&apos;environnement).
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <Label htmlFor="admin-email">E-mail</Label>
          <Input id="admin-email" type="email" autoComplete="username" {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="admin-password">Mot de passe</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Se connecter
        </Button>
      </form>
    </Card>
  );
}
