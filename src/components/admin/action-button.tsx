"use client";

/**
 * Bouton d'action manuelle administrateur : ouvre une confirmation
 * (obligatoire — section 25), avec justification facultative ou requise et
 * champs additionnels éventuels, puis appelle l'API d'actions et rafraîchit.
 *
 * Accessibilité : la fenêtre modale est un dialog étiqueté (aria-labelledby),
 * se ferme avec la touche Échap ou un clic sur le fond, place le focus à
 * l'ouverture et le restaure sur le bouton déclencheur à la fermeture.
 */
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button, Alert, Label, Input, Textarea, type ButtonProps } from "@/components/ui";

export interface ActionField {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}

export function AdminActionButton({
  orderId,
  action,
  label,
  confirmText,
  requireJustification,
  fields,
  payload,
  variant = "outline",
  size = "sm",
}: {
  orderId: string;
  action: string;
  label: string;
  confirmText: string;
  requireJustification?: boolean;
  fields?: ActionField[];
  payload?: Record<string, unknown>;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Échap pour fermer + focus initial dans la modale + restauration du focus.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    // Focus le premier champ interactif de la modale.
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      "input, textarea, button",
    );
    focusable?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, busy]);

  async function run() {
    setError(null);
    if (requireJustification && justification.trim().length < 3) {
      setError("Une justification est requise pour cette action.");
      return;
    }
    for (const f of fields ?? []) {
      if (f.required && !fieldValues[f.name]?.trim()) {
        setError(`Le champ « ${f.label} » est requis.`);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(justification.trim() ? { justification: justification.trim() } : {}),
          ...Object.fromEntries(
            Object.entries(fieldValues).filter(([, v]) => v.trim().length > 0),
          ),
          ...payload,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "L'action a échoué.");
        return;
      }
      if (data.message) {
        setMessage(data.message);
      } else {
        setOpen(false);
      }
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button ref={triggerRef} variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={titleId} className="font-semibold text-ink">
              {label}
            </h3>
            <p className="mt-2 text-sm text-ink-muted">{confirmText}</p>

            {(fields ?? []).map((f) => (
              <div key={f.name} className="mt-4">
                <Label htmlFor={`field-${f.name}`}>
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                <Input
                  id={`field-${f.name}`}
                  placeholder={f.placeholder}
                  value={fieldValues[f.name] ?? ""}
                  onChange={(e) => setFieldValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              </div>
            ))}

            <div className="mt-4">
              <Label htmlFor={`justification-${titleId}`}>
                Justification{requireJustification ? " *" : " (facultative)"}
              </Label>
              <Textarea
                id={`justification-${titleId}`}
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </div>

            {error ? (
              <Alert tone="danger" className="mt-4">
                {error}
              </Alert>
            ) : null}
            {message ? (
              <Alert tone="info" className="mt-4">
                {message}
              </Alert>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                {message ? "Fermer" : "Annuler"}
              </Button>
              {!message ? (
                <Button onClick={run} loading={busy}>
                  Confirmer
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
