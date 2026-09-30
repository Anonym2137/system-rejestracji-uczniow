import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { schoolClass, user } from "../../../../db/schema";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await request.json();
    const { name, educatorId } = body as {
      name?: string;
      educatorId?: string;
    };

    const existing = await db.select().from(schoolClass).where(eq(schoolClass.id, Number(id))).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Klasa nie istnieje" }, { status: 404 });
    }

    if (educatorId !== undefined) {
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
    const session = await auth.api.getSession({ headers: await headers() });
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

    await db.delete(schoolClass).where(eq(schoolClass.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
