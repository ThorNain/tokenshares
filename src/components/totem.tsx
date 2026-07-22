/**
 * « Totem » d'un actif : l'objet de collection qui représente la marque et
 * qui est expédié avec la commande (🍎 pomme argentée pour Apple, 🚗 Toyota
 * miniature…). Repli sur les initiales si aucun totem n'est défini.
 */
import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-9 w-9 rounded-lg text-xl",
  md: "h-11 w-11 rounded-xl text-2xl",
  lg: "h-14 w-14 rounded-2xl text-3xl",
  xl: "h-20 w-20 rounded-3xl text-5xl",
  card: "h-48 w-full rounded-2xl text-7xl",
} as const;

const IMAGE_SIZES: Record<keyof typeof SIZES, string> = {
  sm: "36px",
  md: "44px",
  lg: "56px",
  xl: "80px",
  card: "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw",
};

export function Totem({
  image,
  emoji,
  initials,
  name,
  size = "md",
  className,
}: {
  image?: string | null;
  emoji?: string | null;
  initials: string;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (image) {
    return (
      <span
        className={cn(
          "relative block shrink-0 overflow-hidden border border-ink/10 bg-cream shadow-sm",
          SIZES[size],
          className,
        )}
      >
        <Image
          src={image}
          alt={name ? `Objet de collection : ${name}` : "Objet de collection"}
          fill
          sizes={IMAGE_SIZES[size]}
          className="object-cover"
        />
      </span>
    );
  }

  if (emoji) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center border border-ink/10 bg-cream shadow-sm",
          SIZES[size],
          className,
        )}
      >
        {emoji}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-panel font-semibold text-white",
        SIZES[size],
        size === "lg" || size === "xl" ? "text-lg" : "text-sm",
        className,
      )}
    >
      {initials}
    </span>
  );
}
