import { readJsonObject, clientErrorResponse } from "../../../../lib/api-errors";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";
import { isUserRole } from "../../../../lib/roles";
import { user, session as authSession } from "../../../../db/schema";

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
    const { name, email, role } = body as {
      name?: string;
      email?: string;
      role?: "admin" | "teacher" | "educator" | "student";
    };

    if ((name !== undefined && (typeof name !== "string" || !name.trim())) ||
        (email !== undefined && (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) ||
        (role !== undefined && !isUserRole(role)) ||
        (name === undefined && email === undefined && role === undefined)) {
      return NextResponse.json({ error: "Nieprawidłowe dane użytkownika" }, { status: 400 });
    }

    if (email !== undefined) {
      const [duplicate] = await db.select().from(user).where(eq(user.email, email)).limit(1);
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: "Użytkownik z tym adresem e-mail już istnieje" }, { status: 409 });
      }
    }

    const existing = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    const [updated] = await db
      .update(user)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
      })
      .where(eq(user.id, id))
      .returning();

    return NextResponse.json({ success: true, user: updated });
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

    const existing = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!existing.length) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(authSession).where(eq(authSession.userId, id));
      await tx.delete(user).where(eq(user.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
