import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { student, schoolClass } from "../../../../db/schema";

/** Sprawdza, czy użytkownik może zarządzać uczniami danej klasy. */
async function canManageClass(
  role: string | null | undefined,
  userId: string,
  classId: number
): Promise<boolean> {
  if (role === "admin") return true;
  const cls = await db
    .select()
    .from(schoolClass)
    .where(eq(schoolClass.id, classId))
    .limit(1);
  return cls.length > 0 && cls[0].educatorId === userId;
}

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

    const body = await request.json();
    const { firstName, lastName, classId } = body as {
      firstName?: string;
      lastName?: string;
      classId?: number;
    };

    const existing = await db
      .select()
      .from(student)
      .where(eq(student.id, Number(id)))
      .limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Uczeń nie istnieje" }, { status: 404 });
    }

    const current = existing[0];

    // Bug 5: wychowawca zarządza uczniami swojej klasy, admin wszystkimi.
    if (!(await canManageClass(session.user.role, session.user.id, current.classId))) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    // Przy przenoszeniu ucznia do innej klasy trzeba mieć prawa do obu klas.
    if (classId !== undefined && classId !== current.classId) {
      const cls = await db
        .select()
        .from(schoolClass)
        .where(eq(schoolClass.id, classId))
        .limit(1);
      if (!cls.length) {
        return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
      }
      if (!(await canManageClass(session.user.role, session.user.id, classId))) {
        return NextResponse.json(
          { error: "Brak uprawnień do klasy docelowej" },
          { status: 403 }
        );
      }
    }

    const nextFirst = firstName !== undefined ? firstName.trim() : current.firstName;
    const nextLast = lastName !== undefined ? lastName.trim() : current.lastName;

    // Bug 3: nazwisko nie może zostać wyczyszczone.
    if (!nextFirst) {
      return NextResponse.json({ error: "Podaj imię ucznia." }, { status: 400 });
    }
    if (!nextLast) {
      return NextResponse.json(
        {
          error:
            "Podaj nazwisko ucznia. Wpisz imię i nazwisko oddzielone spacją, np. „Jan Kowalski”.",
        },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(student)
      .set({
        firstName: nextFirst,
        lastName: nextLast,
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

    const existing = await db
      .select()
      .from(student)
      .where(eq(student.id, Number(id)))
      .limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Uczeń nie istnieje" }, { status: 404 });
    }

    // Bug 5: wychowawca może usuwać uczniów swojej klasy, admin wszystkich.
    if (
      !(await canManageClass(
        session.user.role,
        session.user.id,
        existing[0].classId
      ))
    ) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    await db.delete(student).where(eq(student.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
