"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";

type StudentStatus = "W sali" | "Poza salą";

type Student = {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  status: StudentStatus;
  exitTime?: string;
  reason?: string;
  leaveId?: string;
};

type DashboardData = {
  class: {
    id: number;
    name: string;
    educatorId?: string;
  } | null;

  classes: {
    id: number;
    name: string;
    educatorId?: string;
  }[];

  lesson: {
    id: string;
    subject: string | null;
    startedAt: string;
    isActive: boolean;
  } | null;

  students: {
    id: number;
    firstName: string;
    lastName: string;
    classId: number;
  }[];

  leaves: {
    id: string;
    studentId: number;
    lessonSessionId: string;
    reason: string | null;
    leftAt: string;
    returnedAt: string | null;
  }[];

  user: {
    id: string;
    name: string | null;
    email: string;
    role?: string;
  };

};

export default function MainPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [lessonActive, setLessonActive] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [lessonNumber, setLessonNumber] = useState("");
  const [lessonStartTime, setLessonStartTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState("Toaleta");
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [allClasses, setAllClasses] = useState<DashboardData["classes"]>([]);
  const [endTime, setEndTime] = useState<string>("");
  const [lessonStartedAt, setLessonStartedAt] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
  id: string;
  name: string | null;
  email: string;
  role?: string;
} | null>(null);



const loadDashboard = async (classIdOverride?: number) => {
  try {
    setLoading(true);
    setError(null);

    const url = classIdOverride
      ? `/api/dashboard?classId=${classIdOverride}`
      : "/api/dashboard";

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Nie udało się pobrać danych");
    }

    const data: DashboardData = await response.json();

    setAllClasses(data.classes ?? []);
    setClassId(data.class?.id ?? null);
    setClassName(data.class?.name ?? "");
    setCurrentUser(data.user);

    setLessonId(data.lesson?.id ?? null);
    setLessonActive(data.lesson?.isActive ?? false);
    setSubject(data.lesson?.subject ?? "");
    setLessonStartedAt(data.lesson?.startedAt ?? null);
    // Godzina zakończenia = start lekcji + 45 min (zgodnie z auto-zakończeniem lekcji).
    const lessonStart = data.lesson?.startedAt ? new Date(data.lesson.startedAt) : new Date();
    setEndTime(
      new Date(lessonStart.getTime() + 45 * 60000).toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    const studentsWithStatus: Student[] = data.students.map((student) => {
      const leave = data.leaves.find(
        (leave) => leave.studentId === student.id && leave.returnedAt === null
      );


      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        name: `${student.firstName} ${student.lastName}`,
        status: leave ? "Poza salą" : "W sali",
        leaveId: leave?.id,
        exitTime: leave
          ? new Date(leave.leftAt).toLocaleTimeString("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined,
        reason: leave?.reason ?? undefined,
      };
    });

    setStudents(studentsWithStatus);
  } catch (error) {
    console.error(error);
    setError("Nie udało się pobrać danych.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  let isMounted = true;

  // Opóźnienie wywołania do następnego cyklu event loop (lub natychmiast po zamontowaniu)
  const fetchData = async () => {
    if (isMounted) {
      await loadDashboard();
    }
  };

  fetchData();

  // Czyszczenie efektu przy odmontowywaniu komponentu
  return () => {
    isMounted = false;
  };
}, []);

  const activeExits = useMemo(
    () => students.filter((student) => student.status === "Poza salą"),
    [students]
  );

  const userName = currentUser?.name || "Nauczyciel";
  const firstName = userName.split(" ")[0];

  const confirmExit = async () => {
  if (selectedStudent === null) return;

  try {
    const response = await fetch("/api/leaves", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId: selectedStudent,
        reason: selectedReason,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Nie udało się zarejestrować wyjścia");
    }

    setStudents((current) =>
      current.map((student) =>
        student.id === selectedStudent
          ? {
              ...student,
              status: "Poza salą",
              leaveId: data.leave.id,
              exitTime: new Date(
                data.leave.leftAt
              ).toLocaleTimeString("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              reason: data.leave.reason,
            }
          : student
      )
    );

    setShowReasonModal(false);
    setSelectedStudent(null);
  } catch (error) {
    console.error(error);
    alert(
      error instanceof Error
        ? error.message
        : "Nie udało się zarejestrować wyjścia"
    );
  }
};

const filteredStudents = useMemo(() => {
  return students.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });
}, [students, search]);

  const registerExit = (studentId: number) => {
    setSelectedStudent(studentId);
    setShowReasonModal(true);
  };

  const registerReturn = async (student: Student) => {
  if (!student.leaveId) return;

  try {
    const response = await fetch(
      `/api/leaves/${student.leaveId}/return`,
      {
        method: "PATCH",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ?? "Nie udało się zarejestrować powrotu"
      );
    }

    setStudents((current) =>
      current.map((item) =>
        item.id === student.id
          ? {
              ...item,
              status: "W sali",
              leaveId: undefined,
              exitTime: undefined,
              reason: undefined,
            }
          : item
      )
    );
  } catch (error) {
    console.error(error);

    alert(
      error instanceof Error
        ? error.message
        : "Nie udało się zarejestrować powrotu"
    );
  }
};

const toggleLesson = async () => {
  try {
    if (lessonActive && lessonId) {
      const response = await fetch("/api/lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "stop",
          lessonId,
        }),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zakończyć lekcji");
      }

      await loadDashboard(classId ?? undefined);
      return;
    }

    if (!lessonActive && classId) {
      const response = await fetch("/api/lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          classId,
          subject: subject || undefined,
          lessonNumber: lessonNumber || undefined,
          startTime: lessonStartTime || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Nie udało się rozpocząć lekcji"
        );
      }

      await loadDashboard(classId);
    }
  } catch (error) {
    console.error(error);

    alert(
      error instanceof Error
        ? error.message
        : "Nie udało się zmienić statusu lekcji"
    );
  }
};

  const handleClassChange = async (newClassId: number) => {
    await loadDashboard(newClassId);
  };

  return (
    <AppShell title={`Dzień dobry, ${firstName} 👋`}>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-sm text-slate-400 shadow-sm">
          Ładowanie danych...
        </div>
      ) : (
        <>
      {/* ================= CURRENT LESSON ================= */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Aktualna lekcja</h2>
                    {lessonActive && (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Lekcja aktywna
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Zarządzaj wyjściami uczniów podczas bieżącej lekcji.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!lessonActive && (
                    <>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Przedmiot (np. Matematyka)"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <input
                        type="text"
                        value={lessonNumber}
                        onChange={(e) => setLessonNumber(e.target.value)}
                        placeholder="Numer lekcji (np. 3)"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <input
                        type="time"
                        value={lessonStartTime}
                        onChange={(e) => setLessonStartTime(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </>
                  )}

                  {allClasses.length > 1 && (
                    <select
                      value={classId ?? ""}
                      onChange={(e) => handleClassChange(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {allClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    onClick={toggleLesson}
                    disabled={!classId}
                    className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      !classId
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : lessonActive
                          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          : "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                    }`}
                  >
                    {lessonActive ? "Zakończ lekcję" : "Rozpocznij lekcję"}
                  </button>
                </div>
              </div>

              {!classId && (
                <div className="border-b border-slate-100 bg-amber-50 px-5 py-3 text-sm text-amber-800 sm:px-6">
                  Nie masz przypisanej żadnej klasy. Skontaktuj się z administratorem,
                  aby przypisać Cię do klasy.
                </div>
              )}

              {lessonActive && (
                <div className="border-b border-slate-100 bg-blue-50 px-5 py-3 text-sm text-blue-800 sm:px-6">
                  Lekcja już trwa. Możesz ją zakończyć klikając przycisk poniżej.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 sm:p-6">
                <LessonInfo label="Klasa" value={className ?? "—"} />
                <LessonInfo label="Przedmiot" value={subject ?? "—"} />
                <LessonInfo
                  label="Godzina"
                  value={
                    lessonStartedAt
                      ? new Date(lessonStartedAt).toLocaleTimeString("pl-PL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) +
                        " – " +
                        endTime
                      : "—"
                  }
                />
              </div>
            </section>

            {/* ================= TWO COLUMNS ================= */}
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              {/* STUDENTS */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold">Lista uczniów</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {className || "—"} • {students.length} uczniów
                    </p>
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
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Szukaj ucznia..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-56"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Uczeń</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold">Wyjście</th>
                        <th className="px-6 py-3 font-semibold">Akcja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="transition hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                {student.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {student.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                  ID: {student.id.toString().padStart(3, "0")}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {student.status === "W sali" ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                W sali
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Poza salą
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {student.status === "Poza salą" ? (
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {student.exitTime}
                                </p>
                                <p className="text-xs text-slate-400">{student.reason}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {student.status === "W sali" ? (
                              <button
                                disabled={!lessonActive}
                                onClick={() => registerExit(student.id)}
                                className="cursor-pointer rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                              >
                                + Wyjście
                              </button>
                            ) : (
                              <button
                                onClick={() => registerReturn(student)}
                                className="cursor-pointer rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                ✓ Powrót
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ACTIVE EXITS */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">Aktywne wyjścia</h2>
                      <p className="mt-1 text-sm text-slate-500">Uczniowie poza salą</p>
                    </div>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
                      title="Aktywne wyjścia"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
                        <path d="M12 7v5l3 2" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {activeExits.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        ✓
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        Wszyscy uczniowie są w sali
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Brak aktywnych wyjść</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeExits.map((student) => (
                        <div
                          key={student.id}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                                {student.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {student.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {student.reason}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-amber-600">
                              {student.exitTime}
                            </span>
                          </div>
                          <button
                            onClick={() => registerReturn(student)}
                            className="mt-3 w-full cursor-pointer rounded-lg border border-emerald-200 bg-white py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            Zarejestruj powrót
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>System Rejestracji Wyjść Uczniów</p>
              <p>Panel nauczyciela</p>
            </footer>
        </>
      )}

      {/* ================= EXIT MODAL ================= */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Rejestracja wyjścia</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Wybierz powód wyjścia ucznia.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setSelectedStudent(null);
                }}
                className="cursor-pointer text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {["Toaleta", "Sekretariat", "Pedagog", "Pielęgniarka", "Inny"].map(
                (reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      selectedReason === reason
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {reason}
                  </button>
                )
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setSelectedStudent(null);
                }}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Zarejestruj wyjście
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ================= COMPONENTS ================= */

function LessonInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}