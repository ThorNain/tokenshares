/**
 * Transporteur SIMULÉ : génère un numéro de suivi fictif et une date de
 * livraison estimée. À remplacer par l'API du transporteur réel.
 */
import { simulatedRef } from "@/lib/public-token";
import type { ShippingProvider, ShipmentInfo } from "@/lib/providers/types";

export class MockShippingProvider implements ShippingProvider {
  readonly name = "mock-carrier";

  async createShipment(orderId: string): Promise<ShipmentInfo> {
    void orderId;
    const estimated = new Date();
    estimated.setDate(estimated.getDate() + 5);
    return {
      carrier: "Colissimo (démo)",
      trackingNumber: simulatedRef("DEMO"),
      estimatedDeliveryAt: estimated,
    };
  }
}

let instance: MockShippingProvider | null = null;

export function getShippingProvider(): ShippingProvider {
  if (!instance) {
    instance = new MockShippingProvider();
  }
  return instance;
}
