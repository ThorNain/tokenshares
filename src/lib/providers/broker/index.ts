/**
 * Point d'accès au courtier. Le MVP utilise exclusivement la simulation ;
 * remplacer ici par l'implémentation du courtier réglementé le moment venu.
 */
import type { BrokerProvider } from "@/lib/providers/types";
import { MockBrokerProvider } from "@/lib/providers/broker/mock";

let instance: BrokerProvider | null = null;

export function getBrokerProvider(): BrokerProvider {
  if (!instance) {
    instance = new MockBrokerProvider();
  }
  return instance;
}
