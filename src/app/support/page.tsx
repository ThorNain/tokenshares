/**
 * Page support / aide — FAQ, centrée sur le transfert de tokens entre
 * personnes « sans donner son wallet ». Composant serveur : lit le réseau et
 * l'adresse du contrat depuis la configuration pour donner des valeurs réelles.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import { isRealChain } from "@/lib/providers/blockchain";
import { Card, Alert, Badge } from "@/components/ui";
import { IconShield, IconLink, IconWallet, IconArrowRight } from "@/components/icons";
import { CHAIN_NAME } from "@/lib/utils";

export const metadata: Metadata = { title: "Aide & support" };

export const dynamic = "force-dynamic";

export default function SupportPage() {
  const contract = env.contractAddress;
  const realChain = isRealChain();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="w-fit rounded-full border border-ink/10 bg-surface px-4 py-1 text-xs font-medium text-ink-muted">
        Aide & support
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        Transférer vos tokens, en toute sécurité
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Vos tokens sont des actifs numériques standard (ERC-1155) détenus dans votre wallet
        non-custodial. Vous pouvez les transférer à une autre personne — voici comment, sans
        jamais compromettre votre sécurité.
      </p>

      {/* Question principale */}
      <Card className="mt-8 p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <IconShield className="h-5 w-5 text-accent" />
          Comment transférer vos tokens sans donner votre wallet ?
        </h2>

        <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-soft">
          <p>
            <strong className="text-ink">Le principe :</strong> transférer un token, ce n&apos;est
            jamais « donner son wallet ». On envoie <strong className="text-ink">l&apos;actif</strong>,
            pas le contenant. C&apos;est comme un virement bancaire : vous communiquez un IBAN pour
            recevoir de l&apos;argent, vous ne donnez jamais votre carte ni votre code.
          </p>

          <Alert tone="danger">
            <strong>Règle de sécurité absolue :</strong> un transfert ne demande{" "}
            <strong>QUE l&apos;adresse publique</strong> du destinataire (commençant par
            «&nbsp;0x&nbsp;»). Personne — jamais — n&apos;a besoin de votre clé privée ni de votre
            phrase de récupération pour recevoir un token. Quiconque vous les demande « pour faire
            un transfert » tente de vous arnaquer.
          </Alert>

          <div>
            <p className="font-medium text-ink">Les étapes :</p>
            <ol className="mt-2 space-y-3">
              <Step n={1} title="Le destinataire vous donne son adresse publique">
                Il lui suffit d&apos;une adresse de wallet sur le réseau {CHAIN_NAME}. Il peut en
                créer une gratuitement avec une application grand public comme{" "}
                <strong>Coinbase Wallet</strong>, <strong>MetaMask</strong> ou <strong>Rabby</strong>{" "}
                — l&apos;adresse ressemble à «&nbsp;0x1a2b…&nbsp;».
              </Step>
              <Step n={2} title="Vous récupérez votre wallet dans une application compatible">
                Votre wallet est géré par Privy. Depuis votre espace, section{" "}
                <Link href="/dashboard/security" className="font-medium text-accent hover:underline">
                  Sécurité
                </Link>
                , utilisez «&nbsp;Exporter ou récupérer mon wallet&nbsp;» pour l&apos;importer en
                toute sécurité dans Coinbase Wallet / MetaMask. (L&apos;export se fait dans une
                fenêtre sécurisée Privy ; votre clé ne transite jamais par nos serveurs.)
              </Step>
              <Step n={3} title="Vous envoyez le token vers l'adresse du destinataire">
                Dans votre application de wallet, choisissez le token à envoyer, collez
                l&apos;adresse publique reçue, validez. Vous <strong>signez</strong> la transaction
                vous-même : votre clé reste sur votre appareil.
              </Step>
              <Step n={4} title="La blockchain confirme, le token apparaît chez le destinataire">
                En quelques secondes, le token quitte votre wallet et arrive dans celui du
                destinataire. L&apos;opération est publique et vérifiable, mais{" "}
                <strong>irréversible</strong> : vérifiez bien l&apos;adresse avant d&apos;envoyer.
              </Step>
            </ol>
          </div>

          <div className="rounded-xl bg-accent-soft p-4 text-accent">
            <p className="flex items-center gap-2 text-sm font-medium">
              <IconWallet className="h-4 w-4" /> Informations à retrouver le token
            </p>
            <dl className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <dt>Réseau</dt>
                <dd className="font-medium">{CHAIN_NAME}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Standard</dt>
                <dd className="font-medium">ERC-1155</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Adresse du contrat</dt>
                <dd className="break-all font-mono">{contract}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Identifiant du token (tokenId)</dt>
                <dd className="font-medium">indiqué sur la page de votre commande</dd>
              </div>
            </dl>
            {!realChain ? (
              <p className="mt-2 text-[11px] text-accent/80">
                Environnement de démonstration : réseau de test. Les valeurs ci-dessus servent
                d&apos;exemple de la procédure.
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Autres questions */}
      <div className="mt-6 space-y-4">
        <Faq question="Que dois-je partager pour RECEVOIR un token ?">
          Uniquement votre <strong>adresse publique</strong> (0x…). Jamais votre phrase de
          récupération ni votre clé privée. Partager son adresse publique est sans risque : elle
          sert seulement à recevoir.
        </Faq>

        <Faq question="Puis-je utiliser Coinbase Wallet ou MetaMask ?">
          Oui. Ce sont des wallets compatibles avec le réseau {CHAIN_NAME}. Après avoir exporté
          votre wallet Privy vers l&apos;une de ces applications, vous pouvez y voir et y envoyer
          vos tokens. Pour afficher un token, ajoutez-le via l&apos;adresse du contrat indiquée
          ci-dessus.
        </Faq>

        <Faq question="Le transfert est-il réversible ?">
          Non. Une fois la transaction confirmée sur la blockchain, elle est définitive. Vérifiez
          toujours l&apos;adresse du destinataire, caractère par caractère, avant d&apos;envoyer.
        </Faq>

        <Faq question="Est-ce que la plateforme suit ce transfert ?">
          Si vous effectuez le transfert en dehors de la plateforme (dans Coinbase Wallet, par
          exemple), notre application ne le détecte pas automatiquement : votre commande et le
          certificat resteront rattachés au compte d&apos;origine, même si le token, lui, a bien
          changé de wallet sur la blockchain. La vérité fait foi <em>on-chain</em>.
        </Faq>

        <Faq question="Comment « donner » un objet à un proche ?">
          La bonne méthode est le transfert on-chain ci-dessus, vers le wallet de votre proche.
          Évitez de « donner votre e-mail de connexion » : cela revient à partager l&apos;accès à
          votre compte, ce n&apos;est ni propre ni sûr.
        </Faq>
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-xl border border-ink/10 bg-surface p-4 text-sm text-ink-muted">
        <IconLink className="h-4 w-4 shrink-0" />
        <span>
          Une autre question ? Écrivez-nous à{" "}
          <a href="mailto:support@example.test" className="font-medium text-accent hover:underline">
            support@example.test
          </a>
          .
        </span>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-muted">
        Prototype de démonstration. Les tokens sont émis sur un réseau de test et ne constituent ni
        une action, ni un instrument financier. Le transfert entre personnes de tokens indexés sur
        des actifs réels serait, dans un cadre commercial, soumis à un encadrement réglementaire
        spécifique.
      </p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
        {n}
      </span>
      <div>
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </li>
  );
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="flex items-start gap-2 font-semibold text-ink">
        <IconArrowRight className="mt-1 h-4 w-4 shrink-0 text-accent" />
        {question}
      </h3>
      <p className="mt-2 pl-6 text-sm leading-relaxed text-ink-soft">{children}</p>
    </Card>
  );
}
