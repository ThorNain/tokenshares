/**
 * Fiche détaillée d'une commande (sections 20, 21, 25, 28) : blocs client,
 * produit, paiement, couverture, token, livraison ; timeline 12 étapes ;
 * actions manuelles (confirmées + journalisées) ; simulations du mode démo ;
 * journal d'audit et erreurs associées.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { fullOrderInclude } from "@/lib/order-includes";
import { buildOrderTimeline } from "@/lib/timeline";
import { qrPngDataUrl } from "@/lib/qr";
import { OrderTimeline } from "@/components/order-timeline";
import { AdminActionButton } from "@/components/admin/action-button";
import { Card, Badge, Alert, TableWrap, Table, TH, TD } from "@/components/ui";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  HedgingStatusBadge,
  MintStatusBadge,
  PhysicalStatusBadge,
  TxStatusBadge,
  SeverityBadge,
} from "@/components/status-badge";
import { formatMoney, formatPercent, formatDateTime, shortHex } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-ink">{children}</dd>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params }: { params: { orderId: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: fullOrderInclude,
  });
  if (!order) notFound();

  const item = order.items[0];
  const payment = order.payment;
  const hedging = order.hedgingOrder;
  const mint = order.tokenMint;
  const physical = order.physicalItem;
  const wallet = order.user.wallets[0];
  const activeQr = order.qrCodes.find((q) => q.active) ?? null;
  const qrDataUrl = activeQr ? await qrPngDataUrl(activeQr.publicToken) : null;
  const timeline = buildOrderTimeline(order);

  const [customerOrders, errors, webhookEvents] = await Promise.all([
    prisma.order.findMany({
      where: { userId: order.userId, id: { not: order.id } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { items: { include: { asset: true } } },
    }),
    prisma.errorLog.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } }),
    prisma.webhookEvent.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-ink-muted hover:text-ink">
            ← Toutes les commandes
          </Link>
          <h2 className="mt-1 flex flex-wrap items-center gap-3 text-xl font-semibold text-ink">
            Commande {order.publicId}
            <OrderStatusBadge status={order.status} />
            {order.needsReview ? <Badge tone="warning">Vérification requise</Badge> : null}
          </h2>
          <p className="mt-1 font-mono text-xs text-ink-muted">{order.id}</p>
        </div>
        <a
          href={`/api/admin/orders/export?format=json&orderId=${order.publicId}`}
          className="rounded-full border border-ink/15 px-4 py-1.5 text-sm font-medium text-ink hover:bg-ink/5"
        >
          Télécharger les données
        </a>
      </div>

      {order.internalNote ? (
        <Alert tone="info">
          <strong>Note interne :</strong> {order.internalNote}
        </Alert>
      ) : null}

      {/* Actions manuelles */}
      <Card className="p-5">
        <h3 className="font-semibold text-ink">Actions manuelles</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Chaque action demande confirmation et est journalisée (administrateur, date, ancien/nouveau
          statut, justification).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {hedging?.status === "failed" || (payment?.status === "succeeded" && !hedging) ? (
            <AdminActionButton orderId={order.id} action="retry_hedging" label="Relancer la couverture" confirmText="Relancer l'achat simulé de couverture pour cette commande ?" />
          ) : null}
          {mint?.status === "failed" ? (
            <AdminActionButton orderId={order.id} action="retry_mint" label="Relancer l'émission du token" confirmText="Relancer la création du token sur le réseau de test ?" />
          ) : null}
          {hedging?.status === "simulated_filled" && (!mint || mint.status === "not_started") ? (
            <AdminActionButton orderId={order.id} action="start_mint" label="Lancer la création du token" confirmText="Lancer l'émission du token ERC-1155 vers le wallet du client ?" />
          ) : null}
          {(hedging && ["not_started", "pending", "processing", "failed"].includes(hedging.status)) ? (
            <AdminActionButton orderId={order.id} action="cancel_operation" payload={{ target: "hedging" }} label="Annuler la couverture" confirmText="Annuler l'opération de couverture non exécutée ?" variant="ghost" />
          ) : null}
          {(mint && ["queued", "minting", "failed"].includes(mint.status)) ? (
            <AdminActionButton orderId={order.id} action="cancel_operation" payload={{ target: "mint" }} label="Annuler l'émission" confirmText="Annuler l'opération d'émission non exécutée ?" variant="ghost" />
          ) : null}
          <AdminActionButton orderId={order.id} action="generate_qr" label="Générer le QR code" confirmText="Générer (s'il n'existe pas) le QR code et préparer l'objet physique ?" />
          <AdminActionButton orderId={order.id} action="regenerate_qr" label="Régénérer le QR code" confirmText="L'ancien lien sera immédiatement désactivé. Cette action est destinée aux cas de compromission." requireJustification />
          {["shipping_pending", "minted"].includes(order.status) ? (
            <AdminActionButton
              orderId={order.id}
              action="mark_shipped"
              label="Marquer comme expédiée"
              confirmText="Confirmer l'expédition de l'objet physique ? Laissez les champs vides pour générer un numéro de suivi de démonstration."
              fields={[
                { name: "carrier", label: "Transporteur", placeholder: "Colissimo (démo)" },
                { name: "trackingNumber", label: "Numéro de suivi", placeholder: "auto si vide" },
              ]}
            />
          ) : null}
          {order.status === "shipped" ? (
            <AdminActionButton orderId={order.id} action="mark_delivered" label="Marquer comme livrée" confirmText="Confirmer la livraison de la commande ?" />
          ) : null}
          {physical ? (
            <AdminActionButton
              orderId={order.id}
              action="add_tracking"
              label="Ajouter un n° de suivi"
              confirmText="Ajouter ou remplacer le transporteur et le numéro de suivi."
              fields={[
                { name: "carrier", label: "Transporteur", required: true },
                { name: "trackingNumber", label: "Numéro de suivi", required: true },
              ]}
            />
          ) : null}
          {payment?.status === "succeeded" ? (
            <AdminActionButton orderId={order.id} action="refund" label="Rembourser (test)" confirmText="Rembourser ce paiement en mode test ? Si un token a déjà été émis, la commande sera signalée pour vérification." requireJustification variant="danger" />
          ) : null}
          <AdminActionButton
            orderId={order.id}
            action="toggle_review"
            payload={{ value: !order.needsReview }}
            label={order.needsReview ? "Lever le signalement" : "Marquer « à vérifier »"}
            confirmText={order.needsReview ? "Retirer le signalement de vérification ?" : "Signaler cette commande comme nécessitant une vérification manuelle ?"}
            variant="ghost"
          />
          <AdminActionButton
            orderId={order.id}
            action="add_note"
            label="Ajouter une note interne"
            confirmText="La note remplace la note existante et est journalisée."
            fields={[{ name: "note", label: "Note", required: true }]}
            variant="ghost"
          />
        </div>

        {env.demoMode ? (
          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Mode démonstration — simulations manuelles
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {payment?.status !== "succeeded" && order.status !== "refunded" ? (
                <AdminActionButton orderId={order.id} action="simulate_payment" label="Simuler le paiement" confirmText="Simuler la confirmation du paiement (déclenche automatiquement couverture, émission et préparation) ?" variant="secondary" />
              ) : null}
              {hedging?.status !== "simulated_filled" && payment?.status === "succeeded" ? (
                <AdminActionButton orderId={order.id} action="retry_hedging" label="Simuler l'achat de l'action" confirmText="Exécuter l'achat de couverture simulé chez le courtier fictif ?" variant="secondary" />
              ) : null}
              {hedging?.status === "simulated_filled" && mint?.status !== "transfer_confirmed" ? (
                <>
                  <AdminActionButton orderId={order.id} action="start_mint" label="Lancer la création du token" confirmText="Émettre le token sur la blockchain (simulée ou testnet selon la configuration) ?" variant="secondary" />
                  <AdminActionButton orderId={order.id} action="simulate_chain_error" label="Simuler une erreur blockchain" confirmText="Provoquer volontairement un échec d'émission (pour tester la gestion d'erreurs et la relance) ?" variant="secondary" />
                </>
              ) : null}
              {mint && mint.status !== "transfer_confirmed" && mint.status !== "not_started" ? (
                <AdminActionButton orderId={order.id} action="confirm_transfer" label="Confirmer le transfert" confirmText="Forcer la confirmation du transfert du token vers le wallet ?" variant="secondary" />
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        <h3 className="font-semibold text-ink">Progression de la commande</h3>
        <div className="mt-5">
          <OrderTimeline steps={timeline} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Bloc client */}
        <Card className="p-6">
          <h3 className="font-semibold text-ink">Client</h3>
          <dl className="mt-3 divide-y divide-ink/5">
            <Row label="Nom">{order.user.lastName ?? "—"}</Row>
            <Row label="Prénom">{order.user.firstName ?? "—"}</Row>
            <Row label="E-mail">{order.user.email}</Row>
            <Row label="Identifiant Privy">
              <span className="font-mono text-xs">{order.user.privyUserId ?? "— (mode démo)"}</span>
            </Row>
            <Row label="Compte créé le">{formatDateTime(order.user.createdAt)}</Row>
            <Row label="Wallet public">
              <span className="font-mono text-xs">{wallet?.address ?? "—"}</span>
            </Row>
            <Row label="Téléphone">{order.shippingAddress?.phone ?? "—"}</Row>
          </dl>
          {order.shippingAddress ? (
            <div className="mt-4 rounded-xl bg-cream p-4 text-sm text-ink-soft">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Adresse de livraison
              </p>
              <p>
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
              <p>
                {order.shippingAddress.postalCode} {order.shippingAddress.city},{" "}
                {order.shippingAddress.country}
              </p>
            </div>
          ) : null}
          {customerOrders.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Autres commandes du client
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {customerOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="text-accent hover:underline">
                      {o.publicId}
                    </Link>{" "}
                    <span className="text-xs text-ink-muted">
                      — {o.items[0]?.asset.ticker ?? "—"} · {formatDateTime(o.createdAt)}
                    </span>{" "}
                    <OrderStatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        {/* Bloc produit */}
        <Card className="p-6">
          <h3 className="font-semibold text-ink">Produit</h3>
          <dl className="mt-3 divide-y divide-ink/5">
            <Row label="Identifiant produit">
              <span className="font-mono text-xs">{item?.assetId ?? "—"}</span>
            </Row>
            <Row label="Actif">{item ? `${item.asset.name}` : "—"}</Row>
            <Row label="Ticker">{item?.asset.ticker ?? "—"}</Row>
            <Row label="Indice">{item?.asset.indexName ?? "—"}</Row>
            <Row label="Quantité">{item?.quantity ?? 0}</Row>
            <Row label="Prix de marché enregistré">
              {item ? formatMoney(item.lockedMarketPrice, item.currency) : "—"}
            </Row>
            <Row label="Devise affichée">EUR</Row>
            <Row label="Conversion">
              {order.currency === "EUR"
                ? "Commande directement libellée en euros"
                : `Conversion indicative depuis ${order.currency}`}
            </Row>
            <Row label="Marge appliquée">
              {formatPercent(order.marginRate)} ({formatMoney(order.marginAmount, order.currency)})
            </Row>
            <Row label="Prix total">{formatMoney(order.totalAmount, order.currency)}</Row>
            <Row label="Prix figé le">{item ? formatDateTime(item.priceLockedAt) : "—"}</Row>
          </dl>
        </Card>

        {/* Bloc paiement */}
        <Card className="p-6">
          <h3 className="flex items-center justify-between font-semibold text-ink">
            Paiement <PaymentStatusBadge status={payment?.status} />
          </h3>
          <dl className="mt-3 divide-y divide-ink/5">
            <Row label="Fournisseur">{payment?.provider ?? "—"}</Row>
            <Row label="Session Stripe">
              <span className="font-mono text-xs">{payment?.stripeSessionId ?? "—"}</span>
            </Row>
            <Row label="PaymentIntent">
              <span className="font-mono text-xs">{payment?.stripePaymentIntentId ?? "—"}</span>
            </Row>
            <Row label="Montant demandé">
              {payment ? formatMoney(payment.amount, payment.currency) : "—"}
            </Row>
            <Row label="Montant payé">
              {payment?.amountReceived != null
                ? formatMoney(payment.amountReceived, payment.currency)
                : "—"}
            </Row>
            <Row label="Moyen de paiement">{payment?.method ?? "—"}</Row>
            <Row label="Date de paiement">{formatDateTime(payment?.paidAt)}</Row>
            <Row label="Webhook vérifié">
              {payment ? (
                <Badge tone={payment.webhookVerified ? "success" : "warning"}>
                  {payment.webhookVerified ? "Oui (signature valide)" : "Non"}
                </Badge>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Remboursement">{formatDateTime(payment?.refundedAt)}</Row>
            {payment?.failureMessage ? (
              <Row label="Message d'échec">{payment.failureMessage}</Row>
            ) : null}
          </dl>
          {webhookEvents.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Événements webhook reçus
              </p>
              <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                {webhookEvents.map((e) => (
                  <li key={e.id} className="font-mono">
                    {formatDateTime(e.processedAt)} · {e.provider} · {e.type} · {shortHex(e.externalId, 10)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        {/* Bloc couverture */}
        <Card className="p-6">
          <h3 className="flex items-center justify-between font-semibold text-ink">
            Achat de couverture (simulé) <HedgingStatusBadge status={hedging?.status} />
          </h3>
          <dl className="mt-3 divide-y divide-ink/5">
            <Row label="Identifiant">
              <span className="font-mono text-xs">{hedging?.id ?? "—"}</span>
            </Row>
            <Row label="Fournisseur">{hedging?.provider ?? "—"}</Row>
            <Row label="Référence courtier">{hedging?.brokerRef ?? "—"}</Row>
            <Row label="Ticker">{hedging?.ticker ?? "—"}</Row>
            <Row label="Quantité théorique">{hedging?.quantity ?? "—"}</Row>
            <Row label="Prix théorique d'achat">
              {hedging ? formatMoney(hedging.referencePrice, hedging.currency) : "—"}
            </Row>
            <Row label="Montant couvert">
              {hedging ? formatMoney(hedging.notionalAmount, hedging.currency) : "—"}
            </Row>
            <Row label="Créée le">{formatDateTime(hedging?.createdAt)}</Row>
            <Row label="Exécutée le">{formatDateTime(hedging?.executedAt)}</Row>
            <Row label="Tentatives">{hedging?.attempts ?? 0}</Row>
            {hedging?.lastError ? <Row label="Dernière erreur">{hedging.lastError}</Row> : null}
          </dl>
        </Card>

        {/* Bloc token */}
        <Card className="p-6">
          <h3 className="flex items-center justify-between font-semibold text-ink">
            Création du token <MintStatusBadge status={mint?.status} />
          </h3>
          <dl className="mt-3 divide-y divide-ink/5">
            <Row label="Identifiant du mint">
              <span className="font-mono text-xs">{mint?.id ?? "—"}</span>
            </Row>
            <Row label="Token ID (ERC-1155)">{mint?.tokenId ?? item?.asset.tokenId ?? "—"}</Row>
            <Row label="Contrat">
              <span className="font-mono text-xs">{mint?.contractAddress ?? "—"}</span>
            </Row>
            <Row label="Réseau">{mint?.network ?? "—"}</Row>
            <Row label="Quantité créée">{mint?.quantity ?? "—"}</Row>
            <Row label="Wallet de destination">
              <span className="font-mono text-xs">{mint?.toAddress ?? "—"}</span>
            </Row>
            <Row label="Hash de transaction">
              <span className="font-mono text-xs">{mint?.txHash ?? "—"}</span>
            </Row>
            <Row label="Bloc">{mint?.blockNumber ?? "—"}</Row>
            <Row label="Confirmations">{mint?.confirmations ?? 0}</Row>
            <Row label="Frais réseau (wei)">{mint?.feeWei ?? "—"}</Row>
            <Row label="Soumise le">{formatDateTime(mint?.submittedAt)}</Row>
            <Row label="Confirmée le">{formatDateTime(mint?.confirmedAt)}</Row>
            <Row label="Tentatives">{mint?.attempts ?? 0}</Row>
            <Row label="Clé d'idempotence">
              <span className="font-mono text-xs">{mint?.idempotencyKey ?? "—"}</span>
            </Row>
            {mint?.lastError ? <Row label="Dernière erreur">{mint.lastError}</Row> : null}
          </dl>
        </Card>

        {/* Bloc livraison */}
        <Card className="p-6">
          <h3 className="flex items-center justify-between font-semibold text-ink">
            Livraison <PhysicalStatusBadge status={physical?.status} />
          </h3>
          <dl className="mt-3 divide-y divide-ink/5">
            <Row label="Objet physique">
              {physical
                ? item?.asset.totemName
                  ? `${item.asset.totemEmoji ?? ""} ${item.asset.totemName} (QR code)`.trim()
                  : "Objet de collection (QR code)"
                : "—"}
            </Row>
            <Row label="QR code actif">
              <span className="font-mono text-xs">{activeQr?.id ?? "—"}</span>
            </Row>
            <Row label="Transporteur">{physical?.carrier ?? "—"}</Row>
            <Row label="Numéro de suivi">
              <span className="font-mono text-xs">{physical?.trackingNumber ?? "—"}</span>
            </Row>
            <Row label="Expédiée le">{formatDateTime(physical?.shippedAt)}</Row>
            <Row label="Livraison estimée">{formatDateTime(physical?.estimatedDeliveryAt)}</Row>
            <Row label="Livrée le">{formatDateTime(physical?.deliveredAt)}</Row>
          </dl>
          {qrDataUrl ? (
            <div className="mt-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code de la commande ${order.publicId}`}
                className="h-28 w-28 rounded-lg border border-ink/10"
              />
              <div className="text-xs text-ink-muted">
                <p>
                  Lien public :{" "}
                  <Link href={`/claim/${activeQr!.publicToken}`} className="text-accent hover:underline">
                    /claim/{shortHex(activeQr!.publicToken, 6)}
                  </Link>
                </p>
                <p className="mt-1">
                  <a href={`/api/qr/${order.id}?format=png`} className="text-accent hover:underline">
                    Télécharger PNG
                  </a>{" "}
                  ·{" "}
                  <a href={`/api/qr/${order.id}?format=svg`} className="text-accent hover:underline">
                    SVG
                  </a>
                </p>
                {order.qrCodes.length > 1 ? (
                  <p className="mt-1">{order.qrCodes.length - 1} ancien(s) lien(s) révoqué(s)</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>

        {/* Erreurs associées */}
        <Card className="p-6">
          <h3 className="font-semibold text-ink">Erreurs & logs techniques</h3>
          {errors.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Aucune erreur enregistrée.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {errors.map((e) => (
                <li key={e.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={e.severity} />
                    <span className="text-xs text-ink-muted">
                      {e.service} · {e.type} · {formatDateTime(e.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-ink">{e.message}</p>
                  {e.technicalMessage ? (
                    <p className="mt-1 font-mono text-xs text-ink-muted">{e.technicalMessage}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Journal d'audit */}
      <Card className="p-6">
        <h3 className="font-semibold text-ink">Journal d&apos;audit</h3>
        {order.auditLogs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">Aucune entrée.</p>
        ) : (
          <TableWrap className="mt-4 border-0 shadow-none">
            <Table>
              <thead>
                <tr>
                  <TH>Date</TH>
                  <TH>Acteur</TH>
                  <TH>Action</TH>
                  <TH>Ancienne valeur</TH>
                  <TH>Nouvelle valeur</TH>
                  <TH>Justification</TH>
                </tr>
              </thead>
              <tbody>
                {[...order.auditLogs].reverse().map((log) => (
                  <tr key={log.id}>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</TD>
                    <TD className="text-xs">
                      {log.actorEmail ?? (log.actorType === "system" ? "Système" : log.actorType)}
                    </TD>
                    <TD className="font-mono text-xs">{log.action}</TD>
                    <TD className="max-w-[220px] truncate text-xs" title={log.oldValue ?? ""}>
                      {log.oldValue ?? "—"}
                    </TD>
                    <TD className="max-w-[220px] truncate text-xs" title={log.newValue ?? ""}>
                      {log.newValue ?? "—"}
                    </TD>
                    <TD className="text-xs">{log.justification ?? "—"}</TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      {/* Transactions blockchain de la commande */}
      {order.transactions.length > 0 ? (
        <Card className="p-6">
          <h3 className="font-semibold text-ink">Transactions blockchain</h3>
          <TableWrap className="mt-4 border-0 shadow-none">
            <Table>
              <thead>
                <tr>
                  <TH>Type</TH>
                  <TH>Hash</TH>
                  <TH>Bloc</TH>
                  <TH>Confirmations</TH>
                  <TH>Frais (wei)</TH>
                  <TH>Statut</TH>
                  <TH>Date</TH>
                </tr>
              </thead>
              <tbody>
                {order.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <TD className="text-xs">{tx.type}</TD>
                    <TD className="font-mono text-xs">{tx.txHash ? shortHex(tx.txHash, 10) : "—"}</TD>
                    <TD className="tabular text-xs">{tx.blockNumber ?? "—"}</TD>
                    <TD className="tabular text-xs">{tx.confirmations}</TD>
                    <TD className="tabular text-xs">{tx.feeWei ?? "—"}</TD>
                    <TD>
                      <TxStatusBadge status={tx.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(tx.createdAt)}</TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      ) : null}
    </div>
  );
}
