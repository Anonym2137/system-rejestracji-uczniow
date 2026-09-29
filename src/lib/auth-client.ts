import { createAuthClient } from "better-auth/react"; 

// Klient używa adresu z zmiennej BETTER_AUTH_URL automatycznie
export const authClient = createAuthClient(); 

// Eksportujemy metody pomocnicze dla czytelniejszego kodu
export const { signIn, signUp, signOut, useSession } = authClient;