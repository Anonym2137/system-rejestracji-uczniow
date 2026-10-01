"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/AppShell";
import { useSession } from "../../../lib/auth-client";

type ClassItem = {
  id: number;
  name: string;
  studentsCount: number;
  teacher: string;
  educatorId?: string | null;
};

type Student = {
  id: number;
  name: string;
  classId: number;
  className: string;
};

/** Dzieli "Jan Kowalski" na imię i nazwisko. */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export default function ClassesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const userId = session?.user?.id;
  const isAdmin = userRole === "admin";

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [searchClass, setSearchClass] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);

  // Modals
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState("");

  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      if (!res.ok) {
        setPageError(data.error ?? "Nie udało się pobrać klas.");
        return;
      }
      const list: ClassItem[] = Array.isArray(data) ? data : [];
      setClasses(list);
      setSelectedClassId((current) => current ?? list[0]?.id ?? null);
    } catch {
      setPageError("Nie udało się pobrać klas.");
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/classes")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setPageError(data.error ?? "Nie udało się pobrać klas.");
          return;
        }
        const list: ClassItem[] = Array.isArray(data) ? data : [];
        setClasses(list);
        setSelectedClassId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setPageError("Nie udało się pobrać klas.");
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      return;
    }
    let cancelled = false;
    fetch(`/api/students?classId=${selectedClassId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setStudents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  const filteredClasses = useMemo(
    () =>
      classes.filter((c) =>
        c.name.toLowerCase().includes(searchClass.toLowerCase())
      ),
    [classes, searchClass]
  );

  const selectedClassStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students
      .filter((s) => s.classId === selectedClassId)
      .filter((s) =>
        s.name.toLowerCase().includes(searchStudent.toLowerCase())
      );
  }, [students, selectedClassId, searchStudent]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  /**
   * Bug 5: wychowawca zarządza listą uczniów swojej klasy,
   * ale NIE może dodawać ani usuwać klas (to rola administratora).
   */
  const canManageStudents = Boolean(
    selectedClass &&
      (isAdmin || (userId && selectedClass.educatorId === userId))
  );

  const totalStudents = classes.reduce((sum, c) => sum + c.studentsCount, 0);

  const closeStudentModals = () => {
    setShowAddStudent(false);
    setEditingStudent(null);
    setDeletingStudent(null);
    setNewStudentName("");
    setEditStudentName("");
    setModalError(null);
  };

  const addClass = async () => {
    const name = newClassName.trim();
    if (!name) {
      setModalError("Podaj nazwę klasy.");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? "Nie udało się dodać klasy.");
        return;
      }
      setNewClassName("");
      setShowAddClass(false);
      await loadClasses();
    } catch {
      setModalError("Nie udało się dodać klasy.");
    } finally {
      setSaving(false);
    }
  };

  const addStudent = async () => {
    if (!selectedClassId) return;

    // Bug 3: wymagamy imienia I nazwiska (oddzielonych spacją).
    const { firstName, lastName } = splitName(newStudentName);
    if (!firstName) {
      setModalError("Podaj imię i nazwisko ucznia.");
      return;
    }
    if (!lastName) {
      setModalError(
        "Podaj nazwisko ucznia. Wpisz imię i nazwisko oddzielone spacją, np. „Jan Kowalski”."
      );
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, classId: selectedClassId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? "Nie udało się dodać ucznia.");
        return;
      }
      closeStudentModals();
      setStudents((prev) => [
        ...prev,
        {
          id: data.student.id,
          name: `${data.student.firstName} ${data.student.lastName}`,
          classId: selectedClassId,
          className: selectedClass?.name ?? "?",
        },
      ]);
      setClasses((prev) =>
        prev.map((c) =>
          c.id === selectedClassId
            ? { ...c, studentsCount: c.studentsCount + 1 }
            : c
        )
      );
    } catch {
      setModalError("Nie udało się dodać ucznia.");
    } finally {
      setSaving(false);
    }
  };

  const openEditStudent = (student: Student) => {
    setEditingStudent(student);
    setEditStudentName(student.name);
    setModalError(null);
  };

  const saveStudent = async () => {
    if (!editingStudent) return;

    const { firstName, lastName } = splitName(editStudentName);
    if (!firstName) {
      setModalError("Podaj imię i nazwisko ucznia.");
      return;
    }
    if (!lastName) {
      setModalError(
        "Podaj nazwisko ucznia. Wpisz imię i nazwisko oddzielone spacją, np. „Jan Kowalski”."
      );
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          classId: editingStudent.classId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? "Nie udało się zapisać zmian.");
        return;
      }
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id
            ? {
                ...s,
                name: `${data.student.firstName} ${data.student.lastName}`,
              }
            : s
        )
      );
      closeStudentModals();
    } catch {
      setModalError("Nie udało się zapisać zmian.");
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async () => {
    if (!deletingStudent) return;
    setSaving(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/students/${deletingStudent.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? "Nie udało się usunąć ucznia.");
        return;
      }
      const removedClassId = deletingStudent.classId;
      setStudents((prev) => prev.filter((s) => s.id !== deletingStudent.id));
      setClasses((prev) =>
        prev.map((c) =>
          c.id === removedClassId
            ? { ...c, studentsCount: Math.max(0, c.studentsCount - 1) }
            : c
        )
      );
      closeStudentModals();
    } catch {
      setModalError("Nie udało się usunąć ucznia.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Klasy i uczniowie">
      {pageError && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {pageError}
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          value={String(totalStudents)}
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
              {/* Bug 5: dodawanie klas tylko dla administratora */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setModalError(null);
                    setShowAddClass(true);
                  }}
                  className="cursor-pointer rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  + Dodaj klasę
                </button>
              )}
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

              {canManageStudents && (
                <button
                  onClick={() => {
                    setModalError(null);
                    setShowAddStudent(true);
                  }}
                  className="cursor-pointer rounded-xl bg-blue-600 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  + Dodaj ucznia
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Uczeń</th>
                  <th className="px-6 py-3 font-semibold">Klasa</th>
                  <th className="px-6 py-3 font-semibold">ID</th>
                  {canManageStudents && (
                    <th className="px-6 py-3 text-right font-semibold">Akcje</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingStudents ? (
                  <tr>
                    <td
                      colSpan={canManageStudents ? 4 : 3}
                      className="px-6 py-16 text-center text-sm text-slate-400"
                    >
                      Ładowanie...
                    </td>
                  </tr>
                ) : !selectedClassId ? (
                  <tr>
                    <td
                      colSpan={canManageStudents ? 4 : 3}
                      className="px-6 py-16 text-center text-sm text-slate-400"
                    >
                      Wybierz klasę, aby zobaczyć listę uczniów
                    </td>
                  </tr>
                ) : selectedClassStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManageStudents ? 4 : 3}
                      className="px-6 py-16 text-center text-sm text-slate-400"
                    >
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
                              .join("")
                              .slice(0, 2)}
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
                      {canManageStudents && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openEditStudent(student)}
                            className="mr-2 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Edytuj
                          </button>
                          <button
                            onClick={() => {
                              setModalError(null);
                              setDeletingStudent(student);
                            }}
                            className="cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                          >
                            Usuń
                          </button>
                        </td>
                      )}
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

      {/* MODAL – DODAJ KLASĘ */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Dodaj klasę</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Wprowadź nazwę klasy.
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
              {modalError && (
                <div className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                  {modalError}
                </div>
              )}
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
                disabled={saving}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {saving ? "Dodawanie..." : "Dodaj klasę"}
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
                  Uczeń zostanie przypisany do klasy {selectedClass?.name}.
                </p>
              </div>
              <button
                onClick={closeStudentModals}
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
              {modalError && (
                <div className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                  {modalError}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeStudentModals}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={addStudent}
                disabled={saving}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {saving ? "Dodawanie..." : "Dodaj ucznia"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL – EDYTUJ UCZNIA */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edytuj ucznia</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Popraw imię lub nazwisko ucznia.
                </p>
              </div>
              <button
                onClick={closeStudentModals}
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
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  placeholder="np. Adam Nowak"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              {modalError && (
                <div className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                  {modalError}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeStudentModals}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={saveStudent}
                disabled={saving}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {saving ? "Zapisywanie..." : "Zapisz zmiany"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL – USUŃ UCZNIA */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Usuń ucznia</h3>
            <p className="mt-2 text-sm text-slate-500">
              Czy na pewno chcesz usunąć ucznia{" "}
              <span className="font-semibold text-slate-700">
                {deletingStudent.name}
              </span>
              ? Tej operacji nie można cofnąć.
            </p>
            {modalError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
                {modalError}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                onClick={closeStudentModals}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={deleteStudent}
                disabled={saving}
                className="flex-1 cursor-pointer rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {saving ? "Usuwanie..." : "Usuń"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
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
