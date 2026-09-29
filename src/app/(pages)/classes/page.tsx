"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

type ClassItem = {
  id: number;
  name: string;
  studentsCount: number;
  teacher: string;
};

type Student = {
  id: number;
  name: string;
  classId: number;
  className: string;
};

export default function ClassesPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [searchClass, setSearchClass] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  // Modals
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentClassId, setNewStudentClassId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data: ClassItem[]) => {
        setClasses(data);
        if (data.length > 0 && !selectedClassId) {
          setSelectedClassId(data[0].id);
        }
        setLoadingClasses(false);
      })
      .catch(() => setLoadingClasses(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setLoadingStudents(false);
      return;
    }
    setLoadingStudents(true);
    fetch(`/api/students?classId=${selectedClassId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents(data);
        } else {
          console.error("API returned non-array:", data);
          setStudents([]);
        }
        setLoadingStudents(false);
      })
      .catch(() => {
        setStudents([]);
        setLoadingStudents(false);
      });
  }, [selectedClassId]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) =>
      c.name.toLowerCase().includes(searchClass.toLowerCase())
    );
  }, [classes, searchClass]);

  const selectedClassStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students
      .filter((s) => s.classId === selectedClassId)
      .filter((s) =>
        s.name.toLowerCase().includes(searchStudent.toLowerCase())
      );
  }, [students, selectedClassId, searchStudent]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

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
      setClasses((prev) => [...prev, data.class]);
      setNewClassName("");
      setNewClassTeacher("");
      setShowAddClass(false);
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
      const classItem = classes.find((c) => c.id === newStudentClassId);
      setStudents((prev) => [
        ...prev,
        {
          id: data.student.id,
          name: `${data.student.firstName} ${data.student.lastName}`,
          classId: newStudentClassId,
          className: classItem?.name ?? "?",
        },
      ]);
      setClasses((prev) =>
        prev.map((c) =>
          c.id === newStudentClassId
            ? { ...c, studentsCount: c.studentsCount + 1 }
            : c
        )
      );
      setNewStudentName("");
      setShowAddStudent(false);
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

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        {/* ================= SIDEBAR ================= */}
        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-slate-900 text-white lg:flex">
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

        {/* ================= MAIN ================= */}
        <div className="w-full lg:ml-64">
          {/* TOP BAR */}
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
                    .replace(/^./, (char) => char.toUpperCase())}
                </p>
                <h1 className="mt-0.5 text-xl font-bold text-slate-900">
                  Klasy i uczniowie
                </h1>
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

          {/* CONTENT */}
          <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
            {/* STATS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Liczba klas"
                value={String(classes.length)}
                description="zarejestrowanych klas"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"
                      strokeWidth="1.8"
                    />
                  </svg>
                }
              />
              <StatCard
                title="Liczba uczniów"
                value={String(students.length)}
                description="w systemie"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20"
                      strokeWidth="1.8"
                    />
                    <circle cx="10" cy="8" r="3" strokeWidth="1.8" />
                  </svg>
                }
              />
              <StatCard
                title="Wybrana klasa"
                value={selectedClass?.name ?? "—"}
                description={
                  selectedClass
                    ? `${selectedClass.studentsCount} uczniów`
                    : "brak wyboru"
                }
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
                    <path d="M12 7v5l3 2" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                accent
              />
              <StatCard
                title="Średnia w klasie"
                value={
                  classes.length
                    ? String(
                        Math.round(
                          students.length / classes.length
                        )
                      )
                    : "0"
                }
                description="uczniów na klasę"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />
            </div>

            {/* TWO COLUMNS */}
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
              {/* CLASSES LIST */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">Klasy</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {classes.length} klas
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddClass(true)}
                      className="cursor-pointer rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      + Dodaj klasę
                    </button>
                  </div>

                  <div className="relative">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    >
                      <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
                      <path d="m16 16 4 4" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      value={searchClass}
                      onChange={(e) => setSearchClass(e.target.value)}
                      placeholder="Szukaj klasy..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                <div className="max-h-[520px] overflow-y-auto p-3">
                  {loadingClasses ? (
                    <p className="py-10 text-center text-sm text-slate-400">
                      Ładowanie...
                    </p>
                  ) : filteredClasses.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400">
                      Brak klas
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredClasses.map((cls) => (
                        <button
                          key={cls.id}
                          onClick={() => setSelectedClassId(cls.id)}
                          className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition ${
                            selectedClassId === cls.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-100 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-800">
                              {cls.name}
                            </p>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {cls.studentsCount}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {cls.teacher}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* STUDENTS OF SELECTED CLASS */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">
                      Uczniowie {selectedClass ? `– ${selectedClass.name}` : ""}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedClass
                        ? `${selectedClassStudents.length} uczniów`
                        : "Wybierz klasę z listy"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      >
                        <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
                        <path d="m16 16 4 4" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <input
                        type="text"
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                        placeholder="Szukaj ucznia..."
                        disabled={!selectedClassId}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 sm:w-52"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (selectedClassId) {
                          setNewStudentClassId(selectedClassId);
                          setShowAddStudent(true);
                        }
                      }}
                      disabled={!selectedClassId}
                      className="cursor-pointer rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      + Dodaj ucznia
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Uczeń</th>
                        <th className="px-6 py-3 font-semibold">Klasa</th>
                        <th className="px-6 py-3 font-semibold">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!selectedClassId ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-16 text-center text-sm text-slate-400">
                            Wybierz klasę, aby zobaczyć listę uczniów
                          </td>
                        </tr>
                      ) : selectedClassStudents.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-16 text-center text-sm text-slate-400">
                            Brak uczniów w tej klasie
                          </td>
                        </tr>
                      ) : (
                        selectedClassStudents.map((student) => (
                          <tr
                            key={student.id}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                  {student.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {student.name}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {student.className}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {student.id.toString().padStart(3, "0")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>System Rejestracji Wyjść Uczniów</p>
              <p>Klasy i uczniowie</p>
            </footer>
          </div>
        </div>
      </div>

      {/* MODAL – DODAJ KLASĘ */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Dodaj klasę</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Wprowadź nazwę klasy i wychowawcę.
                </p>
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Nazwa klasy
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="np. 5P"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Wychowawca (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={newClassTeacher}
                  onChange={(e) => setNewClassTeacher(e.target.value)}
                  placeholder="np. Jan Kowalski"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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
                Dodaj klasę
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL – DODAJ UCZNIA */}
      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Dodaj ucznia</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Uczeń zostanie przypisany do wybranej klasy.
                </p>
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Imię i nazwisko
                </label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="np. Adam Nowak"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Klasa
                </label>
                <select
                  value={newStudentClassId ?? ""}
                  onChange={(e) => setNewStudentClassId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
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
                Dodaj ucznia
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

/* ================= COMPONENTS ================= */

function StatCard({
  title,
  value,
  description,
  icon,
  accent = false,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            accent ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
          }`}
        >
          <span className="h-5 w-5">{icon}</span>
        </div>
      </div>
    </div>
  );
}