import { readJsonObject, clientErrorResponse } from "../../../lib/api-errors";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { lessonSession, schoolClass } from "../../../db/schema";
import { closeStaleLessons, endLessonWithReturns } from "../../../lib/lessons";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const body = await readJsonObject(request);
    const { action, classId, lessonId, subject, lessonNumber, startTime } = body as {
      action: "start" | "stop";
      classId?: number | string;
      lessonId?: string;
      subject?: string;
      lessonNumber?: string;
      startTime?: string;
    };

    const userId = session.user.id;

    if (action === "start") {
      const classIdNum = Number(classId);
      if (!Number.isSafeInteger(classIdNum) || classIdNum <= 0) {
        return NextResponse.json({ error: "Brak classId" }, { status: 400 });
      }

      const cls = await db
        .select()
        .from(schoolClass)
        .where(eq(schoolClass.id, classIdNum))
        .limit(1);

      if (!cls.length) {
        return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
      }

      if (cls[0].educatorId !== userId && session.user.role !== "admin") {
        return NextResponse.json({ error: "Brak uprawnień do tej klasy" }, { status: 403 });
      }

      // Lekcja jest bytem KLASY: najpierw domykamy przeterminowane sesje tej klasy
      // (np. pozostawione przez innego nauczyciela), żeby nie blokowały startu.
      await closeStaleLessons(classIdNum);

      const existingActive = await db
        .select()
        .from(lessonSession)
        .where(
          and(
            eq(lessonSession.classId, classIdNum),
            eq(lessonSession.isActive, true)
          )
        )
        .limit(1);

      if (existingActive.length) {
        const startedAt = new Date(existingActive[0].startedAt).toLocaleTimeString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return NextResponse.json(
          {
            error: `W klasie ${cls[0].name} trwa już lekcja (rozpoczęta o ${startedAt}). Zakończ ją przed rozpoczęciem nowej.`,
          },
          { status: 409 }
        );
      }

      const [lesson] = await db
        .insert(lessonSession)
        .values({
          classId: classIdNum,
          teacherId: userId,
          subject: subject || "Przedmiot",
          lessonNumber: lessonNumber || null,
          startTime: startTime || null,
          isActive: true,
          startedAt: new Date(),
        })
        .returning();

      return NextResponse.json({ success: true, lesson });
    }

    if (action === "stop") {
      const lid = lessonId;
      if (!lid) {
        return NextResponse.json({ error: "Brak lessonId" }, { status: 400 });
      }

      const lesson = await db
        .select()
        .from(lessonSession)
        .where(and(eq(lessonSession.id, lid), eq(lessonSession.isActive, true)))
        .limit(1);

      if (!lesson.length) {
        return NextResponse.json({ error: "Aktywnej lekcji o tym ID nie ma" }, { status: 404 });
      }

      const [cls] = await db.select().from(schoolClass)
        .where(eq(schoolClass.id, lesson[0].classId)).limit(1);
      if (lesson[0].teacherId !== userId && cls?.educatorId !== userId && session.user.role !== "admin") {
        return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
      }

      // Bug 8: kończymy lekcję i automatycznie rejestrujemy powrót uczniów,
      // którzy nie zdążyli wrócić przed jej zakończeniem.
      await endLessonWithReturns(lid);

      const [updated] = await db
        .select()
        .from(lessonSession)
        .where(eq(lessonSession.id, lid))
        .limit(1);

      return NextResponse.json({ success: true, lesson: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Nie udało się zmienić statusu lekcji" }, { status: 500 });
  }
}
