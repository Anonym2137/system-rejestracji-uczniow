import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, gte, lte, type SQL } from "drizzle-orm";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { studentLeave, student, schoolClass, lessonSession } from "../../../db/schema";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classFilter = searchParams.get("class");
    const reasonFilter = searchParams.get("reason");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // RB-06 / WF-41: dane historyczne tylko dla uprawnionych ról.
    // Admin widzi całość; nauczyciel/wychowawca wyłącznie historię SWOICH klas.
    const conditions: SQL[] = [];

    if (session.user.role !== "admin") {
      conditions.push(eq(schoolClass.educatorId, session.user.id));
    }

    if (classFilter) {
      conditions.push(eq(schoolClass.name, classFilter));
    }

    if (reasonFilter) {
      conditions.push(eq(studentLeave.reason, reasonFilter));
    }

    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      conditions.push(gte(studentLeave.leftAt, from));
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(studentLeave.leftAt, to));
    }

    const rows = await db
      .select({
        leave: studentLeave,
        st: student,
        cls: schoolClass,
        les: lessonSession,
      })
      .from(studentLeave)
      .innerJoin(student, eq(studentLeave.studentId, student.id))
      .innerJoin(schoolClass, eq(student.classId, schoolClass.id))
      .innerJoin(lessonSession, eq(studentLeave.lessonSessionId, lessonSession.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const data = rows.map((r) => {
      const leftAt = new Date(r.leave.leftAt);
      const returnedAt = r.leave.returnedAt ? new Date(r.leave.returnedAt) : null;
      const duration = returnedAt
        ? Math.round((returnedAt.getTime() - leftAt.getTime()) / 60000)
        : null;

      return {
        id: r.leave.id,
        studentId: r.st.id,
        student: `${r.st.firstName} ${r.st.lastName}`,
        classId: r.cls.id,
        className: r.cls.name,
        lesson: r.les.subject || "—",
        lessonNumber: r.les.lessonNumber || "",
        reason: r.leave.reason || "—",
        exitTime: leftAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
        returnTime: returnedAt
          ? returnedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
          : "",
        date: leftAt.toLocaleDateString("pl-PL"),
        // Pełne znaczniki czasu (ISO) — potrzebne do poprawnego zapisu korekty.
        leftAtIso: leftAt.toISOString(),
        returnedAtIso: returnedAt ? returnedAt.toISOString() : null,
        duration,
      };
    });

    // Najnowsze wyjścia na górze
    data.sort((a, b) => (a.leftAtIso < b.leftAtIso ? 1 : -1));

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
