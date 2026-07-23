"use client";

/**
 * Contexte applicatif côté client. Si Privy est configuré
 * (NEXT_PUBLIC_PRIVY_APP_ID), enveloppe l'application dans PrivyProvider :
 * connexion par e-mail/passkey et création automatique de l'embedded wallet
 * non-custodial. Sinon, rend simplement les enfants (mode démonstration).
 */
import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function AppProviders({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Connexion par e-mail (code à usage unique). Le passkey (reconnexion
        // instantanée sans code) nécessite dans cette version du SDK une
        // intégration dédiée (useLoginWithPasskey) + activation dashboard.
        loginMethods: ["email"],
        embeddedWallets: {
          // Wallet créé automatiquement à la première connexion.
          createOnLogin: "users-without-wallets",
        },
        appearance: {
          theme: "light",
          accentColor: "#1f4fd8",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
