# Plan: Połączenie baz danych ze stronami + zarządzanie kontami admina

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Wszystkie strony korzystają z realnej bazy danych (zero mocków), admin może tworzyć konta uczniów i nauczycieli, kod jest czytelny i bez błędów.

**Architecture:** Next.js 16 App Router + Drizzle ORM + Better Auth. Każda strona pobiera dane z API routes. Admin ma dedykowane API do zarządzania użytkownikami, klasami i uczniami.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Drizzle ORM, Better Auth, SQLite (libsql)

---

## Current context / assumptions

- Dashboard (`src/app/page.tsx`) — już w pełni podłączony do API
- Classes (`src/app/(pages)/classes/page.tsx`) — pobiera klasy i uczniów z API, ale ma zahardkodowane `initialClasses`/`initialStudents` jako fallback
- History (`src/app/(pages)/history/page.tsx`) — pobiera historię z API, ale ma zahardkodowany `initialHistory` (8 rekordów) jako fallback
- Settings (`src/app/(pages)/settings/page.tsx`) — **całkowicie mockowa**, zero wywołań API, `initialUsers` (4 użytkowników)
- API routes istniejące: `/api/dashboard`, `/api/lesson`, `/api/leaves`, `/api/leaves/[id]/return`, `/api/history`, `/api/classes`, `/api/students`, `/api/auth/[...auth]`
- Brakujące API: zarządzanie użytkownikami, tworzenie klas, tworzenie uczniów
- Brak testów w projekcie

---

## Proposed approach

1. **Naprawa istniejących stron** — usunięcie mocków, pełne poleganie na API
2. **Nowe API routes** — CRUD dla użytkowników, klas, uczniów (tylko admin)
3. **Settings page** — pełna integracja z API zarządzania
4. **Code review & bugfix** — czytelność, typowanie, edge cases

---

## Step-by-step plan

### Task 1: Usunięcie mocków ze strony Classes

**Objective:** Strona Classes pobiera wszystko z API, zero hardcoded data.

**Files:**
- Modify: `src/app/(pages)/classes/page.tsx`

**Step 1: Usuń `initialClasses` i `initialStudents`**

Usuń linie 22-44 (tablice `initialClasses` i `initialStudents`).

**Step 2: Zmień stan początkowy na pusty**

```tsx
const [classes, setClasses] = useState<ClassItem[]>([]);
const [students, setStudents] = useState<Student[]>([]);
```

**Step 3: Usuń nieużywany import `useRouter`**

`useRouter` jest importowany ale nieużywany — usuń z importu.

**Step 4: Zweryfikuj**

Run: `npm run dev` → otwórz `/classes` → dane powinny pochodzić z API (po seedzie: 2 klasy, 5 uczniów).

**Step 5: Commit**

```bash
git add src/app/(pages)/classes/page.tsx
git commit -m "refactor: remove mock data from Classes page"
```

---

### Task 2: Usunięcie mocków ze strony History

**Objective:** Strona History pobiera wszystko z API, zero hardcoded data.

**Files:**
- Modify: `src/app/(pages)/history/page.tsx`

**Step 1: Usuń `initialHistory` i `reasons`**

Usuń linie 29-143 (tablice `initialHistory` i `reasons`).

**Step 2: Zmień stan początkowy**

```tsx
const [history, setHistory] = useState<HistoryRecord[]>([]);
```

**Step 3: Pobieraj powody wyjść z API**

Dodaj nowy endpoint lub pobieraj unikalne powody z historii. Najprościej — dodaj `?reasons=true` do `/api/history` lub stwórz osobny endpoint. **Decyzja:** dodaj prosty endpoint `/api/leaves/reasons` zwracający unikalne powody.

**Step 4: Usuń nieużywany import `useRouter`**

**Step 5: Zweryfikuj**

Run: `npm run dev` → otwórz `/history` → dane z API, filtry działają.

**Step 6: Commit**

```bash
git add src/app/(pages)/history/page.tsx
git commit -m "refactor: remove mock data from History page"
```

---

### Task 3: Endpoint `/api/leaves/reasons`

**Objective:** Zwraca listę unikalnych powodów wyjścia do filtra na stronie History.

**Files:**
- Create: `src/app/api/leaves/reasons/route.ts`

**Step 1: Utwórz route**

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { studentLeave } from "../../../../db/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const rows = await db
      .selectDistinct({ reason: studentLeave.reason })
      .from(studentLeave)
      .where(eq(studentLeave.reason, studentLeave.reason));

    const reasons = rows
      .map((r) => r.reason)
      .filter((r): r is string => r !== null)
      .sort();

    return NextResponse.json(reasons);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Test**

Run: `npm run dev` → `curl http://localhost:3000/api/leaves/reasons` (po zalogowaniu) → `["Higienistka","Toaleta"]`.

**Step 3: Commit**

```bash
git add src/app/api/leaves/reasons/route.ts
git commit -m "feat: add /api/leaves/reasons endpoint"
```

---

### Task 4: Endpoint `/api/users` — lista użytkowników (admin)

**Objective:** Admin widzi listę wszystkich użytkowników.

**Files:**
- Create: `src/app/api/users/route.ts`

**Step 1: Utwórz route**

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { user } from "../../../db/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.createdAt);

    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Test**

Run: `npm run dev` → zaloguj się jako admin@gmail.com → `curl http://localhost:3000/api/users` → lista 4 użytkowników.

**Step 3: Commit**

```bash
git add src/app/api/users/route.ts
git commit -m "feat: add GET /api/users endpoint (admin only)"
```

---

### Task 5: Endpoint `/api/users` — tworzenie użytkownika (admin)

**Objective:** Admin tworzy nowe konto (nauczyciel/educator/admin/student).

**Files:**
- Create: `src/app/api/users/route.ts` (dodaj POST)

**Step 1: Dodaj POST handler**

```ts
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, role } = body as {
      email: string;
      password: string;
      name: string;
      role: "admin" | "teacher" | "educator" | "student";
    };

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
    }

    const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Użytkownik już istnieje" }, { status: 409 });
    }

    const newUser = await auth.api.signUpEmail({
      body: { email, password, name },
    });

    if (!newUser?.user) {
      return NextResponse.json({ error: "Nie udało się utworzyć użytkownika" }, { status: 500 });
    }

    await db.update(user).set({ role }).where(eq(user.id, newUser.user.id));

    return NextResponse.json({ success: true, user: newUser.user }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Test**

Run: `npm run dev` → zaloguj się jako admin → POST `/api/users` z `{email, password, name, role}` → 201.

**Step 3: Commit**

```bash
git add src/app/api/users/route.ts
git commit -m "feat: add POST /api/users endpoint (admin creates user)"
```

---

### Task 6: Endpoint `/api/classes` — tworzenie klasy (admin)

**Objective:** Admin tworzy nową klasę.

**Files:**
- Modify: `src/app/api/classes/route.ts` (dodaj POST)

**Step 1: Dodaj POST handler**

```ts
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await request.json();
    const { name, educatorId } = body as { name: string; educatorId?: string };

    if (!name) {
      return NextResponse.json({ error: "Brak nazwy klasy" }, { status: 400 });
    }

    const [newClass] = await db
      .insert(schoolClass)
      .values({ name, educatorId: educatorId || null })
      .returning();

    return NextResponse.json({ success: true, class: newClass }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Test**

Run: `npm run dev` → POST `/api/classes` z `{name: "3C"}` → 201.

**Step 3: Commit**

```bash
git add src/app/api/classes/route.ts
git commit -m "feat: add POST /api/classes endpoint (admin creates class)"
```

---

### Task 7: Endpoint `/api/students` — tworzenie ucznia (admin)

**Objective:** Admin tworzy nowego ucznia i przypisuje do klasy.

**Files:**
- Modify: `src/app/api/students/route.ts` (dodaj POST)

**Step 1: Dodaj POST handler**

```ts
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, classId } = body as {
      firstName: string;
      lastName: string;
      classId: number;
    };

    if (!firstName || !lastName || !classId) {
      return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
    }

    const cls = await db.select().from(schoolClass).where(eq(schoolClass.id, classId)).limit(1);
    if (!cls.length) {
      return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
    }

    const [newStudent] = await db
      .insert(student)
      .values({ firstName, lastName, classId })
      .returning();

    return NextResponse.json({ success: true, student: newStudent }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Test**

Run: `npm run dev` → POST `/api/students` z `{firstName, lastName, classId}` → 201.

**Step 3: Commit**

```bash
git add src/app/api/students/route.ts
git commit -m "feat: add POST /api/students endpoint (admin creates student)"
```

---

### Task 8: Pełna integracja Settings page z API

**Objective:** Strona Settings pobiera użytkowników z API, admin może tworzyć nowe konta.

**Files:**
- Modify: `src/app/(pages)/settings/page.tsx`

**Step 1: Usuń `initialUsers`**

Usuń linie 16-21 (tablice `initialUsers`).

**Step 2: Dodaj typy i stan**

```tsx
type User = {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "teacher" | "educator" | "student";
  emailVerified: boolean;
  createdAt: Date;
};
```

**Step 3: Pobieraj użytkowników z API**

```tsx
useEffect(() => {
  fetch("/api/users")
    .then((res) => res.json())
    .then((data: User[]) => setUsers(data))
    .catch(() => {});
}, []);
```

**Step 4: Dodaj formularz tworzenia użytkownika**

Modal z polami: email, password, name, role (select). Wywołuje POST `/api/users`.

**Step 5: Dodaj zakładkę "Klasy i uczniowie"**

Modal do tworzenia klasy (nazwa + wybór wychowawcy) i ucznia (imię, nazwisko, klasa).

**Step 6: Zweryfikuj**

Run: `npm run dev` → otwórz `/settings` → lista użytkowników z API, tworzenie konta działa.

**Step 7: Commit**

```bash
git add src/app/(pages)/settings/page.tsx
git commit -m "feat: wire Settings page to user management API"
```

---

### Task 9: Code review — czytelność i bugfix

**Objective:** Przegląd kodu pod kątem błędów i poprawa czytelności.

**Files:**
- Review: `src/app/(pages)/classes/page.tsx`
- Review: `src/app/(pages)/history/page.tsx`
- Review: `src/app/(pages)/settings/page.tsx`
- Review: `src/app/page.tsx`
- Review: `src/app/api/*/route.ts`

**Step 1: Sprawdź nieużywane importy**

Wszystkie strony: `useRouter` importowany ale nieużywany — usuń.

**Step 2: Sprawdź typowanie**

- `classes/page.tsx`: `ClassItem` ma `teacher: string` ale API zwraca `teacher: string | null` — dodaj fallback
- `history/page.tsx`: `HistoryRecord.duration` może być `null` — sprawdź czy `totalMinutes` to obsługuje

**Step 3: Sprawdź error handling**

- Wszystkie API routes: czy `console.error` jest w odpowiednich miejscach?
- Czy błędy są zwracane jako JSON z odpowiednim statusem?

**Step 4: Sprawdź bezpieczeństwo**

- Czy wszystkie API routes sprawdzają sesję?
- Czy admin-only routes faktycznie wymagają roli admin?

**Step 5: Popraw czytelność**

- Nazwy zmiennych: czy są spójne?
- Komentarze: czy są po polsku i pomocne?
- Formatowanie: czy jest spójne (quotes, semicolons)?

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: code review, remove unused imports, fix types"
```

---

### Task 10: Aktualizacja AGENTS.md

**Objective:** Dodaj informacje o nowych endpointach i zmianach.

**Files:**
- Modify: `AGENTS.md`

**Step 1: Dodaj nowe endpointy do tabeli API**

```
| `/api/users` | GET | List all users (admin only) |
| `/api/users` | POST | Create user (admin only) |
| `/api/classes` | POST | Create class (admin only) |
| `/api/students` | POST | Create student (admin only) |
| `/api/leaves/reasons` | GET | Unique leave reasons |
```

**Step 2: Aktualizuj sekcję "Pitfalls"**

Usuń "Classes, History, and Settings pages contain hardcoded mock data" — już nieprawda.

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md with new endpoints"
```

---

## Files likely to change

| File | Change |
|---|---|
| `src/app/(pages)/classes/page.tsx` | Usunięcie mocków, naprawa typów |
| `src/app/(pages)/history/page.tsx` | Usunięcie mocków, pobieranie powodów z API |
| `src/app/(pages)/settings/page.tsx` | Pełna integracja z API, formularze tworzenia |
| `src/app/api/leaves/reasons/route.ts` | **Nowy** endpoint |
| `src/app/api/users/route.ts` | **Nowy** endpoint (GET + POST) |
| `src/app/api/classes/route.ts` | Dodanie POST |
| `src/app/api/students/route.ts` | Dodanie POST |
| `AGENTS.md` | Aktualizacja dokumentacji |

---

## Tests / validation

- `npm run lint` — zero błędów
- `npm run build` — zero błędów
- `npm run dev` → przeglądarka:
  - `/classes` — dane z API, zero mocków
  - `/history` — dane z API, filtry działają
  - `/settings` — lista użytkowników z API, tworzenie konta działa
  - `/` — dashboard działa jak dotychczas
- `curl` testy endpointów (po zalogowaniu jako admin):
  - `GET /api/users` → 200, lista
  - `POST /api/users` → 201, nowy użytkownik
  - `POST /api/classes` → 201, nowa klasa
  - `POST /api/students` → 201, nowy uczeń
  - `GET /api/leaves/reasons` → 200, lista powodów

---

## Risks, tradeoffs, and open questions

- **Brak testów** — ręczne testowanie w przeglądarce jest konieczne
- **Bezpieczeństwo** — POST `/api/users` pozwala adminowi tworzyć konta z dowolną rolą — czy to OK? (Tak, admin ma pełne uprawnienia)
- **Walidacja** — brak walidacji haseł (min. długość, siła) — dodać?
- **Paginacja** — lista użytkowników/historii może być długa — dodać paginację?
- **Usuwanie** — czy admin powinien móc usuwać użytkowników/klasy/uczniów? (Obecnie nie ma DELETE endpointów)
- **Role** — czy `student` powinien mieć dostęp do systemu? (Obecnie nie ma logowania dla uczniów)

---

## Execution handoff

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
