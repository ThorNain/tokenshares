/**
 * Page d'atterrissage du QR code — URL courte /p/{code} (ex. /p/AB7X92).
 *
 * Rôle : « certificat » public de l'objet physique. Toute personne qui scanne
 * voit, EN LECTURE SEULE, ce que l'objet représente (le token, sa valeur
 * indicative en direct, la preuve on-chain) — SANS aucune donnée personnelle
 * et SANS pouvoir agir (vente, transfert, accès au wallet).
 *
 * L'indirection est volontaire : le QR ne pointe que vers cette page, jamais
 * vers le wallet ni la clé. Cela permet de désactiver un lien (fraude), de
 * changer de fournisseur de wallet sans réimprimer les objets, de suivre les
 * scans, et d'exiger une authentification avant tout accès au portefeuille.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getMarketDataProvider } from "@/lib/providers/market";
import { isRealChain } from "@/lib/providers/blockchain";
import { Alert, Badge, Card } from "@/components/ui";
import { OrderStatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney, explorerTxUrl, shortHex } from "@/lib/utils";
import { IconQr, IconShield, IconExternal, IconCheck } from "@/components/icons";
import { Totem } from "@/components/totem";

export const dynamic = "force-dynamic";

const TOKEN_HELD = ["minted", "shipping_pending", "shipped", "delivered"];

export default async function ClaimPage({ params }: { params: { code: string } }) {
  const qr = await prisma.qrCode.findUnique({
    where: { publicToken: params.code },
    include: {
      order: { include: { items: { include: { asset: true } }, tokenMint: true } },
    },
  });

  if (!qr) {
    return (
      <Shell>
        <Alert tone="danger">
          Ce lien n&apos;est associé à aucune commande. Vérifiez le QR code ou contactez le
          support.
        </Alert>
      </Shell>
    );
  }

  // Suivi des scans (analytics) — comptabilisé même si le lien est désactivé,
  // pour détecter les scans d'un ancien QR compromis.
  await prisma.qrCode
    .update({
      where: { id: qr.id },
      data: { scanCount: { increment: 1 }, lastScannedAt: new Date() },
    })
    .catch(() => undefined);

  if (!qr.active) {
    return (
      <Shell>
        <Alert tone="warning">
          Ce lien a été désactivé (par exemple après régénération du QR code). Si vous êtes le
          propriétaire de l&apos;objet, connectez-vous pour retrouver votre commande, ou contactez
          le support.
        </Alert>
        <LoginCta code={params.code} />
      </Shell>
    );
  }

  const order = qr.order;
  const item = order.items[0];
  const session = await getSession();
  // Vérification serveur : le compte authentifié est-il propriétaire ?
  const isOwner = session?.userId === order.userId;

  // Valeur indicative EN DIRECT (cours de marché courant × quantité).
  // Donnée publique et non personnelle. Repli silencieux si le fournisseur
  // de prix est momentanément indisponible.
  let currentPrice: number | null = null;
  if (item) {
    try {
      const quote = await getMarketDataProvider().getQuote(item.asset.ticker);
      currentPrice = quote.price;
    } catch {
      currentPrice = item.lockedMarketPrice;
    }
  }

  const mint = order.tokenMint;
  const tokenLive = TOKEN_HELD.includes(order.status) && mint?.status === "transfer_confirmed";
  const realChain = isRealChain();

  return (
    <Shell>
      <Card className="overflow-hidden">
        {/* En-tête certificat */}
        <div className="border-b border-ink/10 bg-cream px-8 py-6 text-center">
          {item ? (
            <Totem
              image={item.asset.totemImage}
              emoji={item.asset.totemEmoji}
              initials={item.asset.initials}
              name={item.asset.totemName}
              size="xl"
              className="mx-auto"
            />
          ) : (
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-panel text-white">
              <IconQr className="h-7 w-7" />
            </span>
          )}
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Certificat d&apos;authenticité
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Objet authentifié</h1>
          {item?.asset.totemName ? (
            <p className="mt-1 text-sm font-medium text-ink-soft">{item.asset.totemName}</p>
          ) : null}
        </div>

        {/* Contenu : ce que représente l'objet (lecture seule) */}
        <div className="px-8 py-6">
          {item ? (
            <>
              <p className="text-center text-xs uppercase tracking-wide text-ink-muted">
                Cet objet représente
              </p>
              <p className="mt-1 text-center text-lg font-semibold text-ink">
                {item.quantity} token{item.quantity > 1 ? "s" : ""} · d{item.asset.ticker}
              </p>
              <p className="text-center text-sm text-ink-muted">
                {item.asset.name} — token de démonstration indexé sur l&apos;action
              </p>

              <dl className="mt-6 space-y-2 border-t border-ink/10 pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Cours indicatif actuel</dt>
                  <dd className="tabular text-ink">
                    {currentPrice != null ? formatMoney(currentPrice, item.currency) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt className="text-ink">Valeur indicative</dt>
                  <dd className="tabular text-ink">
                    {currentPrice != null
                      ? formatMoney(currentPrice * item.quantity, item.currency)
                      : "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-ink-muted">Statut</span>
                <OrderStatusBadge status={order.status} />
              </div>

              {/* Preuve on-chain */}
              {tokenLive && mint?.txHash ? (
                <div className="mt-4 rounded-xl bg-positive/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-positive">
                    <IconCheck className="h-4 w-4" /> Token émis et vérifié sur la blockchain
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Réseau {mint.network} · transaction {shortHex(mint.txHash, 8)}
                  </p>
                  {realChain ? (
                    <a
                      href={explorerTxUrl(mint.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      Vérifier sur l&apos;explorateur blockchain <IconExternal className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-ink-muted">Transaction simulée (réseau de test).</p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-ink/5 p-4 text-xs text-ink-muted">
                  Le token n&apos;a pas encore été émis pour cet objet (commande en cours de
                  traitement).
                </div>
              )}
            </>
          ) : null}

          <p className="mt-6 text-center text-[11px] text-ink-muted">
            Objet n° {order.publicId} · émis le {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Accès propriétaire (au-delà du certificat public) */}
        <div className="border-t border-ink/10 px-8 py-6">
          {isOwner ? (
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="block rounded-full bg-accent px-6 py-2.5 text-center text-sm font-medium text-white hover:bg-accent-hover"
            >
              Accéder à ma commande et à mon portefeuille
            </Link>
          ) : session ? (
            <div className="text-center">
              <Badge tone="neutral">Consultation publique — lecture seule</Badge>
              <p className="mt-2 text-xs text-ink-muted">
                Seul le propriétaire de l&apos;objet peut accéder au portefeuille et effectuer des
                opérations, après authentification.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-center text-xs text-ink-muted">
                Vous êtes le propriétaire de cet objet ?
              </p>
              <LoginCta code={params.code} />
            </>
          )}
        </div>
      </Card>

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
        <IconShield className="mt-0.5 h-4 w-4 shrink-0" />
        Ce QR code est un simple lien sécurisé vers l&apos;application. Il ne contient ni clé
        privée, ni phrase de récupération, ni donnée personnelle. Cette page est en lecture seule :
        aucune opération n&apos;est possible sans authentification du propriétaire.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-16 sm:px-6">{children}</div>;
}

function LoginCta({ code }: { code: string }) {
  return (
    <div className="text-center">
      <Link
        href={`/login?next=${encodeURIComponent(`/p/${code}`)}`}
        className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Se connecter
      </Link>
    </div>
  );
}
