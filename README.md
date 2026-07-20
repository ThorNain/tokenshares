# TokenShares — Prototype de démonstration

> **Prototype de démonstration — aucun investissement réel.**
> Plateforme d'achat de tokens numériques indexés sur des actions cotées
> (S&P 500, CAC 40, Nikkei 225). Paiements Stripe **en mode test uniquement**,
> tokens ERC-1155 émis sur un **testnet EVM** (ou simulés en local), achats
> d'actions **simulés**. Les tokens ne constituent ni des actions, ni des
> instruments financiers, ni des droits de propriété.

---

## Démarrage rapide (100 % local, aucun compte externe)

```bash
npm install        # installe les dépendances + génère le client Prisma
npm run seed       # crée la base SQLite + données de démonstration
npm run dev        # http://localhost:3000
```

C'est tout. Par défaut, l'application fonctionne entièrement en local :

| Brique          | Sans configuration              | Avec configuration                     |
| --------------- | ------------------------------- | -------------------------------------- |
| Authentification| Connexion démo (e-mail seul)    | Privy (e-mail, embedded wallet)        |
| Paiement        | Page de paiement simulée        | Stripe Checkout (mode test)            |
| Blockchain      | Simulation locale (hash fictifs)| Base Sepolia / Sepolia via viem        |
| Prix de marché  | Simulés (déterministes)         | Interface `MarketDataProvider` à brancher |

## Comptes de test

Après `npm run seed` :

- **Client de démonstration** : `claire.dupont@example.test`
  → page `/login`, saisir cet e-mail (aucun mot de passe en mode démo).
  Ce compte possède les 8 commandes de scénario `ORD-DEMO01` → `ORD-DEMO08`.
- **Administrateur de démonstration** : `admin@example.test`
  → page `/admin/login`. Le mot de passe est défini localement par la variable
  `ADMIN_PASSWORD` du fichier `.env` (valeur de dev : `demo-admin-2026!`).
  Les identifiants ne sont **jamais** codés dans le frontend ni stockés en base.

## Scénarios pré-chargés (seed)

| Commande   | État                                                        |
| ---------- | ----------------------------------------------------------- |
| ORD-DEMO01 | Entièrement terminée (livrée)                               |
| ORD-DEMO02 | Paiement échoué                                             |
| ORD-DEMO03 | Paiement confirmé, couverture en attente                    |
| ORD-DEMO04 | Token en cours de création                                  |
| ORD-DEMO05 | Transaction blockchain échouée (à relancer depuis l'admin)  |
| ORD-DEMO06 | Remboursée                                                  |
| ORD-DEMO07 | Prête à être expédiée (QR code généré)                      |
| ORD-DEMO08 | Expédiée (numéro de suivi)                                  |

Plus 92 commandes aléatoires couvrant tous les statuts, 20 clients,
30 wallets, 15 actifs et une douzaine d'erreurs simulées.

## Simuler une commande complète

1. `npm run dev`, ouvrir http://localhost:3000 ;
2. `/assets` → choisir un actif → **Acheter** ;
3. se connecter (n'importe quel e-mail en mode démo) ;
4. renseigner l'adresse de livraison → **Procéder au paiement (test)** ;
5. sur la page de paiement simulée : **Simuler un paiement réussi** ;
6. la confirmation attend le webhook (le retour navigateur ne valide jamais
   une commande), puis le pipeline enchaîne automatiquement :
   couverture simulée → mint ERC-1155 → QR code → préparation d'expédition ;
7. **Vérifier le token** : `/dashboard/portfolio` (position + valorisation) et
   `/dashboard/orders/<id>` (timeline 12 étapes, hash de transaction, QR code).
   Côté entreprise : `/admin/blockchain` et le bloc « Création du token » de la
   fiche commande. Sur un vrai testnet, le lien explorateur (BaseScan) devient actif.

### Tester un échec de paiement

Sur la page de paiement simulée, cliquer **« Simuler un paiement refusé »** :
le paiement passe à `failed`, la commande reste `pending_payment`, une entrée
apparaît dans `/admin/errors`, et le client peut réessayer depuis le checkout.
(Avec Stripe configuré : carte de test `4000 0000 0000 0002`.)

### Tester un échec de création de token

Deux moyens :

- **Admin (mode démo)** : fiche commande → « Simuler une erreur blockchain » ;
- **Variable d'env** : `DEMO_FAIL_MINT_TICKERS="NVDA"` → tout mint de NVDA échoue.

L'échec est visible dans la fiche commande (bloc token + timeline), dans
`/admin/errors` (gravité critique) et dans `/admin/reserves` (alerte d'écart).

### Relancer manuellement une opération échouée

Fiche commande (`/admin/orders/<id>`) → **« Relancer l'émission du token »**
(ou « Relancer la couverture »). Chaque relance est confirmée, journalisée
(acteur, ancien/nouveau statut, justification) et idempotente : la clé unique
`mint:<orderId>` en base garantit qu'un même paiement ne peut jamais produire
deux émissions, même si un webhook est rejoué.

## Tests

```bash
npm run test        # 33 tests unitaires (Vitest) : prix, statuts, CSV, filtres, sessions
npm run test:e2e    # Playwright (prérequis : npx playwright install chromium + npm run seed)
npm run typecheck   # TypeScript strict
```

Les tests e2e couvrent : pages publiques, filtres du catalogue, parcours
d'achat complet (succès **et** échec de paiement), protection des routes
admin (y compris client connecté → 403), liste/recherche/filtres des
commandes admin, fiche détaillée, relance d'un mint échoué, changement de
statut de livraison, génération de QR code, export CSV, réserves et erreurs.

Tests du smart contract : `cd contracts && npm install && npm test`.

---

## Configuration des services réels (optionnelle)

Copier `.env.example` vers `.env` puis renseigner au besoin.

### Privy (authentification + embedded wallet)

1. Créer une app sur https://dashboard.privy.io ;
2. activer les méthodes de connexion **Email** (et Passkey si souhaité) ;
3. activer les **Embedded wallets** (création automatique à la connexion) ;
4. renseigner :
   ```env
   NEXT_PUBLIC_PRIVY_APP_ID="clxxxxxxxx"
   PRIVY_APP_SECRET="xxxxxxxx"
   ```
5. redémarrer. La page `/login` bascule automatiquement sur Privy ; le bouton
   « Exporter ou récupérer mon wallet » (`/dashboard/security`) utilise le flux
   sécurisé Privy. La clé privée ne transite **jamais** par le serveur et
   n'est **jamais** stockée.

### Stripe (mode test uniquement)

1. Récupérer les clés **de test** (`sk_test_…`, `pk_test_…`) sur
   https://dashboard.stripe.com/test/apikeys ;
2. renseigner `STRIPE_SECRET_KEY` et `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ;
3. webhooks en local :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   puis copier le secret affiché dans `STRIPE_WEBHOOK_SECRET` ;
4. carte de test : `4242 4242 4242 4242` (succès), `4000 0000 0000 0002` (refus).

Garde-fou intégré : toute clé `sk_live_` est **refusée** au démarrage.
La confirmation de commande ne provient que du webhook signé.

### Données de marché — Yahoo Finance (optionnel)

```env
MARKET_DATA_PROVIDER="yahoo"
```

Les cours affichés deviennent les **cours réels différés (~15 min)** de Yahoo
Finance — les tickers du catalogue (`AAPL`, `MC.PA`, `7203.T`…) sont déjà au
format Yahoo. Cache de 60 s par ticker, et **repli automatique sur la
simulation** si Yahoo est injoignable (l'app reste utilisable hors-ligne).

⚠ Endpoint public non officiel, sans licence de redistribution : acceptable
pour ce prototype, à remplacer par un fournisseur sous licence en production
(implémenter `MarketDataProvider`, voir `src/lib/providers/market/`).

### Testnet EVM (Base Sepolia recommandé)

1. Déployer le contrat :
   ```bash
   cd contracts
   npm install
   cp .env.example .env    # RPC_URL + DEPLOYER_PRIVATE_KEY (testnet !)
   npm run deploy:base-sepolia
   ```
2. approvisionner le wallet minter en ETH de test
   (https://portal.cdp.coinbase.com/products/faucet) ;
3. dans le `.env` de l'application :
   ```env
   BLOCKCHAIN_PROVIDER="viem"
   RPC_URL="https://sepolia.base.org"
   CHAIN_ID="84532"
   TOKEN_CONTRACT_ADDRESS="0x…"   # adresse affichée au déploiement
   MINTER_PRIVATE_KEY="0x…"       # wallet opérateur testnet, PAS un wallet utilisateur
   ```
4. les mints partent alors réellement sur Base Sepolia ; les liens
   « explorateur » du dashboard et de l'admin deviennent actifs.

### Base de données PostgreSQL (production)

Le prototype utilise SQLite (zéro configuration). Pour PostgreSQL
(Neon, Supabase, RDS…) :

1. remplacer le contenu de `prisma/schema.prisma` par
   `prisma/schema.postgres.prisma` (enums natifs + `Decimal`) ;
2. `DATABASE_URL="postgresql://user:pass@host:5432/db"` ;
3. `npx prisma migrate dev --name init` puis `npm run seed`.

---

## Commandes

| Commande               | Rôle                                                |
| ---------------------- | --------------------------------------------------- |
| `npm install`          | dépendances + `prisma generate` (postinstall)       |
| `npm run dev`          | `prisma db push` (predev) + serveur de dev          |
| `npm run seed`         | (re)crée les données de démonstration               |
| `npm run build` / `start` | build & serveur de production                    |
| `npm run test`         | tests unitaires Vitest                              |
| `npm run test:e2e`     | tests Playwright                                    |
| `npm run typecheck`    | TypeScript strict                                   |
| `npm run db:studio`    | Prisma Studio (inspection de la base)               |

## Déploiement (démo hébergée)

1. **Base** : créer un Postgres géré (Neon/Supabase), basculer sur
   `schema.postgres.prisma`, `prisma migrate deploy`, `npm run seed` ;
2. **Vercel** : importer le repo, renseigner toutes les variables de
   `.env.example` (avec `NEXT_PUBLIC_APP_URL=https://…`, `SESSION_SECRET`
   aléatoire long, `DEMO_MODE` selon le besoin — verrouillé à `false` en
   production Vercel) ;
3. **Stripe** : créer un endpoint webhook `https://…/api/webhooks/stripe`
   (événements `checkout.session.completed`, `checkout.session.expired`,
   `payment_intent.payment_failed`) et reporter le secret ;
4. **Privy** : ajouter le domaine dans les « Allowed origins » du dashboard ;
5. **RPC** : configurer un fournisseur (Alchemy/QuickNode/Coinbase) pour
   Base Sepolia.

## Checklist avant toute mise en production réelle

Ce prototype est une **démonstration**. Avant toute utilisation avec de
l'argent ou des actifs réels, il faudrait au minimum :

**Réglementaire / juridique (bloquant)**
- [ ] analyse juridique complète : un token indexé sur une action est
      vraisemblablement un instrument financier / security (prospectus,
      MiFID II, MiCA, agréments PSAN/CASP, licences locales) ;
- [ ] KYC/AML complet (le prototype n'a volontairement **aucun** contournement
      d'identité : il n'implémente simplement pas de KYC) ;
- [ ] conditions générales, politique de remboursement et documentation des
      risques validées par un conseil juridique.

**À remplacer (interfaces prévues)**
- [ ] `MockBrokerProvider` → courtier réglementé réel (`BrokerProvider`) ;
- [ ] `MockMarketDataProvider` → fournisseur de données de marché sous licence ;
- [ ] paiements Stripe test → compte Stripe live + revue des flux d'argent ;
- [ ] testnet → infrastructure blockchain adaptée + audit du smart contract ;
- [ ] connexion démo → Privy obligatoire (supprimer `demo-login`) ;
- [ ] `MockShippingProvider` → transporteur réel.

**Technique / sécurité**
- [ ] `DEMO_MODE=false` (verrouillé en prod, mais à vérifier) et suppression
      des données de seed ;
- [ ] PostgreSQL + sauvegardes + `Decimal` pour les montants ;
- [ ] gestion des clés opérateur via KMS/HSM (jamais en variable d'env brute) ;
- [ ] rate limiting distribué (Redis/Upstash) au lieu du limiteur en mémoire ;
- [ ] file de jobs durable (mint/retries) au lieu de l'exécution inline ;
- [ ] monitoring/alerting (Sentry…), revue de la CSP, tests de charge,
      audit de sécurité externe ;
- [ ] rotation de `SESSION_SECRET` et `ADMIN_PASSWORD` fort (ou SSO admin).

## Structure du projet

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) : architecture générale, parcours
utilisateur, schéma de base de données, arborescence détaillée, choix
techniques, risques de sécurité et variables d'environnement.
