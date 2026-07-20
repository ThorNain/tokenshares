"use client";

/**
 * Formulaire d'adresse de livraison (react-hook-form + Zod — le même schéma
 * est revalidé côté serveur). Modifiable tant que la commande n'est pas
 * expédiée.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, type AddressInput } from "@/lib/validation";
import { Button, Input, Label, Alert, FieldError, Select } from "@/components/ui";

const COUNTRIES = ["France", "Belgique", "Suisse", "Luxembourg", "Allemagne", "Espagne", "Italie", "Japon", "États-Unis", "Royaume-Uni"];

type AddressInitial = {
  [K in keyof AddressInput]?: string | null;
};

export function AddressForm({
  orderId,
  initial,
  onSavedRedirect,
}: {
  orderId: string;
  initial?: AddressInitial | null;
  onSavedRedirect?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      firstName: initial?.firstName ?? "",
      lastName: initial?.lastName ?? "",
      line1: initial?.line1 ?? "",
      line2: initial?.line2 ?? "",
      postalCode: initial?.postalCode ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "France",
      phone: initial?.phone ?? "",
    },
  });

  async function onSubmit(values: AddressInput) {
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/orders/${orderId}/address`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Enregistrement impossible.");
      return;
    }
    setSaved(true);
    if (onSavedRedirect) {
      router.push(onSavedRedirect);
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" autoComplete="given-name" {...register("firstName")} />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div>
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" autoComplete="family-name" {...register("lastName")} />
          <FieldError message={errors.lastName?.message} />
        </div>
      </div>
      <div>
        <Label htmlFor="line1">Adresse</Label>
        <Input id="line1" autoComplete="address-line1" {...register("line1")} />
        <FieldError message={errors.line1?.message} />
      </div>
      <div>
        <Label htmlFor="line2">Complément d&apos;adresse (optionnel)</Label>
        <Input id="line2" autoComplete="address-line2" {...register("line2")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="postalCode">Code postal</Label>
          <Input id="postalCode" autoComplete="postal-code" {...register("postalCode")} />
          <FieldError message={errors.postalCode?.message} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" autoComplete="address-level2" {...register("city")} />
          <FieldError message={errors.city?.message} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="country">Pays</Label>
          <Select id="country" autoComplete="country-name" {...register("country")}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <FieldError message={errors.country?.message} />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone (optionnel)</Label>
          <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
          <FieldError message={errors.phone?.message} />
        </div>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {saved ? <Alert tone="success">Adresse enregistrée.</Alert> : null}
      <Button type="submit" loading={isSubmitting}>
        Enregistrer l&apos;adresse
      </Button>
    </form>
  );
}
