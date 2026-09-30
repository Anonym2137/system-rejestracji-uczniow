"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "../lib/auth-client";

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

  todayStats?: {
    totalExits: number;
    avgDuration: number;
  };
};

export default function MainPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

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
  const [todayStats, setTodayStats] = useState<DashboardData["todayStats"]>(undefined);
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
    setTodayStats(data.todayStats);
    setEndTime(
      new Date(Date.now() + 45 * 60000).toLocaleTimeString("pl-PL", {
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

      setLessonActive(false);
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

      setLessonId(data.lesson.id);
      setLessonActive(true);
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
                {currentUser?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{currentUser?.name || "Użytkownik"}</p>
                <p className="text-xs text-slate-400">
                  {currentUser?.role === "admin" ? "Administrator" :
                   currentUser?.role === "educator" ? "Wychowawca" :
                   currentUser?.role === "teacher" ? "Nauczyciel" : "Użytkownik"}
                </p>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  router.push("/sign-in");
                }}
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
                  Dzień dobry, {firstName} 👋
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">{currentUser?.name || "Użytkownik"}</p>
                  <p className="text-xs text-slate-400">
                    {currentUser?.role === "admin" ? "Administrator" :
                     currentUser?.role === "educator" ? "Wychowawca" :
                     currentUser?.role === "teacher" ? "Nauczyciel" : "Użytkownik"}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {currentUser?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
            {/* ================= STATISTICS ================= */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Dzisiejsza lekcja"
                value={className ?? "—"}
                description={`${subject ?? "—"} • sala —`}
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
                title="Aktywne wyjścia"
                value={String(activeExits.length)}
                description="uczniowie poza salą"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
                    <path d="M12 7v5l3 2" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                accent
              />

              <Link href="/history" className="block cursor-pointer text-left">
                <StatCard
                  title="Wyjścia dzisiaj"
                  value={String(todayStats?.totalExits ?? 0)}
                  description="łącznie zarejestrowanych"
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
              </Link>

              <StatCard
                title="Średni czas"
                value={`${todayStats?.avgDuration ?? 0} min`}
                description="średni czas wyjścia"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
                    <path d="M12 7v5l3 2" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
              />
            </div>

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

              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:p-6">
                <LessonInfo label="Klasa" value={className ?? "—"} />
                <LessonInfo label="Przedmiot" value={subject ?? "—"} />
                <LessonInfo label="Sala" value="—" />
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
          </div>
        </div>
      </div>

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

function LessonInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}