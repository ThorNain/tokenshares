/** Avertissement sur les risques. */
import type { Metadata } from "next";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Avertissement sur les risques" };

export default function RiskDisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Avertissement sur les risques
      </h1>
      <Alert tone="warning" className="mt-6">
        Prototype de démonstration — aucun investissement réel. Les éléments ci-dessous décrivent
        les risques qui s&apos;appliqueraient à un service réel de ce type.
      </Alert>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-soft">
        <p>
          <strong className="text-ink">Absence de droits.</strong> Un token indexé sur une action
          ne confère ni propriété de l&apos;action, ni droit de vote, ni dividende, sauf cadre
          contractuel et réglementaire explicite.
        </p>
        <p>
          <strong className="text-ink">Risque de marché.</strong> La valeur de référence d&apos;un
          tel token peut varier fortement à la hausse comme à la baisse. Les performances passées
          ne préjugent pas des performances futures.
        </p>
        <p>
          <strong className="text-ink">Risque de contrepartie.</strong> La valeur du token dépend
          de la capacité de l&apos;émetteur à détenir effectivement les actifs de couverture et à
          honorer ses engagements.
        </p>
        <p>
          <strong className="text-ink">Risque technologique.</strong> Blockchains, smart contracts
          et wallets présentent des risques propres : bugs, perte d&apos;accès, attaques. La perte
          de la clé privée entraîne la perte d&apos;accès aux tokens.
        </p>
        <p>
          <strong className="text-ink">Risque réglementaire.</strong> L&apos;offre de tokens
          adossés à des instruments financiers est strictement encadrée (notamment prospectus,
          MiFID II, MiCA, agréments PSAN/CASP). Un service réel ne pourrait être lancé
          qu&apos;après validation juridique complète et obtention des autorisations requises.
        </p>
        <p>
          <strong className="text-ink">Marge commerciale.</strong> Le prix payé inclut une marge de
          10 % : le prix de revente éventuel d&apos;un token pourrait être inférieur au prix
          d&apos;achat, indépendamment de l&apos;évolution de l&apos;action de référence.
        </p>
      </div>
    </div>
  );
}
