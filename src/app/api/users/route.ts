import { readJsonObject, clientErrorResponse } from "../../../lib/api-errors";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "../../../lib/auth";
import { db } from "../../../db";
import { isUserRole } from "../../../lib/roles";
import { user } from "../../../db/schema";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(user.createdAt);

    return NextResponse.json(users);
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const body = await readJsonObject(request);
    const { email, password, name, role } = body as {
      email: string;
      password: string;
      name: string;
      role: "admin" | "teacher" | "educator" | "student";
    };

    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string" || !name.trim() || !isUserRole(role)) {
      return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
    }

    const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Użytkownik już istnieje" }, { status: 409 });
    }

    const newUser = await auth.api.signUpEmail({
      body: { email, password, name },
    });

    if (!newUser?.user) {
      return NextResponse.json({ error: "Nie udało się utworzyć użytkownika" }, { status: 500 });
    }

    const [createdUser] = await db.update(user).set({ role }).where(eq(user.id, newUser.user.id)).returning();

    return NextResponse.json({ success: true, user: createdUser }, { status: 201 });
  } catch (error) {
    const clientError = clientErrorResponse(error);
    if (clientError) return clientError;
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
