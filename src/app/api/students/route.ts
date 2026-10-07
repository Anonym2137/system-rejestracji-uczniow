import { readJsonObject, clientErrorResponse } from "../../../lib/api-errors";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { student, schoolClass } from "../../../db/schema";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    // WN-06 (minimalizacja danych): nauczyciel/wychowawca widzi uczniów
    // wyłącznie swoich klas; admin widzi wszystkich.
    const isAdmin = session.user.role === "admin";

    const allowedClasses = isAdmin
      ? await db.select({ id: schoolClass.id, name: schoolClass.name }).from(schoolClass)
      : await db
          .select({ id: schoolClass.id, name: schoolClass.name })
          .from(schoolClass)
          .where(eq(schoolClass.educatorId, session.user.id));

    const classNames = new Map(allowedClasses.map((c) => [c.id, c.name]));

    if (classId) {
      const classIdNum = Number(classId);
      if (!classNames.has(classIdNum)) {
        return NextResponse.json({ error: "Brak uprawnień do tej klasy" }, { status: 403 });
      }
    }

    const rows = classId
      ? await db
          .select()
          .from(student)
          .where(eq(student.classId, Number(classId)))
      : await db.select().from(student);

    const data = rows
      .filter((s) => classNames.has(s.classId))
      .map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        classId: s.classId,
        className: classNames.get(s.classId) ?? "?",
      }));

    return NextResponse.json(data);
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const body = await readJsonObject(request);
    const { firstName, lastName, classId } = body as {
      firstName?: string;
      lastName?: string;
      classId?: number;
    };

    if ((firstName !== undefined && typeof firstName !== "string") ||
        (lastName !== undefined && typeof lastName !== "string") ||
        (classId !== undefined && (!Number.isSafeInteger(classId) || classId <= 0))) {
      return NextResponse.json({ error: "Nieprawidłowe dane ucznia" }, { status: 400 });
    }

    const first = (firstName ?? "").trim();
    const last = (lastName ?? "").trim();

    // Bug 3: czytelna walidacja — nazwisko musi być podane.
    if (!first && !last) {
      return NextResponse.json(
        { error: "Podaj imię i nazwisko ucznia." },
        { status: 400 }
      );
    }
    if (!first) {
      return NextResponse.json({ error: "Podaj imię ucznia." }, { status: 400 });
    }
    if (!last) {
      return NextResponse.json(
        {
          error:
            "Podaj nazwisko ucznia. Wpisz imię i nazwisko oddzielone spacją, np. „Jan Kowalski”.",
        },
        { status: 400 }
      );
    }
    if (!classId) {
      return NextResponse.json({ error: "Wybierz klasę ucznia." }, { status: 400 });
    }

    const cls = await db
      .select()
      .from(schoolClass)
      .where(eq(schoolClass.id, classId))
      .limit(1);

    if (!cls.length) {
      return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
    }

    // Bug 5: admin zarządza wszystkimi klasami; wychowawca tylko swoją.
    if (session.user.role !== "admin" && cls[0].educatorId !== session.user.id) {
      return NextResponse.json(
        { error: "Brak uprawnień do tej klasy" },
        { status: 403 }
      );
    }

    const [newStudent] = await db
      .insert(student)
      .values({ firstName: first, lastName: last, classId })
      .returning();

    return NextResponse.json({ success: true, student: newStudent }, { status: 201 });
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
