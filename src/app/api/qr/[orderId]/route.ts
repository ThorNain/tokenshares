/**
 * GET /api/qr/[orderId]?format=png|svg — télécharge le QR code actif d'une
 * commande. Réservé au propriétaire de la commande ou à un administrateur.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { qrPngBuffer, qrSvg } from "@/lib/qr";
import { logError, safeErrorMessage } from "@/lib/error-log";

export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { qrCodes: { where: { active: true }, take: 1 } },
  });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (session.role !== "admin" && order.userId !== session.userId) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const qr = order.qrCodes[0];
  if (!qr) {
    return NextResponse.json({ error: "Aucun QR code actif pour cette commande." }, { status: 404 });
  }

  const format = new URL(request.url).searchParams.get("format") === "svg" ? "svg" : "png";
  try {
    if (format === "svg") {
      const svg = await qrSvg(qr.publicToken);
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="qr-${order.publicId}.svg"`,
        },
      });
    }
    const png = await qrPngBuffer(qr.publicToken);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${order.publicId}.png"`,
      },
    });
  } catch (error) {
    await logError({
      service: "qrcode",
      type: "qr_generation_error",
      message: "Erreur de génération du QR code.",
      technicalMessage: safeErrorMessage(error),
      orderId: order.id,
    });
    return NextResponse.json({ error: "Erreur de génération du QR code." }, { status: 500 });
  }
}
