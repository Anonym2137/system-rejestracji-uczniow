"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  name: string;
  email: string;
  role: "Nauczyciel" | "Wychowawca" | "Administrator";
  active: boolean;
};

const initialUsers: User[] = [
  { id: 1, name: "Jan Kowalski", email: "jan.kowalski@szkola.pl", role: "Nauczyciel", active: true },
  { id: 2, name: "Anna Nowak", email: "anna.nowak@szkola.pl", role: "Wychowawca", active: true },
  { id: 3, name: "Piotr Wiśniewski", email: "piotr.wisniewski@szkola.pl", role: "Administrator", active: true },
  { id: 4, name: "Maria Kamińska", email: "maria.kaminska@szkola.pl", role: "Nauczyciel", active: false },
];

export default function SettingsPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"users" | "roles" | "config">("users");
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showAddUser, setShowAddUser] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const deleteUser = (id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setShowDeleteConfirm(null);
  };

  // Form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"Nauczyciel" | "Wychowawca" | "Administrator">("Nauczyciel");

  const addUser = () => {
    if (!newName.trim() || !newEmail.trim()) return;
    const newId = Math.max(...users.map((u) => u.id), 0) + 1;
    setUsers((prev) => [
      ...prev,
      {
        id: newId,
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        active: true,
      },
    ]);
    setNewName("");
    setNewEmail("");
    setNewRole("Nauczyciel");
    setShowAddUser(false);
  };

  const toggleActive = (id: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
    );
  };

  const navItems = [
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
          <path d="M4 5h16M4 10h16M4 15h10M4 20h10" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Klasy i uczniowie",
      href: "/classes",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="10" cy="8" r="3" strokeWidth="1.8" />
          <path d="M16 4.5a3 3 0 0 1 0 6M17 15a3.5 3.5 0 0 1 3 3.5V20" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-slate-900 text-white lg:flex">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75V19.5m0-12.75a4.5 4.5 0 0 1 4.5-4.5H21v13.5h-4.5a4.5 4.5 0 0 0-4.5 4.5m0-13.5a4.5 4.5 0 0 0-4.5-4.5H3v13.5h4.5a4.5 4.5 0 0 1 4.5 4.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold">Rejestr Wyjść</p>
              <p className="text-xs text-slate-400">Panel nauczyciela</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Menu główne
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="h-5 w-5">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="my-6 h-px bg-white/10" />

            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Administrator
            </p>
            <Link
              href="/settings"
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                pathname === "/settings"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="h-5 w-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="3.2" strokeWidth="1.8" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.998 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Ustawienia
            </Link>
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                JK
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Jan Kowalski</p>
                <p className="text-xs text-slate-400">Nauczyciel</p>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Wyloguj"
                className="cursor-pointer text-slate-400 transition hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                  <path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="w-full lg:ml-64">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-20 items-center justify-between px-5 sm:px-8">
              <div>
                <p className="text-sm text-slate-500">
                  {new Date()
                    .toLocaleDateString("pl-PL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                    .replace(/^./, (c) => c.toUpperCase())}
                </p>
                <h1 className="mt-0.5 text-xl font-bold text-slate-900">Ustawienia</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">Jan Kowalski</p>
                  <p className="text-xs text-slate-400">Nauczyciel</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  JK
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1100px] p-5 sm:p-8">
            {/* TABS */}
            <div className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {[
                { id: "users", label: "Użytkownicy" },
                { id: "roles", label: "Role i uprawnienia" },
                { id: "config", label: "Konfiguracja" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* CONTENT */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* ===== UŻYTKOWNICY ===== */}
              {activeTab === "users" && (
                <div>
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                      <h2 className="text-lg font-bold">Użytkownicy systemu</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Zarządzaj kontami nauczycieli i administratorów
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddUser(true)}
                      className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      + Dodaj użytkownika
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Użytkownik</th>
                          <th className="px-6 py-3 font-semibold">Rola</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                          <th className="px-6 py-3 font-semibold">Akcja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                          <tr key={user.id} className="transition hover:bg-slate-50/70">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                  {user.name.split(" ").map((n) => n[0]).join("")}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                                  <p className="text-xs text-slate-400">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {user.active ? (
                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Aktywny
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  Nieaktywny
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleActive(user.id)}
                                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  {user.active ? "Dezaktywuj" : "Aktywuj"}
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm({ id: user.id, name: user.name })}
                                  className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                  Usuń
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ===== ROLE ===== */}
              {activeTab === "roles" && (
                <div className="p-6">
                  <h2 className="text-lg font-bold">Role i uprawnienia</h2>
                  <p className="mt-1 text-sm text-slate-500 mb-6">
                    Podstawowy podział ról w systemie
                  </p>

                  <div className="space-y-4">
                    {[
                      {
                        role: "Nauczyciel",
                        desc: "Rozpoczynanie lekcji, rejestracja wyjść i powrotów, podgląd aktywnych wyjść",
                      },
                      {
                        role: "Wychowawca",
                        desc: "Dostęp do historii, filtrowania, podstawowych statystyk i raportów swojej klasy",
                      },
                      {
                        role: "Administrator",
                        desc: "Zarządzanie użytkownikami, klasami, uczniami, uprawnieniami i konfiguracją systemu",
                      },
                    ].map((item) => (
                      <div
                        key={item.role}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <p className="text-sm font-bold text-slate-800">{item.role}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== KONFIGURACJA ===== */}
              {activeTab === "config" && (
                <div className="p-6">
                  <h2 className="text-lg font-bold">Konfiguracja systemu</h2>
                  <p className="mt-1 text-sm text-slate-500 mb-6">
                    Podstawowe ustawienia
                  </p>

                  <div className="space-y-5 max-w-lg">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Domyślny powód wyjścia
                      </label>
                      <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10">
                        <option>Toaleta</option>
                        <option>Sekretariat</option>
                        <option>Pedagog</option>
                        <option>Pielęgniarka</option>
                        <option>Inny</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Okres przechowywania historii (dni)
                      </label>
                      <input
                        type="number"
                        defaultValue={365}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Wymagaj powodu wyjścia</p>
                        <p className="text-xs text-slate-500">Nauczyciel musi wybrać powód</p>
                      </div>
                      <div className="h-6 w-11 rounded-full bg-blue-600 relative">
                        <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                      </div>
                    </div>

                    <button className="mt-4 cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                      Zapisz ustawienia
                    </button>
                  </div>
                </div>
              )}
            </div>

            <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>System Rejestracji Wyjść Uczniów</p>
              <p>Ustawienia</p>
            </footer>
          </div>
        </div>
      </div>

      {/* MODAL DODAJ UŻYTKOWNIKA */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Dodaj użytkownika</h3>
                <p className="mt-1 text-sm text-slate-500">Utwórz nowe konto w systemie</p>
              </div>
              <button
                onClick={() => setShowAddUser(false)}
                className="cursor-pointer text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Imię i nazwisko</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="np. Jan Kowalski"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="np. jan.kowalski@szkola.pl"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Rola</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as typeof newRole)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="Nauczyciel">Nauczyciel</option>
                  <option value="Wychowawca">Wychowawca</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddUser(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={addUser}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL – POTWIERDZENIE USUNIĘCIA UŻYTKOWNIKA */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Potwierdzenie usunięcia</h3>
            <p className="mt-2 text-sm text-slate-500">
              Czy na pewno chcesz usunąć użytkownika{" "}
              <span className="font-semibold text-slate-800">
                „{showDeleteConfirm.name}”
              </span>
              ?
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={() => deleteUser(showDeleteConfirm.id)}
                className="flex-1 cursor-pointer rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => {
                  router.push("/sign-in");
                }}
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