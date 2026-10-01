"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "../lib/auth-client";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const MAIN_NAV: NavItem[] = [
  {
    label: "Pulpit",
    href: "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.8" />
        <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "Historia",
    href: "/history",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          d="M4 5h16M4 10h16M4 15h10M4 20h10"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Klasy i uczniowie",
    href: "/classes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="10" cy="8" r="3" strokeWidth="1.8" />
        <path
          d="M16 4.5a3 3 0 0 1 0 6M17 15a3.5 3.5 0 0 1 3 3.5V20"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const SETTINGS_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="3.2" strokeWidth="1.8" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.998 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function roleLabel(role?: string | null): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "educator":
      return "Wychowawca";
    case "teacher":
      return "Nauczyciel";
    case "student":
      return "Uczeń";
    default:
      return "Użytkownik";
  }
}

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "?";
}

type AppShellProps = {
  /** Tytuł wyświetlany w nagłówku (np. "Historia wyjść"). */
  title: string;
  /** Podtytuł/dodatkowa linia w nagłówku. */
  subtitle?: React.ReactNode;
  /** Zawartość strony. */
  children: React.ReactNode;
};

/**
 * Wspólna powłoka aplikacji: sidebar (desktop), mobilny drawer, topbar, stopka
 * i modal potwierdzenia wylogowania. Zastępuje kopiowany wcześniej na każdej
 * stronie layout — dzięki temu poprawki (np. działające wylogowanie, wersja
 * mobilna) są wprowadzane raz, a nie w czterech miejscach.
 */
export default function AppShell({
  title,
  subtitle,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const userName = session?.user?.name || "Użytkownik";
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = userRole === "admin";
  const initials = getInitials(session?.user?.name);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  const navLinkClass = (isActive: boolean) =>
    `flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
      isActive
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  const sidebarContent = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.75V19.5m0-12.75a4.5 4.5 0 0 1 4.5-4.5H21v13.5h-4.5a4.5 4.5 0 0 0-4.5 4.5m0-13.5a4.5 4.5 0 0 0-4.5-4.5H3v13.5h4.5a4.5 4.5 0 0 1 4.5 4.5"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold">Rejestr Wyjść</p>
          <p className="text-xs text-slate-400">Panel nauczyciela</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Menu główne
        </p>
        <div className="space-y-1">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={navLinkClass(pathname === item.href)}
            >
              <span className="h-5 w-5">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {isAdmin && (
          <>
            <div className="my-6 h-px bg-white/10" />
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Administrator
            </p>
            <Link
              href="/settings"
              onClick={() => setMobileNavOpen(false)}
              className={navLinkClass(pathname === "/settings")}
            >
              <span className="h-5 w-5">{SETTINGS_ICON}</span>
              Ustawienia
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="text-xs text-slate-400">{roleLabel(userRole)}</p>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            title="Wyloguj"
            className="cursor-pointer text-slate-400 transition hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
              <path
                d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        {/* ================= SIDEBAR (desktop) ================= */}
        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-slate-900 text-white lg:flex">
          {sidebarContent}
        </aside>

        {/* ================= MOBILE DRAWER ================= */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-slate-900 text-white shadow-2xl">
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* ================= MAIN ================= */}
        <div className="w-full lg:ml-64">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:h-20 sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                {/* Hamburger — tylko mobile */}
                <button
                  onClick={() => setMobileNavOpen(true)}
                  title="Menu"
                  aria-label="Otwórz menu"
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>

                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-500 sm:text-sm">
                    {subtitle ??
                      new Date()
                        .toLocaleDateString("pl-PL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                        .replace(/^./, (char) => char.toUpperCase())}
                  </p>
                  <h1 className="mt-0.5 truncate text-lg font-bold text-slate-900 sm:text-xl">
                    {title}
                  </h1>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="text-xs text-slate-400">{roleLabel(userRole)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {initials}
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] p-4 sm:p-8">{children}</div>
        </div>
      </div>

      {/* ================= LOGOUT CONFIRM ================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Wylogowanie</h3>
            <p className="mt-2 text-sm text-slate-500">
              Czy na pewno chcesz się wylogować?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 cursor-pointer rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
