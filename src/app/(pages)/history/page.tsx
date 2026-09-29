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

type HistoryRecord = {
  id: string;
  student: string;
  studentId: number;
  className: string;
  date: string;
  lesson: string;
  room: string;
  reason: string;
  exitTime: string;
  returnTime: string;
  duration: number | null;
};

const initialHistory: HistoryRecord[] = [
  {
    id: 1,
    student: "Julia Kowalska",
    studentId: 2,
    className: "5P",
    date: "17.09.2026",
    lesson: "Informatyka",
    room: "202",
    reason: "Toaleta",
    exitTime: "10:18",
    returnTime: "10:23",
    duration: 5,
  },
  {
    id: 2,
    student: "Jakub Kamiński",
    studentId: 5,
    className: "5P",
    date: "17.09.2026",
    lesson: "Informatyka",
    room: "202",
    reason: "Sekretariat",
    exitTime: "10:25",
    returnTime: "10:34",
    duration: 9,
  },
  {
    id: 3,
    student: "Kacper Wójcik",
    studentId: 3,
    className: "5P",
    date: "17.09.2026",
    lesson: "Matematyka",
    room: "204",
    reason: "Pedagog",
    exitTime: "09:42",
    returnTime: "09:52",
    duration: 10,
  },
  {
    id: 4,
    student: "Adam Nowak",
    studentId: 1,
    className: "5P",
    date: "17.09.2026",
    lesson: "Matematyka",
    room: "204",
    reason: "Toaleta",
    exitTime: "09:31",
    returnTime: "09:36",
    duration: 5,
  },
  {
    id: 5,
    student: "Zuzanna Mazur",
    studentId: 4,
    className: "5P",
    date: "16.09.2026",
    lesson: "Informatyka",
    room: "202",
    reason: "Pielęgniarka",
    exitTime: "11:12",
    returnTime: "11:25",
    duration: 13,
  },
  {
    id: 6,
    student: "Maja Lewandowska",
    studentId: 6,
    className: "5P",
    date: "16.09.2026",
    lesson: "Język polski",
    room: "108",
    reason: "Sekretariat",
    exitTime: "12:05",
    returnTime: "12:11",
    duration: 6,
  },
  {
    id: 7,
    student: "Antoni Zieliński",
    studentId: 7,
    className: "5P",
    date: "16.09.2026",
    lesson: "Matematyka",
    room: "204",
    reason: "Toaleta",
    exitTime: "08:26",
    returnTime: "08:31",
    duration: 5,
  },
  {
    id: 8,
    student: "Oliwia Szymańska",
    studentId: 8,
    className: "5P",
    date: "15.09.2026",
    lesson: "Informatyka",
    room: "202",
    reason: "Inny",
    exitTime: "10:14",
    returnTime: "10:21",
    duration: 7,
  },
];

const reasons = [
  "Wszystkie",
  "Toaleta",
  "Sekretariat",
  "Pedagog",
  "Pielęgniarka",
  "Inny",
];

export default function HistoryPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Wszystkie");
  const [selectedReason, setSelectedReason] = useState("Wszystkie");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRecord, setSelectedRecord] =
    useState<HistoryRecord | null>(null);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionRecord, setCorrectionRecord] =
    useState<HistoryRecord | null>(null);

  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionExitTime, setCorrectionExitTime] = useState("");
  const [correctionReturnTime, setCorrectionReturnTime] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedClass !== "Wszystkie") params.set("class", selectedClass);
    if (selectedReason !== "Wszystkie") params.set("reason", selectedReason);
    if (selectedDate) {
      params.set("from", selectedDate);
      params.set("to", selectedDate);
    }
    fetch(`/api/history?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedClass, selectedReason, selectedDate]);

  useEffect(() => {
    setLoadingClasses(true);
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data: ClassItem[]) => {
        setClasses(data);
        setLoadingClasses(false);
      })
      .catch(() => setLoadingClasses(false));
  }, []);

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

  const filteredHistory = useMemo(() => {
    return history.filter((record) => {
      const matchesSearch = record.student
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesClass =
        selectedClass === "Wszystkie" ||
        record.className === selectedClass;

      const matchesReason =
        selectedReason === "Wszystkie" ||
        record.reason === selectedReason;

      const matchesDate =
        selectedDate === "" ||
        record.date === formatDateForDisplay(selectedDate);

      return (
        matchesSearch &&
        matchesClass &&
        matchesReason &&
        matchesDate
      );
    });
  }, [history, search, selectedClass, selectedReason, selectedDate]);

  const totalMinutes = filteredHistory.reduce(
    (sum, record) => sum + record.duration,
    0
  );

  const averageDuration =
    filteredHistory.length > 0
      ? Math.round(totalMinutes / filteredHistory.length)
      : 0;

  const openCorrection = (record: HistoryRecord) => {
    setCorrectionRecord(record);
    setCorrectionReason(record.reason);
    setCorrectionExitTime(record.exitTime);
    setCorrectionReturnTime(record.returnTime);
    setShowCorrectionModal(true);
  };

  const saveCorrection = () => {
    if (!correctionRecord) return;

    const duration = calculateDuration(
      correctionExitTime,
      correctionReturnTime
    );

    setHistory((current) =>
      current.map((record) =>
        record.id === correctionRecord.id
          ? {
              ...record,
              reason: correctionReason,
              exitTime: correctionExitTime,
              returnTime: correctionReturnTime,
              duration,
            }
          : record
      )
    );

    setShowCorrectionModal(false);
    setCorrectionRecord(null);
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">

        {/* ================= SIDEBAR ================= */}

        <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-slate-900 text-white lg:flex">

          {/* Logo */}

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
              <p className="text-xs text-slate-400">
                Panel nauczyciela
              </p>
            </div>
          </div>

          {/* Navigation */}

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
                    <span className="h-5 w-5">
                      {item.icon}
                    </span>

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

          {/* User */}

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                JK
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  Jan Kowalski
                </p>

                <p className="text-xs text-slate-400">
                  Nauczyciel
                </p>
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
                    .replace(/^./, (char) =>
                      char.toUpperCase()
                    )}
                </p>

                <h1 className="mt-0.5 text-xl font-bold text-slate-900">
                  Historia wyjść
                </h1>
              </div>

              <div className="flex items-center gap-3">

                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">
                    Jan Kowalski
                  </p>

                  <p className="text-xs text-slate-400">
                    Nauczyciel
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  JK
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}

          <div className="mx-auto max-w-[1500px] p-5 sm:p-8">

            {/* PAGE HEADER */}

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Przegląd zarejestrowanych wyjść uczniów
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Historia wyjść
                </h2>
              </div>

              <button
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                onClick={() => alert("Eksport zostanie dodany w wersji z bazą danych.")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                Eksportuj
              </button>
            </div>

            {/* ================= STATISTICS ================= */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

              <StatCard
                title="Liczba wyjść"
                value={String(filteredHistory.length)}
                description="zarejestrowanych wyjść"
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-7"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Łączny czas"
                value={`${totalMinutes} min`}
                description="łączny czas wszystkich wyjść"
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="8.5"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 7v5l3 2"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />

              <StatCard
                title="Średni czas"
                value={`${averageDuration} min`}
                description="średni czas pojedynczego wyjścia"
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="8.5"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M12 7v5l3 2"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />
            </div>

            {/* ================= FILTERS ================= */}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-bold">
                    Filtry
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Wyszukaj i przefiltruj historię wyjść.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">

                {/* Search */}

                <div className="lg:col-span-1">
                  <label className="mb-2 block text-xs font-semibold text-slate-500">
                    Uczeń
                  </label>

                  <div className="relative">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                        strokeWidth="1.8"
                      />
                      <path
                        d="m16 16 4 4"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>

                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Szukaj ucznia..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                {/* Class */}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-500">
                    Klasa
                  </label>

                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="Wszystkie">Wszystkie</option>
                    {loadingClasses ? (
                      <option value="loading" disabled>
                        Ładowanie...
                      </option>
                    ) : (
                      classes.map((cls) => (
                        <option key={cls.id} value={cls.name}>
                          {cls.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Reason */}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-500">
                    Powód
                  </label>

                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  >
                    {reasons.map((reason) => (
                      <option key={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-500">
                    Data
                  </label>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {(search ||
                selectedClass !== "Wszystkie" ||
                selectedReason !== "Wszystkie" ||
                selectedDate) && (
                <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
                  <button
                    onClick={() => {
                      setSearch("");
                      setSelectedClass("Wszystkie");
                      setSelectedReason("Wszystkie");
                      setSelectedDate("");
                    }}
                    className="cursor-pointer text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                  >
                    Wyczyść filtry
                  </button>
                </div>
              )}
            </section>

            {/* ================= HISTORY TABLE ================= */}

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 className="text-lg font-bold">
                    Zarejestrowane wyjścia
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Lista wyjść uczniów wraz z czasem trwania.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  {filteredHistory.length} rekordów
                </span>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <circle
                        cx="11"
                        cy="11"
                        r="7"
                        strokeWidth="1.8"
                      />
                      <path
                        d="m16 16 4 4"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Brak wyników
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Nie znaleziono wyjść pasujących do wybranych filtrów.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}

                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[1000px] text-left">

                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-6 py-3 font-semibold">
                            Uczeń
                          </th>

                          <th className="px-6 py-3 font-semibold">
                            Data
                          </th>

                          <th className="px-6 py-3 font-semibold">
                            Lekcja
                          </th>

                          <th className="px-6 py-3 font-semibold">
                            Powód
                          </th>

                          <th className="px-6 py-3 font-semibold">
                            Wyjście
                          </th>

                          <th className="px-6 py-3 font-semibold">
                            Powrót
                          </th>

                          <th className="px-6 py-3 font-semibold">
                            Czas
                          </th>

                          <th className="px-6 py-3 text-right font-semibold">
                            Akcja
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">

                        {filteredHistory.map((record) => (
                          <tr
                            key={record.id}
                            className="transition hover:bg-slate-50/70"
                          >

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">

                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                  {getInitials(record.student)}
                                </div>

                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {record.student}
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    {record.className} • ID:{" "}
                                    {record.studentId
                                      .toString()
                                      .padStart(3, "0")}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-slate-700">
                                {record.date}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {record.lesson}
                                </p>

                                <p className="text-xs text-slate-400">
                                  Sala {record.room}
                                </p>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                {record.reason}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-slate-700">
                                {record.exitTime}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span className="text-sm font-semibold text-emerald-700">
                                {record.returnTime}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                                {record.duration} min
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedRecord(record)}
                                className="mr-2 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Szczegóły
                              </button>

                              <button
                                onClick={() => openCorrection(record)}
                                className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                Korekta
                              </button>
                            </td>
                          </tr>
                        ))}

                      </tbody>
                    </table>
                  </div>

                  {/* Mobile */}

                  <div className="divide-y divide-slate-100 lg:hidden">
                    {filteredHistory.map((record) => (
                      <div
                        key={record.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-3">

                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {getInitials(record.student)}
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {record.student}
                              </p>

                              <p className="text-xs text-slate-400">
                                {record.className} • {record.date}
                              </p>
                            </div>
                          </div>

                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {record.duration} min
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">

                          <InfoItem
                            label="Lekcja"
                            value={record.lesson}
                          />

                          <InfoItem
                            label="Sala"
                            value={record.room}
                          />

                          <InfoItem
                            label="Powód"
                            value={record.reason}
                          />

                          <InfoItem
                            label="Godziny"
                            value={`${record.exitTime} – ${record.returnTime}`}
                          />
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Szczegóły
                          </button>

                          <button
                            onClick={() => openCorrection(record)}
                            className="flex-1 cursor-pointer rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            Korekta
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* FOOTER */}

            <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>System Rejestracji Wyjść Uczniów</p>
              <p>Panel nauczyciela</p>
            </footer>
          </div>
        </div>
      </div>

      {/* ================= DETAILS MODAL ================= */}

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Szczegóły wyjścia
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Informacje o zarejestrowanym wyjściu.
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="cursor-pointer text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3">

              <DetailRow
                label="Uczeń"
                value={selectedRecord.student}
              />

              <DetailRow
                label="Klasa"
                value={selectedRecord.className}
              />

              <DetailRow
                label="Data"
                value={selectedRecord.date}
              />

              <DetailRow
                label="Lekcja"
                value={`${selectedRecord.lesson} • sala ${selectedRecord.room}`}
              />

              <DetailRow
                label="Powód"
                value={selectedRecord.reason}
              />

              <DetailRow
                label="Wyjście"
                value={selectedRecord.exitTime}
              />

              <DetailRow
                label="Powrót"
                value={selectedRecord.returnTime}
              />

              <DetailRow
                label="Czas trwania"
                value={`${selectedRecord.duration} min`}
              />
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="mt-6 w-full cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}

      {/* ================= CORRECTION MODAL ================= */}

      {showCorrectionModal && correctionRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Korekta wyjścia
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Zmień dane zarejestrowanego wyjścia.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCorrectionModal(false);
                  setCorrectionRecord(null);
                }}
                className="cursor-pointer text-slate-400 transition hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                Uczeń
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {correctionRecord.student}
              </p>
            </div>

            <div className="mt-5 space-y-4">

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Powód
                </label>

                <select
                  value={correctionReason}
                  onChange={(e) =>
                    setCorrectionReason(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
                  {reasons
                    .filter((reason) => reason !== "Wszystkie")
                    .map((reason) => (
                      <option key={reason}>
                        {reason}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Godzina wyjścia
                </label>

                <input
                  type="time"
                  value={correctionExitTime}
                  onChange={(e) =>
                    setCorrectionExitTime(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Godzina powrotu
                </label>

                <input
                  type="time"
                  value={correctionReturnTime}
                  onChange={(e) =>
                    setCorrectionReturnTime(e.target.value)
                  }
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">

              <button
                onClick={() => {
                  setShowCorrectionModal(false);
                  setCorrectionRecord(null);
                }}
                className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Anuluj
              </button>

              <button
                onClick={saveCorrection}
                disabled={
                  !correctionExitTime ||
                  !correctionReturnTime ||
                  correctionExitTime >= correctionReturnTime
                }
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Zapisz korektę
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
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <span className="h-5 w-5">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-xs font-medium text-slate-400">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

function formatDateForDisplay(date: string) {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return "";
  }

  return `${day}.${month}.${year}`;
}

function calculateDuration(exitTime: string, returnTime: string) {
  const [exitHour, exitMinute] = exitTime.split(":").map(Number);
  const [returnHour, returnMinute] = returnTime.split(":").map(Number);

  const exit = exitHour * 60 + exitMinute;
  const returned = returnHour * 60 + returnMinute;

  return Math.max(0, returned - exit);
}