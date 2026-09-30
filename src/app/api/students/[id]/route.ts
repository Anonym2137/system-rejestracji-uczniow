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
