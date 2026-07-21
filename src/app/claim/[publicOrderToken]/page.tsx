/**
 * Ancienne URL du QR code (/claim/{token}) — conservée pour rétrocompatibilité
 * avec d'éventuels liens déjà diffusés. Redirige de façon permanente vers le
 * nouveau format court /p/{code}.
 */
import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyClaimRedirect({
  params,
}: {
  params: { publicOrderToken: string };
}) {
  permanentRedirect(`/p/${params.publicOrderToken}`);
}
