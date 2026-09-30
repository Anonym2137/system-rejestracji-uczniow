# Plan: Naprawa crashu settings, wylogowanie, wybór przedmiotu, realne dane

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Naprawić crash strony `/settings` dla educatora, dodać wylogowanie, wybór przedmiotu/numeru lekcji/godziny oraz zastąpić stałe wartości realnymi danymi użytkownika.

**Architecture:** Modyfikacja istniejących komponentów React (page.tsx, settings/page.tsx) oraz endpointów API. Brak nowych plików. Wylogowanie przez `signOut` z `auth-client`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Better Auth, Drizzle ORM

---

## Current Context / Assumptions

- **Crash settings:** Sidebar pokazuje "Ustawienia" wszystkim użytkownikom, ale `/api/users` zwraca 403 dla educatora. `settings/page.tsx:59-63` wykonuje `res.json()` i mapuje na `User[]` — gdy API zwraca `{error: "Brak uprawnień"}`, `data` jest obiektem z `error`, nie tablicą, co powoduje crash przy `users.map()`.
- **Wylogowanie:** `settings/page.tsx:182` ma `showLogoutConfirm` state, ale nie ma modala ani logiki. `auth-client.ts` eksportuje `signOut`. Dashboard page nie ma przycisku wylogowania.
- **Stałe wartości:** W sidebarze i headerze dashboardu oraz settings page wyświetla się "Jan Kowalski" / "Nauczyciel" / "JK" zamiast realnego użytkownika. "Klasa 5P" zamiast realnej nazwy klasy.
- **Przedmiot:** `page.tsx:331` używa `subject || "Informatyka"` — brak inputu dla nauczyciela.
- **Numer lekcji / godzina:** Brak pól na numer lekcji (np. "Lekcja 3") i godzinę rozpoczęcia.

---

## Proposed Approach

1. **Naprawa settings:** Dodać obsługę błędu 403 w `settings/page.tsx` — pokaż komunikat "Brak uprawnień" zamiast crasha. Sidebar powinien pokazywać "Ustawienia" tylko adminom (lub dodać zakładkę "Profil" dla nie-adminów).
2. **Wylogowanie:** Dodać modal potwierdzenia wylogowania w `settings/page.tsx` oraz przycisk wylogowania w sidebarze dashboardu. Użyć `signOut()` z `auth-client`.
3. **Wybór przedmiotu:** Dodać input tekstowy dla przedmiotu w sekcji "Aktualna lekcja" (zamiast domyślnego "Informatyka").
4. **Numer lekcji i godzina:** Dodać inputy dla numeru lekcji i godziny rozpoczęcia.
5. **Realne dane:** Zastąpić "Jan Kowalski" / "Nauczyciel" / "JK" danymi z `currentUser` (dashboard) i `useSession` (settings). Zastąpić "Klasa 5P" nazwą klasy z `className`.

---

## Step-by-Step Plan

### Task 1: Naprawa crashu settings — obsługa 403

**Objective:** Educator zobaczy komunikat "Brak uprawnień" zamiast crasha.

**Files:**
- Modify: `src/app/(pages)/settings/page.tsx:58-64`

**Step 1: Dodać sprawdzenie `res.ok` przed mapowaniem**

```tsx
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
```

**Step 2: Dodać komunikat w UI gdy brak uprawnień**

W `settings/page.tsx` gdzie renderowana jest zakładka "users", dodać warunek:
```tsx
{users === null ? (
  <p className="px-6 py-10 text-center text-sm text-slate-400">
    Brak uprawnień do przeglądania użytkowników
  </p>
) : (
  // istniejąca tabela
)}
```

**Step 3: Zmienić typ `users` na `User[] | null`**

```tsx
const [users, setUsers] = useState<User[] | null>(null);
```

**Step 4: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 2: Sidebar — ukrycie "Ustawienia" dla nie-adminów

**Objective:** Educator nie zobaczy zakładki "Ustawienia" w sidebarze.

**Files:**
- Modify: `src/app/(pages)/settings/page.tsx:230-250` (sidebar link)
- Modify: `src/app/page.tsx:480-510` (sidebar dashboard)

**Step 1: Dodać `useSession` w settings page**

```tsx
import { useSession } from "@/lib/auth-client";

const { data: session } = useSession();
const isAdmin = session?.user?.role === "admin";
```

**Step 2: Warunkowe renderowanie linku "Ustawienia"**

```tsx
{isAdmin && (
  <Link href="/settings" ...>
    Ustawienia
  </Link>
)}
```

**Step 3: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 3: Wylogowanie — modal w settings

**Objective:** Użytkownik może się wylogować ze strony ustawień.

**Files:**
- Modify: `src/app/(pages)/settings/page.tsx:182, 262-270`

**Step 1: Dodać modal potwierdzenia**

```tsx
{showLogoutConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
      <h3 className="text-lg font-bold">Wylogowanie</h3>
      <p className="mt-2 text-sm text-slate-500">
        Czy na pewno chcesz się wylogować?
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setShowLogoutConfirm(false)}
          className="flex-1 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Anuluj
        </button>
        <button
          onClick={async () => {
            await signOut();
            router.push("/sign-in");
          }}
          className="flex-1 cursor-pointer rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Wyloguj
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 2: Import `signOut` i `useSession`**

```tsx
import { signOut, useSession } from "@/lib/auth-client";
```

**Step 3: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 4: Wylogowanie — przycisk w sidebarze dashboardu

**Objective:** Użytkownik może się wylogować z dashboardu.

**Files:**
- Modify: `src/app/page.tsx:480-510` (sidebar)

**Step 1: Dodać import**

```tsx
import { signOut, useSession } from "@/lib/auth-client";
```

**Step 2: Dodać przycisk wylogowania w sidebarze**

W `page.tsx` w sekcji sidebar (gdzie jest "Jan Kowalski"), dodać:
```tsx
<button
  onClick={async () => {
    await signOut();
    router.push("/sign-in");
  }}
  className="cursor-pointer text-slate-400 transition hover:text-white"
  title="Wyloguj"
>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
    <path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
</button>
```

**Step 3: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 5: Wybór przedmiotu — input zamiast domyślnej wartości

**Objective:** Nauczyciel wybiera przedmiot z listy lub wpisuje własny.

**Files:**
- Modify: `src/app/page.tsx:310-333` (toggleLesson)
- Modify: `src/app/page.tsx:606-683` (sekcja "Aktualna lekcja")

**Step 1: Dodać input przedmiotu w sekcji "Aktualna lekcja"**

```tsx
{!lessonActive && (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-semibold text-slate-500">Przedmiot</label>
    <input
      type="text"
      value={subject}
      onChange={(e) => setSubject(e.target.value)}
      placeholder="np. Matematyka, Język polski, Angielski"
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    />
  </div>
)}
```

**Step 2: Usunąć domyślną wartość "Informatyka" z `toggleLesson`**

```tsx
body: JSON.stringify({
  action: "start",
  classId,
  subject: subject || undefined, // nie wysyłaj pustego stringa
}),
```

**Step 3: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 6: Numer lekcji i godzina rozpoczęcia

**Objective:** Nauczyciel podaje numer lekcji i godzinę rozpoczęcia.

**Files:**
- Modify: `src/app/page.tsx` (nowe stany, inputy, przekazanie do API)
- Modify: `src/app/api/lesson/route.ts` (nowe pola w body)

**Step 1: Dodać nowe stany w `page.tsx`**

```tsx
const [lessonNumber, setLessonNumber] = useState<string>("");
const [lessonStartTime, setLessonStartTime] = useState<string>("");
```

**Step 2: Dodać inputy w sekcji "Aktualna lekcja"**

```tsx
{!lessonActive && (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-semibold text-slate-500">Numer lekcji</label>
    <input
      type="text"
      value={lessonNumber}
      onChange={(e) => setLessonNumber(e.target.value)}
      placeholder="np. 3"
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    />
  </div>
)}

{!lessonActive && (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-semibold text-slate-500">Godzina rozpoczęcia</label>
    <input
      type="time"
      value={lessonStartTime}
      onChange={(e) => setLessonStartTime(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    />
  </div>
)}
```

**Step 3: Przekazać nowe pola do API w `toggleLesson`**

```tsx
body: JSON.stringify({
  action: "start",
  classId,
  subject: subject || undefined,
  lessonNumber: lessonNumber || undefined,
  startTime: lessonStartTime || undefined,
}),
```

**Step 4: Modyfikacja `/api/lesson/route.ts` — nowe pola**

W `route.ts` dodać do typu body:
```ts
lessonNumber?: string;
startTime?: string;
```

W insert:
```ts
.values({
  classId: classIdNum,
  teacherId: userId,
  subject: subject || "Przedmiot",
  lessonNumber: lessonNumber || null,
  startTime: startTime ? new Date(startTime) : null,
  isActive: true,
  startedAt: new Date(),
})
```

**Step 5: Modyfikacja schematu — nowe kolumny**

W `src/db/schema.ts` dodać do `lessonSession`:
```ts
lessonNumber: text('lesson_number'),
startTime: text('start_time'),
```

**Step 6: Wygenerować migrację**

```bash
npm run db:generate
npm run db:migrate
```

**Step 7: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 7: Realne dane użytkownika w sidebarze dashboardu

**Objective:** Sidebar pokazuje realne imię, nazwisko i rolę zamiast "Jan Kowalski".

**Files:**
- Modify: `src/app/page.tsx:480-510` (sidebar)

**Step 1: Zastąpić stałe wartości**

```tsx
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
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 8: Realne dane użytkownika w headerze dashboardu

**Objective:** Header pokazuje realne imię, nazwisko i rolę.

**Files:**
- Modify: `src/app/page.tsx:530-545` (header)

**Step 1: Zastąpić stałe wartości**

```tsx
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
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 9: Realna nazwa klasy w nagłówku listy uczniów

**Objective:** "Klasa 5P" zastąpione realną nazwą klasy.

**Files:**
- Modify: `src/app/page.tsx:693`

**Step 1: Zastąpić**

```tsx
<p className="mt-1 text-sm text-slate-500">
  {className || "—"} • {students.length} uczniów
</p>
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 10: Realne dane użytkownika w settings page

**Objective:** Sidebar i header settings page pokazują realne dane.

**Files:**
- Modify: `src/app/(pages)/settings/page.tsx:255-260, 294-299`

**Step 1: Dodać `useSession`**

```tsx
import { useSession } from "@/lib/auth-client";

const { data: session } = useSession();
const userName = session?.user?.name || "Użytkownik";
const userRole = session?.user?.role;
const userInitials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?";
const roleLabel = userRole === "admin" ? "Administrator" :
                  userRole === "educator" ? "Wychowawca" :
                  userRole === "teacher" ? "Nauczyciel" : "Użytkownik";
```

**Step 2: Zastąpić stałe wartości w sidebarze i headerze**

```tsx
// Sidebar
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
  {userInitials}
</div>
<div className="min-w-0 flex-1">
  <p className="truncate text-sm font-semibold">{userName}</p>
  <p className="text-xs text-slate-400">{roleLabel}</p>
</div>

// Header
<div className="hidden text-right sm:block">
  <p className="text-sm font-semibold">{userName}</p>
  <p className="text-xs text-slate-400">{roleLabel}</p>
</div>
<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
  {userInitials}
</div>
```

**Step 3: Weryfikacja**

```bash
npm run lint
npm run build
```

---

## Files Likely to Change

- `src/app/(pages)/settings/page.tsx` — obsługa 403, wylogowanie, realne dane
- `src/app/page.tsx` — wylogowanie, wybór przedmiotu, numer lekcji, godzina, realne dane
- `src/app/api/lesson/route.ts` — nowe pola `lessonNumber`, `startTime`
- `src/db/schema.ts` — nowe kolumny `lesson_number`, `start_time`

---

## Tests / Validation

Każdy task kończy się:
```bash
npm run lint
npm run build
```

Po wszystkich taskach:
```bash
npm run dev
```
- Zaloguj się jako educator (`maria.w@szkola.pl` / `haslo123`)
- Sprawdź czy `/settings` nie crashuje (pokazuje "Brak uprawnień")
- Sprawdź czy wylogowanie działa
- Sprawdź czy wybór przedmiotu, numeru lekcji i godziny działa
- Sprawdź czy sidebar i header pokazują realne dane

---

## Risks, Tradeoffs, and Open Questions

- **Ryzyko:** Dodanie nowych kolumn do `lessonSession` wymaga migracji. Jeśli migracja się nie powiedzie, trzeba ręcznie usunąć `sqlite.db` i uruchomić `npm run db:seed`.
- **Tradeoff:** Ukrycie "Ustawienia" dla educatora może być niewłaściwe — może educator powinien mieć dostęp do ustawień profilu (nie użytkowników). W planie zakładam że nie.
- **Open Question:** Czy numer lekcji powinien być automatycznie generowany (np. na podstawie istniejących lekcji) czy ręcznie wpisywany przez nauczyciela?
- **Open Question:** Czy godzina rozpoczęcia powinna być automatycznie ustawiana na `now()` czy ręcznie wybierana przez nauczyciela?

---

## Execution Handoff

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
