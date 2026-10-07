import { NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "../../../../../lib/auth";
import { db } from "../../../../../db";
import { studentLeave, lessonSession, schoolClass, auditLog } from "../../../../../db/schema";
import { sql } from "drizzle-orm";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leaveId } = await context.params;
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const userId = session.user.id;

    const leave = await db
      .select()
      .from(studentLeave)
      .where(eq(studentLeave.id, leaveId))
      .limit(1);

    if (!leave.length) {
      return NextResponse.json({ error: "Wyjście nie istnieje" }, { status: 404 });
    }

    const record = leave[0];

    if (record.returnedAt) {
      return NextResponse.json({ error: "Uczeń już wrócił" }, { status: 409 });
    }

    const lesson = await db
      .select()
      .from(lessonSession)
      .where(and(eq(lessonSession.id, record.lessonSessionId), eq(lessonSession.isActive, true)))
      .limit(1);

    if (!lesson.length) {
      return NextResponse.json({ error: "Brak aktywnej lekcji" }, { status: 400 });
    }

    const [cls] = await db.select().from(schoolClass)
      .where(eq(schoolClass.id, lesson[0].classId)).limit(1);
    if (lesson[0].teacherId !== userId && cls?.educatorId !== userId && session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const now = new Date();
    const updated = await db.transaction(async (tx) => {
      const [leave] = await tx
        .update(studentLeave)
        .set({ returnedAt: now })
        .where(and(eq(studentLeave.id, leaveId), isNull(studentLeave.returnedAt)))
        .returning();

      if (!leave) return null;

      await tx.insert(auditLog).values({
        id: sql`lower(hex(randomblob(16)))`,
        changedBy: userId,
        leaveId,
        action: "UPDATE_RETURN_TIME",
        oldValue: null,
        newValue: now.toISOString(),
        changedAt: now,
      });
      return leave;
    });

    if (!updated) {
      return NextResponse.json({ error: "Uczeń już wrócił" }, { status: 409 });
    }

    return NextResponse.json({ success: true, leave: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się zarejestrować powrotu" }, { status: 500 });
  }
}
