import { readJsonObject, clientErrorResponse } from "../../../../lib/api-errors";
import { NextResponse } from "next/server";
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
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const body = await readJsonObject(request);
    const { reason, leftAt, returnedAt } = body as {
      reason?: string;
      leftAt?: string;
      returnedAt?: string | null;
    };

    const rows = await db
      .select({
        leave: studentLeave,
        cls: schoolClass,
        lesson: lessonSession,
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

    if ((reason !== undefined && typeof reason !== "string") ||
        (leftAt !== undefined && (typeof leftAt !== "string" || !leftAt)) ||
        (returnedAt !== undefined && returnedAt !== null && typeof returnedAt !== "string")) {
      return NextResponse.json({ error: "Nieprawidłowe dane korekty" }, { status: 400 });
    }
    const newReason = reason !== undefined ? reason.trim() : record.reason;
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

    if (!newReturnedAt && !rows[0].lesson.isActive) {
      return NextResponse.json({ error: "Nie można otworzyć wyjścia z zakończonej lekcji" }, { status: 400 });
    }

    const updated = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(studentLeave)
        .set({ reason: newReason, leftAt: newLeftAt, returnedAt: newReturnedAt })
        .where(eq(studentLeave.id, leaveId))
        .returning();

      await tx.insert(auditLog).values({
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

      return updated;
    });

    return NextResponse.json({ success: true, leave: updated });
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json(
      { error: "Nie udało się zapisać korekty" },
      { status: 500 }
    );
  }
}
