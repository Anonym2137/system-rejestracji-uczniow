import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "../../../../../lib/auth";
import { db } from "../../../../../db";
import { studentLeave, lessonSession, auditLog } from "../../../../../db/schema";
import { sql } from "drizzle-orm";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leaveId } = await context.params;
    const session = await auth.api.getSession({ headers: await headers() });
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

    if (lesson[0].teacherId !== userId && session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const now = new Date();
    const [updated] = await db
      .update(studentLeave)
      .set({ returnedAt: now })
      .where(eq(studentLeave.id, leaveId))
      .returning();

    await db.insert(auditLog).values({
      id: sql`lower(hex(randomblob(16)))`,
      changedBy: userId,
      leaveId,
      action: "UPDATE_RETURN_TIME",
      oldValue: null,
      newValue: now.toISOString(),
      changedAt: now,
    });

    return NextResponse.json({ success: true, leave: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Nie udało się zarejestrować powrotu" }, { status: 500 });
  }
}
