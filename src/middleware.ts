// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "./lib/auth"; // Ścieżka do Twojego SERWEROWEGO pliku auth (nie auth-client!)

/** Ścieżki dostępne wyłącznie dla administratora. */
const ADMIN_ONLY_PREFIXES = ["/settings"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bezpieczna weryfikacja sesji w bazie danych przy użyciu serwerowego API Better-Auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // 1. Jeśli użytkownik JEST zalogowany i próbuje wejść na /sign-in, cofnij go na stronę główną
  if (session && pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Jeśli użytkownik NIE jest zalogowany i próbuje wejść na jakąkolwiek chronioną stronę
  if (!session && pathname !== "/sign-in") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // 3. Kontrola roli: strony administracyjne tylko dla admina.
  //    (Bug: wcześniej każdy zalogowany mógł wejść na /settings z adresu URL.)
  if (session && ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (session.user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Wymagane przez Better-Auth do sprawdzania sesji przez bazę danych w middleware
  runtime: "nodejs", 
  
  // Lista ścieżek, na których to middleware ma działać (pomijamy pliki statyczne i API auth)
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
