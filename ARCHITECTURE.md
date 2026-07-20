# Architecture — TokenShares (prototype de démonstration)

## 1. Architecture générale

```
┌──────────────────────────── Navigateur ────────────────────────────┐
│  Next.js App Router (React, Tailwind) — client & admin             │
│  Privy SDK (embedded wallet, la clé privée reste côté client)      │
└───────────────┬────────────────────────────────────────────────────┘
                │ HTTPS (CSP, cookies httpOnly signés)
┌───────────────▼────────────────────────────────────────────────────┐
│  Next.js Route Handlers + Server Components (Node)                 │
│                                                                    │
│  middleware.ts ── protection /admin, /api/admin, /dashboard        │
│                                                                    │
│  lib/orders.ts        création de commande (prix figé)             │
│  lib/fulfillment.ts   pipeline paiement→couverture→mint→livraison  │
│  lib/…                pricing, audit, QR, réserves, stats, timeline│
│                                                                    │
│  Interfaces fournisseurs (lib/providers/types.ts)                  │
│  ┌──────────────────┬───────────────────┬───────────────────────┐  │
│  │ MarketDataProvider│ BrokerProvider   │ PaymentProvider       │  │
│  │  · Mock (défaut)  │  · Mock (défaut) │  · Stripe test        │  │
│  │  · [API réelle]   │  · [courtier]    │  · Mock (défaut)      │  │
│  ├──────────────────┼───────────────────┼───────────────────────┤  │
│  │ BlockchainProvider│ ShippingProvider │ WalletProvider        │  │
│  │  · Mock (défaut)  │  · Mock          │  · Privy / démo       │  │
│  │  · viem→Base Sepolia                 │                       │  │
│  └──────────────────┴───────────────────┴───────────────────────┘  │
└──────┬──────────────────┬──────────────────────┬──────────────────┘
       │ Prisma           │ webhooks signés      │ JSON-RPC
┌──────▼──────┐   ┌───────▼───────┐   ┌──────────▼──────────┐
│ SQLite (dev)│   │ Stripe (TEST) │   │ Base Sepolia (test) │
│ Postgres    │   └───────────────┘   │ DemoEquityToken     │
│ (prod)      │                       │ (ERC-1155, OZ 5)    │
└─────────────┘                       └─────────────────────┘
```

Principe directeur : **le cœur métier ne dépend que d'interfaces**. Chaque
brique externe (courtier, données de marché, PSP, blockchain, transporteur) a
une implémentation mock exécutable hors-ligne et, quand c'est pertinent, une
implémentation réelle activée par variables d'environnement.

## 2. Parcours utilisateur

```
Catalogue (/assets)                    filtres : indice, pays, nom, ticker
   │  « Acheter »
   ▼
Connexion (/login)                     Privy (email/passkey + wallet auto)
   │                                   ou mode démo (email seul)
   ▼
Création de commande (POST /api/orders)
   │  prix de marché FIGÉ + marge 10 % affichée → statut `created`
   ▼
Checkout (/checkout/[orderId])
   │  adresse (Zod client+serveur) → paiement → statut `pending_payment`
   ▼
Stripe Checkout (test) ─ ou ─ page simulée (/mock-checkout/…)
   │
   ▼  WEBHOOK signé (jamais le retour navigateur)
Paiement confirmé → `paid` ──────────────► échec → payment `failed`, retry client
   ▼
HedgingOrder simulé (MockBrokerProvider) → `hedge_simulated`
   ▼
TokenMint idempotent (clé unique mint:<orderId>) → `mint_pending` → `minted`
   │  ERC-1155 minté DIRECTEMENT vers le wallet Privy du client
   ▼
QR code (/claim/<token>) + objet physique → `shipping_pending`
   ▼
Expédition (admin) → `shipped` → livraison → `delivered`

Dashboard client : portefeuille, commandes (timeline 12 étapes), sécurité.
QR code scanné → page publique neutre → login → vérification serveur du
propriétaire → accès au portefeuille.
```

## 3. Schéma de base de données

15 modèles (voir `prisma/schema.prisma`, variante Postgres avec enums dans
`prisma/schema.postgres.prisma`) :

```
User 1─n Wallet                    (adresses publiques uniquement)
User 1─n Order 1─n OrderItem n─1 Asset 1─n MarketPrice
Order 1─1 ShippingAddress
Order 1─1 Payment                  (stripeSessionId unique, webhookVerified)
Order 1─1 HedgingOrder n─1 Asset   (couverture simulée, attempts, lastError)
Order 1─1 TokenMint n─1 Asset      (idempotencyKey UNIQUE = anti double mint)
TokenMint 1─n BlockchainTransaction
Order 1─1 PhysicalItem             (miniature, transporteur, suivi)
Order 1─n QrCode                   (publicToken unique, active/révoqué)
Order 1─n AuditLog                 (acteur, action, old/new, justification)
Order 1─n ErrorLog                 (service, gravité, tentatives, résolution)
WebhookEvent                       (externalId UNIQUE = anti double traitement)
Setting                            (margin_rate, orders_paused)
```

Statuts (unions TS `src/lib/status.ts` ↔ enums Postgres) :
- Order : `created → pending_payment → paid → hedge_simulated → mint_pending → minted → shipping_pending → shipped → delivered` (+ `failed`, `refunded`, `cancelled`)
- Payment : `pending / processing / succeeded / failed / refunded`
- Hedging : `not_started / pending / processing / simulated_filled / failed / cancelled`
- Mint : `not_started / queued / minting / mint_submitted / mint_confirmed / transfer_pending / transfer_submitted / transfer_confirmed / failed / cancelled`
- PhysicalItem : `not_started / preparing / ready / shipped / delivered`
- ErrorLog : `info / warning / error / critical`

## 4. Arborescence

```
crypto/
├─ prisma/
│  ├─ schema.prisma              # SQLite (démo, zéro config)
│  ├─ schema.postgres.prisma     # variante production (enums, Decimal)
│  └─ seed.ts                    # 100 commandes, 20 clients, 15 actifs…
├─ contracts/                    # projet Hardhat autonome
│  ├─ contracts/DemoEquityToken.sol   # ERC-1155 (OZ 5 : Supply+Pausable+Roles)
│  ├─ scripts/deploy.ts, test/…, hardhat.config.ts
├─ e2e/                          # Playwright : public, parcours client, admin
├─ src/
│  ├─ middleware.ts              # protection admin/dashboard (JWT edge)
│  ├─ lib/
│  │  ├─ providers/              # types + market/ broker/ payment/ blockchain/ shipping/
│  │  ├─ orders.ts fulfillment.ts timeline.ts portfolio.ts reserves.ts
│  │  ├─ admin-stats.ts order-filters.ts catalog.ts settings.ts
│  │  ├─ pricing.ts status.ts session(-token).ts audit.ts error-log.ts
│  │  ├─ qr.ts csv.ts rate-limit.ts public-token.ts privy.ts validation.ts
│  │  └─ *.test.ts               # tests unitaires Vitest
│  ├─ components/                # ui.tsx, icons.tsx, formulaires, tables, timeline
│  │  └─ admin/                  # action-button (confirmation+justification), orders-table…
│  └─ app/
│     ├─ page.tsx assets/ assets/[ticker]/ login/
│     ├─ checkout/[orderId]/(+confirmation) mock-checkout/[sessionId]/
│     ├─ dashboard/(portfolio|orders|orders/[id]|security)
│     ├─ claim/[publicOrderToken]/ legal/ risk-disclosure/ privacy/
│     ├─ admin/(login|orders|orders/[id]|users|assets|reserves|blockchain|errors|shipments|settings)
│     └─ api/
│        ├─ auth/(demo-login|privy|logout) admin/login
│        ├─ orders(+/[id]/address,/[id]/pay) qr/[orderId]
│        ├─ webhooks/(stripe|mock-payment)
│        └─ admin/(orders/[id]/actions | orders/export | assets | settings | errors)
├─ README.md ARCHITECTURE.md .env(.example)
└─ package.json tsconfig.json tailwind.config.ts playwright.config.ts vitest.config.ts
```

## 5. Choix techniques et justifications

| Choix | Justification |
| --- | --- |
| **Next.js 14 App Router** | Server Components pour les vues data-lourdes (admin), Route Handlers pour l'API et les webhooks, middleware edge pour la protection des routes. |
| **TypeScript strict + Zod** | Types stricts de bout en bout ; toute entrée externe (API, formulaires, webhooks) validée par Zod, également côté client (react-hook-form + zodResolver). |
| **SQLite par défaut, Postgres documenté** | Exigence « `npm install && npm run dev` » sans infrastructure. SQLite ne supportant ni enums ni Decimal, les statuts sont des unions TS validées et la variante `schema.postgres.prisma` (enums natifs, Decimal) est fournie pour la production. |
| **ERC-1155 unique (recommandé)** | Un seul contrat pour 15+ actifs (tokenId par actif) : déploiement/opérations simplifiés, suivi de supply par actif (`ERC1155Supply`) utilisé par le rapprochement des réserves. Un ERC-20 par action n'apporterait ici que des coûts (n déploiements, n adresses à gérer) sans bénéfice pour une démo non fongible entre actifs. |
| **OpenZeppelin 5** | Aucune cryptographie maison ; AccessControl (MINTER_ROLE), Pausable (arrêt d'urgence), Supply. |
| **viem** | Client EVM léger et typé pour le mint + attente de confirmation ; chaîne choisie par CHAIN_ID (Base Sepolia 84532 / Sepolia 11155111). |
| **Privy** | Auth e-mail/passkey + embedded wallet non-custodial créé à la connexion ; vérification serveur via `@privy-io/server-auth` ; export du wallet exclusivement par le flux Privy. |
| **Stripe Checkout** | Page hébergée (carte, Apple Pay, Google Pay selon compte), aucun champ carte dans l'app ; confirmation uniquement par webhook signé ; garde-fou anti-clé live. |
| **Sessions JWT (jose) en cookie httpOnly** | Aucune table de session nécessaire ; vérifiable dans le middleware edge ; secrets via env. |
| **Providers mockés par défaut** | Exigence de testabilité totale hors-ligne + interfaces de remplacement (courtier, données, PSP, chaîne, transporteur). |
| **Icônes SVG maison, polices système** | Zéro dépendance UI externe, build hors-ligne reproductible, esthétique sobre « banque privée ». |

## 6. Risques de sécurité et mitigations

| Risque | Mitigation dans le prototype |
| --- | --- |
| Confirmation de paiement falsifiée | Seul le webhook signé (`stripe.webhooks.constructEvent`) fait foi ; le retour navigateur affiche « en attente ». |
| Double traitement / double mint | `WebhookEvent.externalId` UNIQUE + `TokenMint.idempotencyKey` UNIQUE + transactions Prisma. |
| Fuite de clé privée | Aucune clé utilisateur ne transite ni n'est stockée ; export uniquement via Privy ; la clé minter (testnet) reste côté serveur et n'est jamais loggée. |
| Accès aux commandes d'autrui | Vérification de propriété sur chaque page/route (`order.userId === session.userId`), testée en e2e. |
| Escalade vers l'admin | Middleware + revérification `requireAdminSession()` dans chaque handler ; identifiants admin hors frontend ; comparaison en temps constant ; rate limiting. |
| QR code | Ne contient qu'une URL avec jeton aléatoire 128 bits ; page publique sans donnée personnelle ; révocation + régénération journalisées. |
| Injection / entrées malveillantes | Zod partout, Prisma paramétré, pas de HTML injecté. |
| XSS / clickjacking | CSP stricte, `frame-ancestors 'none'`, cookies httpOnly SameSite=Lax. |
| Abus de débit | Rate limiting sur login, commandes, paiement, webhooks mock (à passer sur Redis en prod). |
| Échec blockchain | Statuts d'erreur + journal + relance manuelle idempotente ; stratégie de retry Stripe via réponse 500. |
| Incohérence réserves/tokens | Page `/admin/reserves` : ratio de couverture, écarts base↔chaîne, alertes (remboursé-mais-minté, mint-sans-couverture…). |
| Mode démo en production | `DEMO_MODE` ignoré si `VERCEL_ENV=production`. |
| Secrets | Uniquement variables d'environnement ; `.env` git-ignoré ; messages d'erreur sans secrets. |

Limites assumées du prototype (documentées dans la checklist du README) :
rate limiter en mémoire, pipeline exécuté inline (pas de file durable), montants
en Float sous SQLite, pas de KYC.

## 7. Variables d'environnement

Voir `.env.example` (copie commentée). Résumé :

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `DATABASE_URL` | SQLite ou Postgres | `file:./dev.db` |
| `NEXT_PUBLIC_APP_URL` | URL publique (QR codes, redirections, cookie Secure) | `http://localhost:3000` |
| `SESSION_SECRET` | signature des sessions JWT | valeur dev (à changer) |
| `DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE` | simulations manuelles admin (verrouillé en prod) | `true` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | compte admin de démonstration | `admin@example.test` / dev |
| `NEXT_PUBLIC_PRIVY_APP_ID` / `PRIVY_APP_SECRET` | Privy (optionnel) | vide → mode démo |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe test (optionnel) | vide → paiement simulé |
| `BLOCKCHAIN_PROVIDER` | `mock` ou `viem` | `mock` |
| `RPC_URL` / `CHAIN_ID` / `TOKEN_CONTRACT_ADDRESS` / `MINTER_PRIVATE_KEY` | testnet EVM | vides |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` / `NEXT_PUBLIC_CHAIN_NAME` | liens explorateur | BaseScan Sepolia |
| `DEMO_FAIL_MINT_TICKERS` | échecs de mint volontaires (tests) | vide |

Côté `contracts/` : `RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `TOKEN_METADATA_URI`.
