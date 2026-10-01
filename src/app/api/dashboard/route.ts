import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, gte, isNull, lte } from "drizzle-orm";

import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import {
  schoolClass,
  student,
  lessonSession,
  studentLeave,
} from "../../../db/schema";
import { closeStaleLessons } from "../../../lib/lessons";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Nie jesteś zalogowany" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === "admin";

    // Pobierz klasy: admin widzi wszystkie, nauczyciel tylko swoje
    const classes = isAdmin
      ? await db.select().from(schoolClass)
      : await db
          .select()
          .from(schoolClass)
          .where(eq(schoolClass.educatorId, userId));

    if (classes.length === 0) {
      return NextResponse.json({
        class: null,
        classes: [],
        lesson: null,
        students: [],
        leaves: [],
        user: session.user,
        todayStats: { totalExits: 0, avgDuration: 0 },
      });
    }

    // Wybierz klasę: z query param (admin) lub pierwszą dostępną
    const { searchParams } = new URL(request.url);
    const requestedClassId = searchParams.get("classId");
    const currentClass = requestedClassId
      ? classes.find((c) => c.id === Number(requestedClassId))
      : classes[0];

    if (!currentClass) {
      return NextResponse.json({
        class: null,
        classes,
        lesson: null,
        students: [],
        leaves: [],
        user: session.user,
        todayStats: { totalExits: 0, avgDuration: 0 },
      });
    }

    const students = await db
      .select()
      .from(student)
      .where(eq(student.classId, currentClass.id));

    // Lekcja należy do KLASY — nie filtrujemy po teacherId, inaczej nauczyciel
    // nie widzi lekcji rozpoczętej przez kogoś innego (i nie da się jej zamknąć).
    // Najpierw domykamy sesje przeterminowane (>45 min) wraz z auto-powrotami.
    await closeStaleLessons(currentClass.id);

    const activeLessons = await db
      .select()
      .from(lessonSession)
      .where(
        and(
          eq(lessonSession.classId, currentClass.id),
          eq(lessonSession.isActive, true)
        )
      )
      .limit(1);

    const lesson: typeof lessonSession.$inferSelect | null =
      activeLessons[0] ?? null;

    let leaves: typeof studentLeave.$inferSelect[] = [];

    if (lesson) {
      leaves = await db
        .select()
        .from(studentLeave)
        .where(
          and(
            eq(studentLeave.lessonSessionId, lesson.id),
            isNull(studentLeave.returnedAt)
          )
        );
    }

    // Statystyki na dziś — liczone z WSZYSTKICH wyjść uczniów tej klasy
    // zarejestrowanych dzisiaj, a nie tylko z bieżącej (aktywnej) lekcji.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const classStudentIds = students.map((s) => s.id);

    let todayLeaves: typeof studentLeave.$inferSelect[] = [];
    if (classStudentIds.length > 0) {
      todayLeaves = await db
        .select()
        .from(studentLeave)
        .where(
          and(
            gte(studentLeave.leftAt, todayStart),
            lte(studentLeave.leftAt, todayEnd)
          )
        );
    }

    const todayExits = todayLeaves.filter((l) =>
      classStudentIds.includes(l.studentId)
    );

    const closedToday = todayExits.filter((l) => l.returnedAt);
    const sumMinutes = closedToday.reduce((acc, l) => {
      const m = Math.round(
        (new Date(l.returnedAt!).getTime() - new Date(l.leftAt).getTime()) / 60000
      );
      return acc + m;
    }, 0);
    const avgDuration =
      closedToday.length > 0 ? Math.round(sumMinutes / closedToday.length) : 0;

    return NextResponse.json({
      class: currentClass,
      classes,
      lesson,
      students,
      leaves,
      user: session.user,
      todayStats: {
        totalExits: todayExits.length,
        avgDuration,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Błąd serwera" },
      { status: 500 }
    );
  }
}
