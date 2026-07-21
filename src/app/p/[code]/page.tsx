/**
 * Page d'atterrissage du QR code — URL courte /p/{code} (ex. /p/AB7X92).
 *
 * L'indirection est volontaire : le QR ne pointe que vers cette page, jamais
 * vers le wallet ni la clé. Cela permet de désactiver un lien (fraude), de
 * changer de fournisseur de wallet sans réimprimer les objets, de suivre les
 * scans, et d'afficher cette page d'activation avant tout accès au portefeuille.
 *
 * N'affiche AUCUNE donnée sensible sans authentification : uniquement des
 * informations génériques. Le propriétaire authentifié accède ensuite à son
 * espace après vérification serveur de la propriété.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Alert, Card } from "@/components/ui";
import { OrderStatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { IconQr, IconShield } from "@/components/icons";
import { Totem } from "@/components/totem";

export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: { code: string } }) {
  const qr = await prisma.qrCode.findUnique({
    where: { publicToken: params.code },
    include: { order: { include: { items: { include: { asset: true } } } } },
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

  return (
    <Shell>
      <Card className="p-8 text-center">
        {item ? (
          <Totem image={item.asset.totemImage} emoji={item.asset.totemEmoji} initials={item.asset.initials} name={item.asset.totemName} size="xl" className="mx-auto" />
        ) : (
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white">
            <IconQr className="h-7 w-7" />
          </span>
        )}
        <h1 className="mt-5 text-2xl font-semibold text-ink">Objet authentifié</h1>
        {item?.asset.totemName ? (
          <p className="mt-1 text-sm font-medium text-ink-soft">{item.asset.totemName}</p>
        ) : null}
        <p className="mt-2 text-sm text-ink-muted">
          Cet objet est associé à la commande{" "}
          <strong className="text-ink">{order.publicId}</strong> passée le{" "}
          {formatDate(order.createdAt)}.
        </p>
        {item ? (
          <p className="mt-4 text-sm text-ink">
            {item.quantity} token{item.quantity > 1 ? "s" : ""} de démonstration{" "}
            <strong>
              {item.asset.name} ({item.asset.ticker})
            </strong>
          </p>
        ) : null}
        <div className="mt-3 flex justify-center">
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="mt-8 border-t border-ink/10 pt-6">
          {isOwner ? (
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Accéder à ma commande et à mon portefeuille
            </Link>
          ) : session ? (
            <Alert tone="info" className="text-left">
              Vous êtes connecté avec un compte qui n&apos;est pas propriétaire de cette
              commande. Les détails ne sont visibles que par son propriétaire.
            </Alert>
          ) : (
            <LoginCta code={params.code} />
          )}
        </div>
      </Card>

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
        <IconShield className="mt-0.5 h-4 w-4 shrink-0" />
        Ce QR code est un simple lien sécurisé vers l&apos;application. Il ne contient ni clé
        privée, ni phrase de récupération, ni donnée personnelle — l&apos;accès au portefeuille
        exige toujours une authentification.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-4 py-16 sm:px-6">{children}</div>;
}

function LoginCta({ code }: { code: string }) {
  return (
    <div className="mt-4 text-center">
      <Link
        href={`/login?next=${encodeURIComponent(`/p/${code}`)}`}
        className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Se connecter
      </Link>
    </div>
  );
}
