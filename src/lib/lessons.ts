import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "../db";
import { lessonSession, studentLeave } from "../db/schema";

/** Domyślny czas trwania lekcji (minuty) — po nim sesja jest zamykana automatycznie. */
export const LESSON_DURATION_MINUTES = 45;

/**
 * Zamyka "przeterminowane" aktywne lekcje danej klasy (starsze niż LESSON_DURATION_MINUTES).
 *
 * Powód istnienia: lekcja jest bytem przypisanym do KLASY, a nie do nauczyciela.
 * Wcześniej dashboard filtrował aktywne lekcje po `teacherId`, a POST /api/lesson
 * sprawdzał je bez tego filtra — przez co lekcja założona przez innego nauczyciela
 * nigdy nie była zamykana i blokowała start nowej ("Aktywna lekcja już istnieje").
 *
 * @returns liczbę zamkniętych sesji
 */
export async function closeStaleLessons(classId?: number): Promise<number> {
  const threshold = new Date(Date.now() - LESSON_DURATION_MINUTES * 60 * 1000);

  const stale = await db
    .select()
    .from(lessonSession)
    .where(
      classId
        ? and(
            eq(lessonSession.classId, classId),
            eq(lessonSession.isActive, true),
            lt(lessonSession.startedAt, threshold)
          )
        : and(
            eq(lessonSession.isActive, true),
            lt(lessonSession.startedAt, threshold)
          )
    );

  for (const lesson of stale) {
    await endLessonWithReturns(lesson.id);
  }

  return stale.length;
}

/**
 * Kończy lekcję i automatycznie rejestruje powrót wszystkim uczniom,
 * którzy w jej trakcie wyszli i nie wrócili (Bug 8 / WF-22).
 *
 * Czas powrotu = moment zakończenia lekcji.
 */
export async function endLessonWithReturns(lessonId: string): Promise<void> {
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(studentLeave)
      .set({ returnedAt: now })
      .where(and(eq(studentLeave.lessonSessionId, lessonId), isNull(studentLeave.returnedAt)));

    await tx
      .update(lessonSession)
      .set({ isActive: false })
      .where(eq(lessonSession.id, lessonId));
  });
}
