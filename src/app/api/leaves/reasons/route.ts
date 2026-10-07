import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { studentLeave, lessonSession, schoolClass } from "../../../../db/schema";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";

/** Powody wyjścia wymienione w SRS (3.3) — zawsze dostępne na liście. */
const DEFAULT_REASONS = ["Toaleta", "Sekretariat", "Pedagog", "Pielęgniarka", "Inny"];

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const rows = await db
      .selectDistinct({ reason: studentLeave.reason })
      .from(studentLeave)
      .innerJoin(lessonSession, eq(studentLeave.lessonSessionId, lessonSession.id))
      .innerJoin(schoolClass, eq(lessonSession.classId, schoolClass.id))
      .where(session.user.role === "admin" ? undefined : eq(schoolClass.educatorId, session.user.id))
      .orderBy(studentLeave.reason);

    // Łączymy powody domyślne z historycznymi (bez duplikatów),
    // żeby lista nie była pusta przed zarejestrowaniem pierwszego wyjścia.
    const historical = rows.map((r) => r.reason);
    const reasons = Array.from(new Set([...DEFAULT_REASONS, ...historical]));

    return NextResponse.json(reasons);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
