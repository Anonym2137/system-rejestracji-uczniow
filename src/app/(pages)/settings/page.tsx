"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "../../../lib/auth-client";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "teacher" | "educator" | "student";
  emailVerified: boolean;
  createdAt: Date;
};

type ClassItem = {
  id: number;
  name: string;
  studentsCount: number;
  teacher: string;
};

type StudentItem = {
  id: number;
  name: string;
  classId: number;
  className: string;
};

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  teacher: "Nauczyciel",
  educator: "Wychowawca",
  student: "Uczeń",
};

export default function SettingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const userName = session?.user?.name || "Użytkownik";
  const userInitials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?";
  const roleLabel = userRole === "admin" ? "Administrator" :
                    userRole === "educator" ? "Wychowawca" :
                    userRole === "teacher" ? "Nauczyciel" : "Użytkownik";

  const [activeTab, setActiveTab] = useState<"users" | "classes" | "roles" | "config">("users");
  const [users, setUsers] = useState<User[] | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState<"admin" | "teacher" | "educator" | "student">("teacher");
  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassTeacher, setEditClassTeacher] = useState("");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentClassId, setEditStudentClassId] = useState<number | null>(null);

  // Form state — user
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "teacher" | "educator" | "student">("teacher");

  // Form state — class
  const [newClassName, setNewClassName] = useState("");

  // Form state — student
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentClassId, setNewStudentClassId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => {
        if (!res.ok) throw new Error("Brak uprawnień");
        return res.json();
      })
      .then((data: User[]) => setUsers(data))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data: ClassItem[]) => setClasses(data))
      .catch(() => {})
      .finally(() => setLoadingClasses(false));
  }, []);

  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data: StudentItem[]) => setStudents(data))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  const addUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          name: newName.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się dodać użytkownika");
      setUsers((prev) => prev ? [...prev, data.user] : [data.user]);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("teacher");
      setShowAddUser(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd");
    }
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name || "");
    setEditUserEmail(user.email);
    setEditUserRole(user.role);
    setShowEditUser(true);
  };

  const saveUser = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editUserName,
          email: editUserEmail,
          role: editUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się zaktualizować użytkownika");
      setUsers((prev) => prev ? prev.map((u) => u.id === editingUser.id ? data.user : u) : null);
      setShowEditUser(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd");
    }
  };

  const addClass = async () => {
    if (!newClassName.trim()) return;
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się dodać klasy");
      setClasses((prev) => [...prev, { ...data.class, studentsCount: 0, teacher: "—" }]);
      setNewClassName("");
      setShowAddClass(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd");
    }
  };

  const openEditClass = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassTeacher(cls.teacher);
    setShowEditClass(true);
  };

  const saveClass = async () => {
    if (!editingClass) return;
    try {
      const res = await fetch(`/api/classes/${editingClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editClassName,
          educatorId: editClassTeacher || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się zaktualizować klasy");
      setClasses((prev) => prev.map((c) => c.id === editingClass.id ? data.class : c));
      setShowEditClass(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd");
    }
  };

  const addStudent = async () => {
    if (!newStudentName.trim() || !newStudentClassId) return;
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newStudentName.trim().split(" ")[0],
          lastName: newStudentName.trim().split(" ").slice(1).join(" "),
          classId: newStudentClassId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się dodać ucznia");
      setClasses((prev) =>
        prev.map((c) =>
          c.id === newStudentClassId
            ? { ...c, studentsCount: c.studentsCount + 1 }
            : c
        )
      );
      setNewStudentName("");
      setNewStudentClassId(null);
      setShowAddStudent(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd");
    }
  };

  const openEditStudent = (student: StudentItem) => {
    setEditingStudent(student);
    setEditStudentName(student.name);
    setEditStudentClassId(student.classId);
    setShowEditStudent(true);
  };

  const saveStudent = async () => {
    if (!editingStudent) return;
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editStudentName.split(" ")[0],
          lastName: editStudentName.split(" ").slice(1).join(" "),
          classId: editStudentClassId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się zaktualizować ucznia");
      setShowEditStudent(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Błąd");
    }
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

            {isAdmin && (
              <>
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
              </>
            )}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{userName}</p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
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
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="text-xs text-slate-400">{roleLabel}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {userInitials}
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1100px] p-5 sm:p-8">
            {/* TABS */}
            <div className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {[
                { id: "users", label: "Użytkownicy" },
                { id: "classes", label: "Klasy i uczniowie" },
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingUsers ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                              Ładowanie...
                            </td>
                          </tr>
                        ) : !users ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                              Brak uprawnień do przeglądania użytkowników
                            </td>
                          </tr>
                        ) : users.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                              Brak użytkowników
                            </td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user.id} className="transition hover:bg-slate-50/70">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                    {user.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">{user.name || "—"}</p>
                                    <p className="text-xs text-slate-400">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                  {roleLabels[user.role] || user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {user.emailVerified ? (
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
                                <button
                                  onClick={() => openEditUser(user)}
                                  className="cursor-pointer text-blue-600 hover:text-blue-800"
                                >
                                  Edytuj
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ===== KLASY I UCZNIOWIE ===== */}
              {activeTab === "classes" && (
                <div className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">Klasy i uczniowie</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Zarządzaj klasami i przypisanymi uczniami
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAddClass(true)}
                        className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        + Dodaj klasę
                      </button>
                      <button
                        onClick={() => setShowAddStudent(true)}
                        className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        + Dodaj ucznia
                      </button>
                    </div>
                  </div>

                  {loadingClasses ? (
                    <p className="py-10 text-center text-sm text-slate-400">Ładowanie...</p>
                  ) : (
                    <div className="space-y-4">
                      {classes.map((cls) => (
                        <div key={cls.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-800">{cls.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                {cls.studentsCount} uczniów
                              </span>
                              <button
                                onClick={() => openEditClass(cls)}
                                className="cursor-pointer text-blue-600 hover:text-blue-800"
                              >
                                Edytuj
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">Wychowawca: {cls.teacher}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8">
                    <h3 className="text-lg font-bold">Uczniowie</h3>
                    {loadingStudents ? (
                      <p className="py-10 text-center text-sm text-slate-400">Ładowanie...</p>
                    ) : (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-6 py-3 font-semibold">Uczeń</th>
                              <th className="px-6 py-3 font-semibold">Klasa</th>
                              <th className="px-6 py-3 font-semibold">Akcje</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {students.map((student) => (
                              <tr key={student.id} className="transition hover:bg-slate-50/70">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-slate-500">{student.className}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => openEditStudent(student)}
                                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                                  >
                                    Edytuj
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Hasło</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 znaków"
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
                  <option value="teacher">Nauczyciel</option>
                  <option value="educator">Wychowawca</option>
                  <option value="admin">Administrator</option>
                  <option value="student">Uczeń</option>
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

      {/* MODAL DODAJ KLASĘ */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Dodaj klasę</h3>
                <p className="mt-1 text-sm text-slate-500">Utwórz nową klasę w systemie</p>
              </div>
              <button
                onClick={() => setShowAddClass(false)}
                className="cursor-pointer text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Nazwa klasy</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="np. 3C"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddClass(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={addClass}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DODAJ UCZNIA */}
      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Dodaj ucznia</h3>
                <p className="mt-1 text-sm text-slate-500">Utwórz nowego ucznia i przypisz do klasy</p>
              </div>
              <button
                onClick={() => setShowAddStudent(false)}
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
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="np. Jan Kowalski"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Klasa</label>
                <select
                  value={newStudentClassId ?? ""}
                  onChange={(e) => setNewStudentClassId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="">Wybierz klasę...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddStudent(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={addStudent}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Edytuj użytkownika</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Imię i nazwisko</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Rola</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as typeof editUserRole)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="admin">Administrator</option>
                  <option value="teacher">Nauczyciel</option>
                  <option value="educator">Wychowawca</option>
                  <option value="student">Uczeń</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEditUser(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Anuluj
              </button>
              <button
                onClick={saveUser}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Edytuj ucznia</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Imię i nazwisko</label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Klasa</label>
                <select
                  value={editStudentClassId ?? ""}
                  onChange={(e) => setEditStudentClassId(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEditStudent(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Anuluj
              </button>
              <button
                onClick={saveStudent}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Edytuj klasę</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Nazwa klasy</label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Wychowawca</label>
                <input
                  type="text"
                  value={editClassTeacher}
                  onChange={(e) => setEditClassTeacher(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEditClass(false)}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Anuluj
              </button>
              <button
                onClick={saveClass}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Zapisz
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
                onClick={async () => {
                  await signOut();
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
