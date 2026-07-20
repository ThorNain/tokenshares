/**
 * Contrats des fournisseurs externes. Toute l'application dépend de ces
 * interfaces — jamais d'une implémentation concrète — afin de pouvoir
 * brancher ultérieurement un courtier réglementé, un fournisseur de données
 * de marché, un PSP ou une infrastructure blockchain sans réécrire le cœur.
 *
 * Implémentations disponibles :
 *  - MarketDataProvider : MockMarketDataProvider (prix simulés déterministes)
 *  - BrokerProvider     : MockBrokerProvider (couverture simulée)
 *  - PaymentProvider    : StripePaymentProvider (mode test) / MockPaymentProvider
 *  - BlockchainProvider : ViemBlockchainProvider (testnet EVM) / MockBlockchainProvider
 *  - ShippingProvider   : MockShippingProvider
 *  - WalletProvider     : Privy (SDK côté client + vérification serveur) / mode démo
 */

// --- Données de marché ---------------------------------------------------------

export interface MarketQuote {
  ticker: string;
  price: number;
  currency: string;
  asOf: Date;
  source: string;
  /** Variation simulée sur 24 h (fraction, ex. 0.012 = +1,2 %). */
  changePercent24h: number;
}

export interface MarketDataProvider {
  readonly name: string;
  getQuote(ticker: string): Promise<MarketQuote>;
  getQuotes(tickers: string[]): Promise<Map<string, MarketQuote>>;
}

// --- Courtier (achat des actions de couverture) ----------------------------------

export interface BuyAssetParams {
  orderId: string;
  ticker: string;
  quantity: number;
  referencePrice: number;
  currency: string;
}

export interface BrokerOrderResult {
  ok: boolean;
  brokerRef?: string;
  executedAt?: Date;
  executedPrice?: number;
  error?: string;
}

export interface BrokerProvider {
  readonly name: string;
  buyAsset(params: BuyAssetParams): Promise<BrokerOrderResult>;
}

// --- Paiement ----------------------------------------------------------------------

export interface CreateCheckoutParams {
  orderId: string;
  orderPublicId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  provider: string;
  sessionId: string;
  /** URL vers laquelle rediriger le client pour payer. */
  url: string;
}

export interface RefundParams {
  provider: string;
  stripePaymentIntentId?: string | null;
  amount: number;
  currency: string;
}

export interface RefundResult {
  ok: boolean;
  refundId?: string;
  error?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult>;
  refund(params: RefundParams): Promise<RefundResult>;
}

// --- Blockchain -----------------------------------------------------------------------

export interface MintParams {
  /** Clé d'idempotence (dérivée de l'identifiant de commande). */
  idempotencyKey: string;
  tokenId: number;
  quantity: number;
  /** Adresse publique du wallet de destination (wallet Privy du client). */
  toAddress: string;
  /** Force un échec simulé (tests de gestion d'erreurs). */
  simulateFailure?: boolean;
}

export interface MintResult {
  ok: boolean;
  txHash?: string;
  blockNumber?: number;
  confirmations?: number;
  feeWei?: string;
  error?: string;
}

export interface BlockchainProvider {
  readonly name: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly minterAddress: string;
  /** Émet `quantity` tokens ERC-1155 `tokenId` directement vers `toAddress`. */
  mintTo(params: MintParams): Promise<MintResult>;
}

// --- Livraison -------------------------------------------------------------------------

export interface ShipmentInfo {
  carrier: string;
  trackingNumber: string;
  estimatedDeliveryAt: Date;
}

export interface ShippingProvider {
  readonly name: string;
  createShipment(orderId: string): Promise<ShipmentInfo>;
}

// --- Wallet -----------------------------------------------------------------------------

/**
 * Le wallet est géré par Privy côté client (embedded wallet non-custodial) ;
 * le serveur ne voit QUE l'adresse publique. Cette interface ne sert qu'à
 * identifier la provenance d'un wallet enregistré.
 */
export interface WalletProvider {
  readonly name: "privy" | "demo";
}
