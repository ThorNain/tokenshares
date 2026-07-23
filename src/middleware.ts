/**
 * Protection des routes (Edge Runtime) :
 *  - /admin/** et /api/admin/**  → session administrateur requise ;
 *  - /dashboard/**               → session utilisateur requise.
 * Défense en profondeur : les routes API revérifient systématiquement les
 * autorisations côté handler.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

// Secret de vérification des cookies. En dev local, repli stable pour que la
// connexion fonctionne sans configuration. Sur tout autre environnement sans
// SESSION_SECRET, on utilise un secret ALÉATOIRE (donc inconnu) : les cookies
// ne se valident jamais (échec fermé) plutôt que d'accepter un secret public
// qui permettrait de forger un cookie admin.
const SESSION_SECRET =
  process.env.SESSION_SECRET ??
  (process.env.NODE_ENV === "development"
    ? "dev-only-secret-change-me-4f8a2c1e9b7d6035"
    : crypto.randomUUID());

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pages/routes de connexion : accessibles sans session.
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token, SESSION_SECRET) : null;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!session || session.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
      }
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/dashboard/:path*"],
};
