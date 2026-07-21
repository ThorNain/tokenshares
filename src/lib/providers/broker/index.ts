/**
 * Point d'accès au courtier, sélectionné par la variable d'environnement
 * BROKER_PROVIDER :
 *  - "mock"   (défaut) : exécution automatique immédiate au prix indicatif ;
 *  - "manual"          : l'ordre attend une exécution réelle par l'opérateur,
 *                        qui saisit ensuite le prix obtenu (Degiro, etc.).
 * Pour brancher un vrai courtier avec API : implémenter BrokerProvider ici.
 */
import type { BrokerProvider } from "@/lib/providers/types";
import { MockBrokerProvider } from "@/lib/providers/broker/mock";
import { ManualBrokerProvider } from "@/lib/providers/broker/manual";

let instance: BrokerProvider | null = null;

export function getBrokerProvider(): BrokerProvider {
  if (!instance) {
    instance =
      process.env.BROKER_PROVIDER === "manual"
        ? new ManualBrokerProvider()
        : new MockBrokerProvider();
  }
  return instance;
}

/** Le courtier exige-t-il une exécution manuelle (saisie du prix par l'opérateur) ? */
export function isManualBroker(): boolean {
  return process.env.BROKER_PROVIDER === "manual";
}
