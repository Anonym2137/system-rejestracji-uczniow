import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "../../..//lib/auth";
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

    // Pozwalamy odczyt całej historii dla nauczyciela (z jego klas)
    // lub pełna tabela, jeśli admin. Wersja uproszczona: pobieramy wszystko i filtrujemy serwer-node (SQLite ma select z join).

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
      .innerJoin(lessonSession, eq(studentLeave.lessonSessionId, lessonSession.id));

    const filtered = rows.filter((r) => {
      const lc = r.cls;
      const ls = r.les;
      const s = r.st;

      // Filtrowanie po klasie (nauczyciel ma dostęp tylko do swojej klasy,
      // a admin do wszystkich — uproszczamy: pokaż wszystko, na frontendzie można dodatkowo ograniczać).
      if (classFilter && lc.name !== classFilter) return false;
      if (reasonFilter && r.leave.reason !== reasonFilter) return false;

      if (fromDate || toDate) {
        const leftAt = new Date(r.leave.leftAt);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        if (from && leftAt < from) return false;
        if (to && leftAt > to) return false;
      }

      return true;
    });

    const data = filtered.map((r) => {
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
        room: "", // sala nie jest w schemacie — placeholder
        reason: r.leave.reason || "—",
        exitTime: leftAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
        returnTime: returnedAt
          ? returnedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
          : "",
        date: leftAt.toLocaleDateString("pl-PL"),
        duration,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
