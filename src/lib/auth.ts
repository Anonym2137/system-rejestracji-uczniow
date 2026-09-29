import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import {
  user,
  session,
  account,
  verification,
} from "../db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db,    {
        provider: "sqlite",
        schema: {
            user: user,
            session: session,
            account: account,
            verification: verification,
        }
    }),
    mapFields: {
        user: {
            emailVerified: "email_verified",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        session: {
            userId: "user_id",
            expiresAt: "expires_at",
            token: "token",
            ipAddress: "ip_address",
            userAgent: "user_agent", 
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        account: {
            userId: "user_id",
            accountId: "account_id",
            providerId: "provider_id",
            issuer: "issuer",
            accessToken: "access_token",
            refreshToken: "refresh_token",
            accessTokenExpiresAt: "access_token_expires_at",
            refreshTokenExpiresAt: "refresh_token_expires_at",
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        verification: {
            expiresAt: "expires_at",
            createdAt: "created_at",
            updatedAt: "updated_at",
        }
    },
    emailAndPassword: {
        enabled: true, // Włącza obsługę logowania e-mail + hasło
        autoSignIn: true // Automatycznie loguje użytkownika po udanej rejestracji
    },
        user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "teacher"
            }
        }
    }
});