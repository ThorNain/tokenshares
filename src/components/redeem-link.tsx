"use client";

/**
 * Affiche le lien de réclamation d'un cadeau à l'acheteur, avec bouton copier.
 * Le lien contient le code (bearer) : quiconque l'a peut réclamer le cadeau.
 */
import { useState } from "react";
import { Alert } from "@/components/ui";
import { IconLink } from "@/components/icons";

export function RedeemLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible : l'utilisateur peut copier manuellement */
    }
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-accent">
        <IconLink className="h-4 w-4" /> Lien de réclamation du cadeau
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Transmettez ce lien à la personne de votre choix. Elle se connectera, et le token sera émis
        dans son propre wallet. Ne le partagez qu&apos;avec le destinataire prévu.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 w-full rounded-lg border border-ink/15 bg-surface px-3 font-mono text-xs text-ink"
        />
        <button
          type="button"
          onClick={copy}
          className="h-9 shrink-0 rounded-lg bg-accent px-3 text-xs font-medium text-white hover:bg-accent-hover"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
    </div>
  );
}
