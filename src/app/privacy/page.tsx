/** Politique de confidentialité du prototype. */
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Politique de confidentialité
      </h1>
      <div className="mt-6 space-y-6 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Données collectées</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>adresse e-mail et identifiant Privy (authentification) ;</li>
            <li>adresse publique du wallet (jamais la clé privée) ;</li>
            <li>adresse de livraison et téléphone facultatif (expédition de l&apos;objet) ;</li>
            <li>historique de commandes et journaux techniques (audit, sécurité).</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Ce que nous ne stockons jamais</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>mots de passe (l&apos;authentification est déléguée à Privy) ;</li>
            <li>clés privées ou phrases de récupération ;</li>
            <li>données de carte bancaire (traitées par Stripe, en mode test ici).</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Sous-traitants</h2>
          <p>
            Privy (authentification, wallet), Stripe (paiement, mode test), fournisseur RPC
            blockchain de test. Chacun ne reçoit que les données strictement nécessaires.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Vos droits</h2>
          <p>
            Environnement de démonstration : les données peuvent être purgées à tout moment. Pour
            un service réel, les droits RGPD (accès, rectification, effacement, portabilité)
            devront être outillés et documentés. Contact : privacy@example.test.
          </p>
        </section>
      </div>
    </div>
  );
}
