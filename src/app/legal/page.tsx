/** Mentions légales & conditions générales du prototype. */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales & CGU" };

export default function LegalPage() {
  return (
    <div className="prose-sm mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Mentions légales &amp; conditions générales
      </h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Statut de prototype</h2>
          <p>
            TokenShares est un prototype de démonstration. Il ne fournit aucun service
            d&apos;investissement, aucun instrument financier et n&apos;encaisse aucun paiement
            réel. Les paiements utilisent exclusivement le mode test du prestataire, et les tokens
            sont émis sur un réseau blockchain d&apos;essai sans valeur.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Fonctionnement des tokens</h2>
          <p>
            Les tokens émis (ERC-1155, réseau de test) sont des tokens de démonstration dont la
            valeur affichée est indexée sur un prix simulé. Ils ne constituent ni une action, ni
            une créance, ni un droit de propriété ou de vote sur une entreprise cotée, et ne sont
            ni cessibles contre valeur ni remboursables.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Fonctionnement du wallet</h2>
          <p>
            Le wallet est créé et géré par Privy (ou simulé en mode démonstration). La clé privée
            n&apos;est jamais transmise à nos serveurs ni stockée par l&apos;application.
            L&apos;export du wallet s&apos;effectue exclusivement via le flux sécurisé de Privy.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Frais</h2>
          <p>
            Le prix payé correspond au prix indicatif simulé de l&apos;actif majoré d&apos;une
            marge commerciale de 10 % (taux affiché avant tout paiement). Aucun autre frais
            n&apos;est prélevé dans cette démonstration.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Politique de remboursement</h2>
          <p>
            Les paiements étant effectués en mode test, tout « remboursement » est également
            simulé. Dans une version commerciale, une politique de remboursement conforme à la
            réglementation applicable devra être définie et validée juridiquement.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Éditeur</h2>
          <p>
            Prototype édité à des fins de démonstration interne. Contact :
            support@example.test.
          </p>
        </section>
      </div>
    </div>
  );
}
