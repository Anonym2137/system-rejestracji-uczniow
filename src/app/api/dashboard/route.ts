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

export async function GET() {
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

    const classes = await db
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

    // Na ten moment bierzemy pierwszą klasę nauczyciela.
    // Później możemy dodać wybór klasy.
    const currentClass = classes[0];

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

    const lesson = activeLessons[0] ?? null;

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