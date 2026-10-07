import { readJsonObject, clientErrorResponse } from "../../../lib/api-errors";
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { auth } from "../../../lib/auth";
import { closeStaleLessons } from "../../../lib/lessons";
import { db } from "../../../db";
import {
  student,
  schoolClass,
  lessonSession,
  studentLeave,
} from "../../../db/schema";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Nie jesteś zalogowany" },
        { status: 401 }
      );
    }

    const body = await readJsonObject(request);

    const studentId = Number(body.studentId);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!Number.isSafeInteger(studentId) || studentId <= 0 || !reason) {
      return NextResponse.json(
        { error: "Brak studentId lub reason" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Pobieramy ucznia razem z jego klasą
    const result = await db
      .select({
        student,
        schoolClass,
      })
      .from(student)
      .innerJoin(
        schoolClass,
        eq(student.classId, schoolClass.id)
      )
      .where(eq(student.id, studentId))
      .limit(1);

    const record = result[0];

    if (!record) {
      return NextResponse.json(
        { error: "Uczeń nie istnieje" },
        { status: 404 }
      );
    }

    // Nauczyciel może obsługiwać tylko swoją klasę
    if (
      record.schoolClass.educatorId !== userId &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Brak uprawnień" },
        { status: 403 }
      );
    }

    await closeStaleLessons(record.schoolClass.id);

    const lessons = await db
      .select()
      .from(lessonSession)
      .where(
        and(
          eq(lessonSession.classId, record.schoolClass.id),
          eq(lessonSession.isActive, true)
        )
      )
      .limit(1);

    const lesson = lessons[0];

    if (!lesson) {
      return NextResponse.json(
        { error: "Brak aktywnej lekcji" },
        { status: 400 }
      );
    }

    // Sprawdzamy czy uczeń nie jest już poza salą
    const existing = await db
      .select()
      .from(studentLeave)
      .where(
        and(
          eq(studentLeave.studentId, studentId),
          eq(studentLeave.lessonSessionId, lesson.id),
          isNull(studentLeave.returnedAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Uczeń jest już poza salą" },
        { status: 409 }
      );
    }

    const [leave] = await db
      .insert(studentLeave)
      .values({
        studentId,
        lessonSessionId: lesson.id,
        reason,
      })
      .returning();

    return NextResponse.json({
      success: true,
      leave,
    });
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);

    return NextResponse.json(
      { error: "Nie udało się zarejestrować wyjścia" },
      { status: 500 }
    );
  }
}