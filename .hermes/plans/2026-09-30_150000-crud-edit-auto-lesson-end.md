# Plan: Edycja użytkowników/uczniów/klas + auto-zakończenie lekcji + info o aktywnej lekcji

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Dodać pełne CRUD (edycję) dla użytkowników, uczniów i klas w settings page, automatyczne zakończenie lekcji po 45 minutach od wskazanego czasu oraz informację o już aktywnej lekcji z możliwością jej zakończenia.

**Architecture:** Nowe endpointy API (PUT/PATCH/DELETE) dla users, students, classes. Modyfikacja dashboard endpointu do auto-zakończenia lekcji. Nowe modale edycji w settings page. Modyfikacja dashboard page do pokazania informacji o aktywnej lekcji.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Drizzle ORM, Better Auth, SQLite (libsql)

---

## Current Context / Assumptions

- **Brak edycji:** Istnieją tylko endpointy GET i POST dla users, students, classes. Brak PUT/PATCH/DELETE.
- **Auto-zakończenie:** Brak mechanizmu automatycznego zakończenia lekcji. Lekcja trwa nieskończenie, aż nauczyciel kliknie "Zakończ lekcję".
- **Info o aktywnej lekcji:** Dashboard zwraca `lesson` z `isActive: true`, ale nie ma informacji "lekcja już trwa" przycisku "Zakończ lekcję" jest dostępny tylko gdy `lessonActive === true`.
- **Settings page:** Ma zakładki "users", "classes", "roles", "config". Tylko admin może zarządzać użytkownikami i klasami.
- **Lekcja:** Ma `startedAt` (timestamp), `isActive` (boolean), `subject`, `lessonNumber`, `startTime` (string "HH:MM").

---

## Proposed Approach

1. **CRUD endpointy:** Dodać PUT/PATCH/DELETE dla users, students, classes w osobnych plikach route.ts.
2. **Modale edycji:** Dodać modale edycji w settings page dla users, students, classes.
3. **Auto-zakończenie:** Dodać logikę w dashboard endpoint — gdy lekcja jest aktywna i minęło >45 min od `startedAt`, automatycznie zakończ ją (`isActive = false`).
4. **Info o aktywnej lekcji:** Dashboard page powinien pokazać "Lekcja już trwa" z przyciskiem "Zakończ lekcję" gdy `lesson.isActive === true`.

---

## Step-by-Step Plan

### Task 1: PUT /api/users/[id] — edycja użytkownika

**Objective:** Admin może edytować imię, email, rolę użytkownika.

**Files:**
- Create: `src/app/api/users/[id]/route.ts`

**Step 1: Utworzyć plik route.ts**

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { user } from "../../../../db/schema";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role } = body as {
      name?: string;
      email?: string;
      role?: "admin" | "teacher" | "educator" | "student";
    };

    const existing = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    const [updated] = await db
      .update(user)
      .set({
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
      })
      .where(eq(user.id, id))
      .returning();

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 2: PATCH /api/students/[id] — edycja ucznia

**Objective:** Admin może edytować imię, nazwisko, klasę ucznia.

**Files:**
- Create: `src/app/api/students/[id]/route.ts`

**Step 1: Utworzyć plik route.ts**

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { student, schoolClass } from "../../../../db/schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, classId } = body as {
      firstName?: string;
      lastName?: string;
      classId?: number;
    };

    const existing = await db.select().from(student).where(eq(student.id, Number(id))).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Uczeń nie istnieje" }, { status: 404 });
    }

    if (classId !== undefined) {
      const cls = await db.select().from(schoolClass).where(eq(schoolClass.id, classId)).limit(1);
      if (!cls.length) {
        return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
      }
    }

    const [updated] = await db
      .update(student)
      .set({
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(classId !== undefined && { classId }),
      })
      .where(eq(student.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 3: PUT /api/classes/[id] — edycja klasy

**Objective:** Admin może edytować nazwę i wychowawcę klasy.

**Files:**
- Create: `src/app/api/classes/[id]/route.ts`

**Step 1: Utworzyć plik route.ts**

```ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { schoolClass, user } from "../../../../db/schema";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await request.json();
    const { name, educatorId } = body as {
      name?: string;
      educatorId?: string;
    };

    const existing = await db.select().from(schoolClass).where(eq(schoolClass.id, Number(id))).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
    }

    if (educatorId !== undefined) {
      const educator = await db.select().from(user).where(eq(user.id, educatorId)).limit(1);
      if (!educator.length) {
        return NextResponse.json({ error: "Wychowawca nie istnieje" }, { status: 404 });
      }
    }

    const [updated] = await db
      .update(schoolClass)
      .set({
        ...(name !== undefined && { name }),
        ...(educatorId !== undefined && { educatorId }),
      })
      .where(eq(schoolClass.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, class: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 4: DELETE /api/users/[id] — usuwanie użytkownika

**Objective:** Admin może usunąć użytkownika.

**Files:**
- Modify: `src/app/api/users/[id]/route.ts` (dodać DELETE)

**Step 1: Dodać funkcję DELETE**

```ts
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const existing = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    await db.delete(user).where(eq(user.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 5: DELETE /api/students/[id] — usuwanie ucznia

**Objective:** Admin może usunąć ucznia.

**Files:**
- Modify: `src/app/api/students/[id]/route.ts` (dodać DELETE)

**Step 1: Dodać funkcję DELETE**

```ts
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const existing = await db.select().from(student).where(eq(student.id, Number(id))).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Uczeń nie istnieje" }, { status: 404 });
    }

    await db.delete(student).where(eq(student.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 6: DELETE /api/classes/[id] — usuwanie klasy

**Objective:** Admin może usunąć klasę.

**Files:**
- Modify: `src/app/api/classes/[id]/route.ts` (dodać DELETE)

**Step 1: Dodać funkcję DELETE**

```ts
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const existing = await db.select().from(schoolClass).where(eq(schoolClass.id, Number(id))).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
    }

    await db.delete(schoolClass).where(eq(schoolClass.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 7: Modal edycji użytkownika w settings page

**Objective:** Admin może edytować użytkownika przez modal.

**Files:**
- Modify: `src/app/(pages)/settings/page.tsx`

**Step 1: Dodać stany modala**

```tsx
const [showEditUser, setShowEditUser] = useState(false);
const [editingUser, setEditingUser] = useState<User | null>(null);
const [editUserName, setEditUserName] = useState("");
const [editUserEmail, setEditUserEmail] = useState("");
const [editUserRole, setEditUserRole] = useState<"admin" | "teacher" | "educator" | "student">("teacher");
```

**Step 2: Dodać funkcję otwierającą modal**

```tsx
const openEditUser = (user: User) => {
  setEditingUser(user);
  setEditUserName(user.name || "");
  setEditUserEmail(user.email);
  setEditUserRole(user.role);
  setShowEditUser(true);
};
```

**Step 3: Dodać funkcję zapisującą**

```tsx
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
```

**Step 4: Dodać przycisk "Edytuj" w tabeli użytkowników**

```tsx
<td className="px-6 py-4">
  <button
    onClick={() => openEditUser(user)}
    className="cursor-pointer text-blue-600 hover:text-blue-800"
  >
    Edytuj
  </button>
</td>
```

**Step 5: Dodać modal edycji**

```tsx
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
```

**Step 6: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 8: Modal edycji ucznia w settings page

**Objective:** Admin może edytować ucznia przez modal.

**Files:**
- Modify: `src/app/(pages)/settings/page.tsx`

**Step 1: Dodać stany modala**

```tsx
const [showEditStudent, setShowEditStudent] = useState(false);
const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
const [editStudentName, setEditStudentName] = useState("");
const [editStudentClassId, setEditStudentClassId] = useState<number | null>(null);
```

**Step 2: Dodać typ StudentItem**

```tsx
type StudentItem = {
  id: number;
  name: string;
  classId: number;
  className: string;
};
```

**Step 3: Dodać funkcje otwierającą i zapisującą**

```tsx
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
    // Odśwież listę uczniów
    setShowEditStudent(false);
  } catch (err) {
    alert(err instanceof Error ? err.message : "Błąd");
  }
};
```

**Step 4: Dodać przycisk "Edytuj" w tabeli uczniów**

```tsx
<td className="px-6 py-4">
  <button
    onClick={() => openEditStudent(student)}
    className="cursor-pointer text-blue-600 hover:text-blue-800"
  >
    Edytuj
  </button>
</td>
```

**Step 5: Dodać modal edycji**

```tsx
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
```

**Step 6: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 9: Modal edycji klasy w settings page

**Objective:** Admin może edytować klasę przez modal.

**Files:**
- Modify: `src/app/(pages)/settings/page.tsx`

**Step 1: Dodać stany modala**

```tsx
const [showEditClass, setShowEditClass] = useState(false);
const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
const [editClassName, setEditClassName] = useState("");
const [editClassTeacher, setEditClassTeacher] = useState("");
```

**Step 2: Dodać funkcje otwierającą i zapisującą**

```tsx
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
```

**Step 3: Dodać przycisk "Edytuj" w tabeli klas**

```tsx
<td className="px-6 py-4">
  <button
    onClick={() => openEditClass(cls)}
    className="cursor-pointer text-blue-600 hover:text-blue-800"
  >
    Edytuj
  </button>
</td>
```

**Step 4: Dodać modal edycji**

```tsx
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
```

**Step 5: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 10: Auto-zakończenie lekcji po 45 minutach

**Objective:** Lekcja automatycznie się kończy po 45 minutach od `startedAt`.

**Files:**
- Modify: `src/app/api/dashboard/route.ts`

**Step 1: Dodać logikę auto-zakończenia**

W `dashboard/route.ts` po pobraniu aktywnej lekcji:

```ts
const activeLessons = await db
  .select()
  .from(lessonSession)
  .where(
    and(
      eq(lessonSession.classId, currentClass.id),
      eq(lessonSession.teacherId, userId),
      eq(lessonSession.isActive, true)
    )
  )
  .limit(1);

let lesson = activeLessons[0] ?? null;

// Auto-zakończenie po 45 minutach
if (lesson) {
  const startTime = new Date(lesson.startedAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
  
  if (diffMinutes >= 45) {
    await db
      .update(lessonSession)
      .set({ isActive: false })
      .where(eq(lessonSession.id, lesson.id));
    lesson = null;
  }
}
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

### Task 11: Info o aktywnej lekcji w dashboard

**Objective:** Dashboard pokazuje "Lekcja już trwa" z przyciskiem "Zakończ lekcję".

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Dodać komunikat w sekcji "Aktualna lekcji"**

```tsx
{lessonActive && (
  <div className="border-b border-slate-100 bg-blue-50 px-5 py-3 text-sm text-blue-800 sm:px-6">
    Lekcja już trwa. Możesz ją zakończyć klikając przycisk poniżej.
  </div>
)}
```

**Step 2: Weryfikacja**

```bash
npm run lint
npm run build
```

---

## Files Likely to Change

- `src/app/api/users/[id]/route.ts` (nowy)
- `src/app/api/students/[id]/route.ts` (nowy)
- `src/app/api/classes/[id]/route.ts` (nowy)
- `src/app/(pages)/settings/page.tsx` (modale edycji)
- `src/app/api/dashboard/route.ts` (auto-zakończenie)
- `src/app/page.tsx` (info o aktywnej lekcji)

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
- Zaloguj się jako admin (`admin@gmail.com` / `haslo123`)
- Sprawdź czy możesz edytować użytkowników, uczniów, klas
- Sprawdź czy możesz usuwać użytkowników, uczniów, klas
- Sprawdź czy lekcja automatycznie się kończy po 45 minutach
- Sprawdź czy dashboard pokazuje "Lekcja już trwa"

---

## Risks, Tradeoffs, and Open Questions

- **Ryzyko:** Usuwanie użytkownika może spowodować błędy kluczy obcych (np. lekcje przypisane do nauczyciela). Należy dodać `ON DELETE CASCADE` lub blokować usuwanie.
- **Tradeoff:** Auto-zakończenie po 45 minutach może być zbyt restrykcyjne dla niektórych nauczycieli. Można dodać konfiguracjalny czas.
- **Open Question:** Czy auto-zakończenie powinno działać tylko dla lekcji bez aktywnych wyjść uczniów?
- **Open Question:** Czy edycja klasy powinna pozwalać na zmianę wychowawcy przez select z listy użytkowników zamiast inputa tekstowego?

---

## Execution Handoff

Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?
