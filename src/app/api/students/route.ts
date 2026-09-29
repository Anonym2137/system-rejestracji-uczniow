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

    if (!classId) {
      return NextResponse.json({ error: "Brak classId" }, { status: 400 });
    }

    const classIdNum = Number(classId);

    const students = await db
      .select()
      .from(student)
      .where(eq(student.classId, classIdNum));

    const data = await Promise.all(
      students.map(async (s) => {
        const classRow = await db
          .select({ name: schoolClass.name })
          .from(schoolClass)
          .where(eq(schoolClass.id, s.classId))
          .limit(1);
        const className = classRow[0]?.name ?? "?";
        return {
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          classId: s.classId,
          className,
        };
      })
    );

    return NextResponse.json(data);
  } catch (error) {
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
