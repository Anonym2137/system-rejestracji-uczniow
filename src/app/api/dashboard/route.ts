import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";

import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import {
  schoolClass,
  student,
  lessonSession,
  studentLeave,
} from "../../../db/schema";

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
        lesson: null,
        students: [],
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
        lesson: null,
        students: [],
      });
    }

    const students = await db
      .select()
      .from(student)
      .where(eq(student.classId, currentClass.id));

    const activeLessons = await db
      .select()
      .from(lessonSession)
      .where(
        and(
          eq(lessonSession.classId, currentClass.id),
          eq(lessonSession.teacherId, userId),
          eq(lessonSession.isActive, true)
        )
      )
      .limit(1);

    let lesson: typeof lessonSession.$inferSelect | null = activeLessons[0] ?? null;

    // Auto-zakończenie po 45 minutach
    if (lesson) {
      const startTime = new Date(lesson.startedAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
      
      if (diffMinutes >= 45) {
        await db
          .update(lessonSession)
          .set({ isActive: false })
          .where(eq(lessonSession.id, lesson.id));
        lesson = null;
      }
    }

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

    // Statystyki na dziś
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const todayExits = leaves.filter((l) => {
      const d = new Date(l.leftAt);
      return d >= todayStart && d < todayEnd;
    });
    const sumMinutes = todayExits.reduce((acc, l) => {
      if (l.returnedAt) {
        const m = Math.round(
          (new Date(l.returnedAt).getTime() - new Date(l.leftAt).getTime()) / 60000
        );
        return acc + m;
      }
      return acc;
    }, 0);
    const avgDuration = todayExits.length > 0 ? Math.round(sumMinutes / todayExits.length) : 0;

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