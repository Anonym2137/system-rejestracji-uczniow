"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "../../../components/AppShell";

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
  lessonNumber?: string;
  reason: string;
  exitTime: string;
  returnTime: string;
  duration: number | null;
  leftAtIso: string;
  returnedAtIso: string | null;
};

export default function HistoryPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("Wszystkie");
  const [selectedReason, setSelectedReason] = useState("Wszystkie");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<HistoryRecord | null>(null);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionExitTime, setCorrectionExitTime] = useState("");
  const [correctionReturnTime, setCorrectionReturnTime] = useState("");

  const loadHistory = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedClass !== "Wszystkie") params.set("class", selectedClass);
    if (selectedReason !== "Wszystkie") params.set("reason", selectedReason);
    if (selectedDate) {
      params.set("from", selectedDate);
      params.set("to", selectedDate);
    }

    try {
      const res = await fetch(`/api/history?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się pobrać historii.");
        setHistory([]);
        return;
      }
      setError(null);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setError("Nie udało się pobrać historii.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedReason, selectedDate]);

  useEffect(() => {
    fetch("/api/leaves/reasons")
      .then((res) => res.json())
      .then((data: string[]) => setReasons(["Wszystkie", ...data]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    if (selectedClass !== "Wszystkie") params.set("class", selectedClass);
    if (selectedReason !== "Wszystkie") params.set("reason", selectedReason);
    if (selectedDate) {
      params.set("from", selectedDate);
      params.set("to", selectedDate);
    }

    fetch(`/api/history?${params.toString()}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setError(data.error ?? "Nie udało się pobrać historii.");
          setHistory([]);
          return;
        }
        setError(null);
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Nie udało się pobrać historii.");
          setHistory([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedClass, selectedReason, selectedDate]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data: ClassItem[]) => {
        if (cancelled) return;
        setClasses(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter((record) => {
      const matchesSearch = record.student
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [history, search]);

  const totalMinutes = filteredHistory.reduce(
    (sum, record) => sum + (record.duration ?? 0),
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
    setCorrectionError(null);
    setShowCorrectionModal(true);
  };

  /**
   * Bug 1: korekta musi trafić do backendu (wcześniej zmieniała tylko stan
   * lokalny i przepadała po odświeżeniu). Budujemy pełne znaczniki czasu ISO
   * z daty wyjścia + wpisanej godziny, zachowując oryginalną datę.
   */
  const buildTimestamp = (time: string, referenceIso: string): string | null => {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const base = new Date(referenceIso);
    base.setHours(h, m, 0, 0);
    return base.toISOString();
  };

  const saveCorrection = async () => {
    if (!correctionRecord) return;
    setSavingCorrection(true);
    setCorrectionError(null);

    try {
      const leftAt = buildTimestamp(correctionExitTime, correctionRecord.leftAtIso);
      const returnedAt = correctionReturnTime
        ? buildTimestamp(correctionReturnTime, correctionRecord.leftAtIso)
        : null;

      const res = await fetch(`/api/leaves/${correctionRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: correctionReason, leftAt, returnedAt }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCorrectionError(data.error ?? "Nie udało się zapisać korekty.");
        return;
      }

      setShowCorrectionModal(false);
      setCorrectionRecord(null);
      await loadHistory();
    } catch {
      setCorrectionError("Nie udało się zapisać korekty.");
    } finally {
      setSavingCorrection(false);
    }
  };

  return (
    <AppShell title="Historia wyjść">
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

              {loading ? (
                <div className="px-5 py-16 text-center text-sm text-slate-400">
                  Ładowanie...
                </div>
              ) : error ? (
                <div className="px-5 py-16 text-center text-sm font-semibold text-red-600">
                  {error}
                </div>
              ) : filteredHistory.length === 0 ? (
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
                value={selectedRecord.lesson}
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

            {correctionError && (
              <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {correctionError}
              </div>
            )}

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
                disabled={savingCorrection}
                className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {savingCorrection ? "Zapisywanie..." : "Zapisz korektę"}
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
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <span className="h-5 w-5">{icon}</span>
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
