"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "../../../lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Logowanie za pomocą klienta Better Auth
      const { error: authError } = await signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (authError) {
        setError(authError.message || "Niepoprawny email lub hasło.");
        return;
      }

      router.refresh();
      router.push("/");
    } catch {
      setError("Wystąpił nieoczekiwany błąd połączenia.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">

        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-8 w-8 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.75V19.5m0-12.75a4.5 4.5 0 0 1 4.5-4.5H21v13.5h-4.5a4.5 4.5 0 0 0-4.5 4.5m0-13.5a4.5 4.5 0 0 0-4.5-4.5H3v13.5h4.5a4.5 4.5 0 0 1 4.5 4.5"
              />
            </svg>
          </div>

          <h1 className="mt-4 text-2xl font-bold">Rejestr Wyjść</h1>

          <p className="mt-1 text-sm text-slate-500">
            System rejestracji wyjść uczniów z zajęć
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Adres e-mail
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="jan.kowalski@szkola.pl"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Hasło
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Zaloguj się
          </button>
        </form>
      </div>
    </main>
  );
}
