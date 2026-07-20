/**
 * Timeline de progression d'une commande (12 étapes). Code visuel accessible :
 * icône + libellé + couleur pour chaque état (jamais la couleur seule).
 */
import { cn, formatDateTime, formatDuration } from "@/lib/utils";
import type { TimelineStep } from "@/lib/timeline";
import { IconCheck, IconClock, IconAlert, IconX, IconSpinner } from "@/components/icons";

const STATUS_META = {
  done: { label: "Terminé", classes: "bg-positive text-white", Icon: IconCheck },
  current: { label: "En cours", classes: "bg-accent text-white", Icon: IconSpinner },
  pending: { label: "En attente", classes: "bg-ink/10 text-ink-muted", Icon: IconClock },
  error: { label: "En erreur", classes: "bg-negative text-white", Icon: IconAlert },
  cancelled: { label: "Annulé", classes: "bg-ink/20 text-ink-soft", Icon: IconX },
} as const;

export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const meta = STATUS_META[step.status];
        const previousDate = i > 0 ? steps[i - 1]?.date : null;
        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 h-full w-px bg-ink/10"
              />
            ) : null}
            <span
              className={cn(
                "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                meta.classes,
              )}
              title={meta.label}
            >
              <meta.Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-ink">
                  {i + 1}. {step.label}
                </p>
                <span className="text-xs text-ink-muted">{meta.label}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
                {step.date ? <span>{formatDateTime(step.date)}</span> : null}
                {step.date && previousDate ? (
                  <span>Durée : {formatDuration(previousDate, step.date)}</span>
                ) : null}
                {step.attempts && step.attempts > 1 ? (
                  <span>{step.attempts} tentatives</span>
                ) : null}
                {step.actor ? <span>Par : {step.actor}</span> : null}
              </div>
              {step.error ? (
                <p className="mt-1 rounded-lg bg-negative/10 px-3 py-1.5 text-xs text-negative">
                  {step.error}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
