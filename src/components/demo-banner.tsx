/**
 * Bannière permanente d'avertissement : ce site est un prototype.
 * Exigence explicite du cahier des charges — visible sur toutes les pages.
 */
export function DemoBanner() {
  return (
    <div className="bg-ink px-4 py-2 text-center text-xs font-medium tracking-wide text-white">
      Prototype de démonstration — aucun investissement réel. Paiements en mode test, tokens émis
      sur un réseau d&apos;essai.
    </div>
  );
}
