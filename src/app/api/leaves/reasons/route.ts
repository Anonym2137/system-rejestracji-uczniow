import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../db";

/** Powody wyjścia wymienione w SRS (3.3) — zawsze dostępne na liście. */
const DEFAULT_REASONS = ["Toaleta", "Sekretariat", "Pedagog", "Pielęgniarka", "Inny"];

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const rows = await db.all<{ reason: string }>(
      sql`SELECT DISTINCT reason FROM student_leave WHERE reason IS NOT NULL ORDER BY reason`
    );

    // Łączymy powody domyślne z historycznymi (bez duplikatów),
    // żeby lista nie była pusta przed zarejestrowaniem pierwszego wyjścia.
    const historical = rows.map((r) => r.reason);
    const reasons = Array.from(new Set([...DEFAULT_REASONS, ...historical]));

    return NextResponse.json(reasons);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
