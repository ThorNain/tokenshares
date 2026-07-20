/**
 * Schémas Zod partagés (validation client via react-hook-form + serveur).
 */
import { z } from "zod";

export const addressSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(100),
  lastName: z.string().trim().min(1, "Nom requis").max(100),
  line1: z.string().trim().min(3, "Adresse requise").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  postalCode: z.string().trim().min(2, "Code postal requis").max(20),
  city: z.string().trim().min(1, "Ville requise").max(100),
  country: z.string().trim().min(2, "Pays requis").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9 ().-]{6,20}$/, "Numéro de téléphone invalide")
    .optional()
    .or(z.literal("")),
});

export type AddressInput = z.infer<typeof addressSchema>;
