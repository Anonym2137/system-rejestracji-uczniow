import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const rows = await db.all<{ reason: string }>(
      sql`SELECT DISTINCT reason FROM student_leave WHERE reason IS NOT NULL ORDER BY reason`
    );

    const reasons = rows.map((r) => r.reason);

    return NextResponse.json(reasons);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
