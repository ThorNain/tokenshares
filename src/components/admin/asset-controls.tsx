"use client";

/** Contrôles admin d'un actif : activer/désactiver, marge spécifique. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Alert, Card, Label, Select } from "@/components/ui";

export function AssetToggle({ assetId, active }: { assetId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant={active ? "outline" : "primary"}
      loading={busy}
      onClick={async () => {
        if (!window.confirm(active ? "Désactiver cet actif ? Il ne sera plus achetable." : "Réactiver cet actif ?")) return;
        setBusy(true);
        await fetch(`/api/admin/assets/${assetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !active }),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      {active ? "Désactiver" : "Activer"}
    </Button>
  );
}

export function AssetMarginInput({
  assetId,
  marginRateOverride,
}: {
  assetId: string;
  marginRateOverride: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(
    marginRateOverride !== null ? String(Math.round(marginRateOverride * 10000) / 100) : "",
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const parsed = value.trim() === "" ? null : Number(value.replace(",", ".")) / 100;
    await fetch(`/api/admin/assets/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marginRateOverride: parsed }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="globale"
        inputMode="decimal"
        aria-label="Marge spécifique en %"
        className="h-8 w-20 text-xs"
      />
      <span className="text-xs text-ink-muted">%</span>
      <Button size="sm" variant="ghost" loading={busy} onClick={save}>
        OK
      </Button>
    </div>
  );
}

export function AddAssetForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    ticker: "",
    name: "",
    indexName: "SP500",
    country: "",
    currency: "USD",
    basePrice: "",
    totemEmoji: "",
    totemName: "",
    totemImage: "",
  });

  async function submit() {
    setError(null);
    const basePrice = Number(form.basePrice.replace(",", "."));
    if (!form.ticker || !form.name || !form.country || !Number.isFinite(basePrice) || basePrice <= 0) {
      setError("Tous les champs sont requis (prix de base positif).");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        basePrice,
        totemEmoji: form.totemEmoji.trim() || undefined,
        totemName: form.totemName.trim() || undefined,
        totemImage: form.totemImage.trim() || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Création impossible.");
      return;
    }
    setOpen(false);
    setForm({ ticker: "", name: "", indexName: "SP500", country: "", currency: "USD", basePrice: "", totemEmoji: "", totemName: "", totemImage: "" });
    router.refresh();
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Ajouter un actif</Button>;
  }

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-ink">Nouvel actif</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Ticker</Label>
          <Input value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="AAPL" />
        </div>
        <div className="sm:col-span-2">
          <Label>Nom</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Apple Inc." />
        </div>
        <div>
          <Label>Indice</Label>
          <Select value={form.indexName} onChange={(e) => setForm({ ...form, indexName: e.target.value })}>
            <option value="SP500">S&amp;P 500</option>
            <option value="CAC40">CAC 40</option>
            <option value="NIKKEI225">Nikkei 225</option>
          </Select>
        </div>
        <div>
          <Label>Pays</Label>
          <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="États-Unis" />
        </div>
        <div>
          <Label>Devise</Label>
          <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="JPY">JPY</option>
          </Select>
        </div>
        <div>
          <Label>Prix de base</Label>
          <Input value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} inputMode="decimal" placeholder="200" />
        </div>
        <div>
          <Label>Totem (emoji)</Label>
          <Input value={form.totemEmoji} onChange={(e) => setForm({ ...form, totemEmoji: e.target.value })} placeholder="🍎" />
        </div>
        <div className="sm:col-span-2">
          <Label>Objet de collection</Label>
          <Input value={form.totemName} onChange={(e) => setForm({ ...form, totemName: e.target.value })} placeholder="Pomme porte-clés en argent" />
        </div>
        <div className="sm:col-span-3">
          <Label>Photo du totem</Label>
          <Input value={form.totemImage} onChange={(e) => setForm({ ...form, totemImage: e.target.value })} placeholder="/totems/aapl.webp" />
          <p className="mt-1 text-xs text-ink-muted">Chemin d&apos;une image placée dans le dossier public/totems.</p>
        </div>
      </div>
      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
      <div className="mt-4 flex gap-2">
        <Button onClick={submit} loading={busy}>Créer</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
      </div>
    </Card>
  );
}
