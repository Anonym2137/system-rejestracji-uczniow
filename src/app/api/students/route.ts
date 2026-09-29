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
