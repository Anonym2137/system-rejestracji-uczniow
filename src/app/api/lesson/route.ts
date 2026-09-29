import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { lessonSession, schoolClass, studentLeave } from "../../../db/schema";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const body = await request.json();
    const { action, classId, lessonId, subject } = body as {
      action: "start" | "stop";
      classId?: number | string;
      lessonId?: string;
      subject?: string;
    };

    const userId = session.user.id;

    if (action === "start") {
      const classIdNum = Number(classId);
      if (!classIdNum) {
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
        return NextResponse.json({ error: "Aktywna lekcja już istnieje" }, { status: 409 });
      }

      const [lesson] = await db
        .insert(lessonSession)
        .values({
          classId: classIdNum,
          teacherId: userId,
          subject: subject || "Przedmiot",
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

      if (lesson[0].teacherId !== userId && session.user.role !== "admin") {
        return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
      }

      const [updated] = await db
        .update(lessonSession)
        .set({ isActive: false })
        .where(eq(lessonSession.id, lid))
        .returning();

      return NextResponse.json({ success: true, lesson: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się zmienić statusu lekcji" }, { status: 500 });
  }
}
