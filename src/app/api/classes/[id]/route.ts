import { readJsonObject, clientErrorResponse } from "../../../../lib/api-errors";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { schoolClass, student, user } from "../../../../db/schema";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await readJsonObject(request);
    const { name, educatorId } = body as {
      name?: string;
      educatorId?: string | null;
    };

    const existing = await db.select().from(schoolClass).where(eq(schoolClass.id, Number(id))).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
    }

    if ((name !== undefined && (typeof name !== "string" || !name.trim())) ||
        (educatorId !== undefined && educatorId !== null && (typeof educatorId !== "string" || !educatorId))) {
      return NextResponse.json({ error: "Nieprawidłowe dane klasy" }, { status: 400 });
    }

    if (educatorId !== undefined && educatorId !== null) {
      const educator = await db.select().from(user).where(eq(user.id, educatorId)).limit(1);
      if (!educator.length) {
        return NextResponse.json({ error: "Wychowawca nie istnieje" }, { status: 404 });
      }
    }

    const [updated] = await db
      .update(schoolClass)
      .set({
        ...(name !== undefined && { name }),
        ...(educatorId !== undefined && { educatorId }),
      })
      .where(eq(schoolClass.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, class: updated });
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const existing = await db.select().from(schoolClass).where(eq(schoolClass.id, Number(id))).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
    }

    // WF-53 / RB: klasy nie można usunąć, dopóki ma przypisanych uczniów.
    const assigned = await db
      .select({ id: student.id })
      .from(student)
      .where(eq(student.classId, Number(id)));

    if (assigned.length > 0) {
      return NextResponse.json(
        {
          error: `Nie można usunąć klasy „${existing[0].name}” — ma przypisanych ${assigned.length} uczniów. Najpierw usuń lub przenieś uczniów.`,
        },
        { status: 409 }
      );
    }

    await db.delete(schoolClass).where(eq(schoolClass.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
