import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import {
  studentLeave,
  lessonSession,
  schoolClass,
  auditLog,
} from "../../../../db/schema";

/**
 * Korekta zarejestrowanego wyjścia (WF-70 / WF-71).
 * Pozwala poprawić powód oraz godziny wyjścia i powrotu.
 * Każda zmiana pozostawia ślad audytowy (autor, czas, stara/nowa wartość).
 */
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

    const body = await request.json();
    const { reason, leftAt, returnedAt } = body as {
      reason?: string;
      leftAt?: string;
      returnedAt?: string | null;
    };

    const rows = await db
      .select({
        leave: studentLeave,
        cls: schoolClass,
      })
      .from(studentLeave)
      .innerJoin(lessonSession, eq(studentLeave.lessonSessionId, lessonSession.id))
      .innerJoin(schoolClass, eq(lessonSession.classId, schoolClass.id))
      .where(eq(studentLeave.id, leaveId))
      .limit(1);

    if (!rows.length) {
      return NextResponse.json({ error: "Wyjście nie istnieje" }, { status: 404 });
    }

    const record = rows[0].leave;

    // Uprawnienia: wychowawca/nauczyciel tylko dla swojej klasy, admin zawsze.
    if (
      rows[0].cls.educatorId !== session.user.id &&
      session.user.role !== "admin"
    ) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const newReason = reason !== undefined ? String(reason).trim() : record.reason;
    if (!newReason) {
      return NextResponse.json({ error: "Powód nie może być pusty" }, { status: 400 });
    }

    const newLeftAt = leftAt ? new Date(leftAt) : new Date(record.leftAt);
    const newReturnedAt =
      returnedAt === undefined
        ? record.returnedAt
          ? new Date(record.returnedAt)
          : null
        : returnedAt === null || returnedAt === ""
          ? null
          : new Date(returnedAt);

    if (Number.isNaN(newLeftAt.getTime())) {
      return NextResponse.json({ error: "Nieprawidłowa godzina wyjścia" }, { status: 400 });
    }
    if (newReturnedAt && Number.isNaN(newReturnedAt.getTime())) {
      return NextResponse.json({ error: "Nieprawidłowa godzina powrotu" }, { status: 400 });
    }

    // WF-26 / RB-04: czas powrotu nie może być wcześniejszy niż czas wyjścia.
    if (newReturnedAt && newReturnedAt.getTime() < newLeftAt.getTime()) {
      return NextResponse.json(
        { error: "Godzina powrotu nie może być wcześniejsza niż godzina wyjścia" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(studentLeave)
      .set({ reason: newReason, leftAt: newLeftAt, returnedAt: newReturnedAt })
      .where(eq(studentLeave.id, leaveId))
      .returning();

    await db.insert(auditLog).values({
      id: sql`lower(hex(randomblob(16)))`,
      changedBy: session.user.id,
      leaveId,
      action: "UPDATE_LEAVE",
      oldValue: JSON.stringify({
        reason: record.reason,
        leftAt: new Date(record.leftAt).toISOString(),
        returnedAt: record.returnedAt ? new Date(record.returnedAt).toISOString() : null,
      }),
      newValue: JSON.stringify({
        reason: updated.reason,
        leftAt: new Date(updated.leftAt).toISOString(),
        returnedAt: updated.returnedAt ? new Date(updated.returnedAt).toISOString() : null,
      }),
      changedAt: new Date(),
    });

    return NextResponse.json({ success: true, leave: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Nie udało się zapisać korekty" },
      { status: 500 }
    );
  }
}
