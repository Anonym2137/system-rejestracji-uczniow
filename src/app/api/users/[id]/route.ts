import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { user } from "../../../../db/schema";

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
    const { name, email, role } = body as {
      name?: string;
      email?: string;
      role?: "admin" | "teacher" | "educator" | "student";
    };

    const existing = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    const [updated] = await db
      .update(user)
      .set({
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
      })
      .where(eq(user.id, id))
      .returning();

    return NextResponse.json({ success: true, user: updated });
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

    const existing = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    await db.delete(user).where(eq(user.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
