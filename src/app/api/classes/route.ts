import { readJsonObject, clientErrorResponse } from "../../../lib/api-errors";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { schoolClass, student, user } from "../../../db/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === "admin";

    let classes;
    if (isAdmin) {
      classes = await db.select().from(schoolClass);
    } else {
      classes = await db
        .select()
        .from(schoolClass)
        .where(eq(schoolClass.educatorId, userId));
    }

    const classesWithCount = await Promise.all(
      classes.map(async (cls) => {
        // Pobierz liczbę uczniów
        const stCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(student)
          .where(eq(student.classId, cls.id));
        const count = stCount[0]?.count ?? 0;

        // Pobierz nazwę wychowawcy
        const teacherRow = cls.educatorId
          ? await db
              .select({ name: user.name })
              .from(user)
              .where(eq(user.id, cls.educatorId))
              .limit(1)
          : [];
        const teacher = teacherRow[0]?.name ?? "—";

        return {
          id: cls.id,
          name: cls.name,
          teacher,
          educatorId: cls.educatorId,
          studentsCount: Number(count),
        };
      })
    );

    return NextResponse.json(classesWithCount);
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
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await readJsonObject(request);
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
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
