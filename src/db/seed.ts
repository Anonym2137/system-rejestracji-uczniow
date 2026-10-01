import { auth } from "../lib/auth"; 
import { db } from "./index";       
import { user, schoolClass, student, lessonSession, studentLeave, auditLog, account, session } from "./schema";     
import { eq } from "drizzle-orm";

async function main() {
  try {
    console.log("⏳ Czyszczenie bazy danych przed seedowaniem...");
    // Czyszczenie w odpowiedniej kolejności z uwagi na klucze obce
    await db.delete(auditLog);
    await db.delete(studentLeave);
    await db.delete(lessonSession);
    await db.delete(student);
    await db.delete(schoolClass);
    await db.delete(account);
    await db.delete(session);
    await db.delete(user);

    console.log("🚀 Tworzenie użytkowników przez Better Auth...");
    const defaultPassword = "haslo123";

    // 1. Definiujemy listę użytkowników do utworzenia
    const usersToCreate = [
      { email: "admin@gmail.com", name: "Główny Administrator", role: "admin" },
      { email: "maria.w@szkola.pl", name: "Maria Wychowawca", role: "educator" },
      { email: "tomasz.n@szkola.pl", name: "Tomasz Nauczyciel", role: "teacher" },
      { email: "anna.n@szkola.pl", name: "Anna Nowak", role: "teacher" },
    ];

    const createdUsers: Record<string, string> = {};

    for (const u of usersToCreate) {
      // Rejestracja zabezpieczająca poprawne hashowanie w Better Auth
      const newUser = await auth.api.signUpEmail({
        body: {
          email: u.email,
          password: defaultPassword,
          name: u.name,
        },
      });

      if (!newUser || !newUser.user) {
        throw new Error(`Nie udało się utworzyć użytkownika ${u.email}`);
      }

      // Podnosimy uprawnienia do właściwej roli (bo domyślnie dostaliby 'teacher')
      await db
        .update(user)
        .set({ role: u.role as "admin" | "teacher" | "educator" })
        .where(eq(user.id, newUser.user.id));

      // Mapujemy email na wygenerowane ID z Better Auth, aby użyć ich w relacjach niżej
      createdUsers[u.email] = newUser.user.id;
      console.log(`✅ Utworzono: ${u.name} (${u.role})`);
    }

    console.log("🌱 Seedowanie klas i uczniów...");

    // 2. Tworzenie klas z przypisaniem dynamicznych ID użytkowników
    const class1Res = await db.insert(schoolClass).values({
      name: "Klasa 1A",
      educatorId: createdUsers["maria.w@szkola.pl"], // Poprawne ID wychowawcy
    }).returning({ id: schoolClass.id });
    
    const class2Res = await db.insert(schoolClass).values({
      name: "Klasa 2B",
      educatorId: createdUsers["tomasz.n@szkola.pl"], // Poprawne ID nauczyciela
    }).returning({ id: schoolClass.id });
    
    const class1Id = class1Res[0].id;
    const class2Id = class2Res[0].id;
    
    // 3. Tworzenie uczniów
    const studentsClass1 = [
      { firstName: "Kamil", lastName: "Kowalski", classId: class1Id },
      { firstName: "Zofia", lastName: "Zielińska", classId: class1Id },
      { firstName: "Jan", lastName: "Wiśniewski", classId: class1Id },
    ];
    
    const studentsClass2 = [
      { firstName: "Jakub", lastName: "Wójcik", classId: class2Id },
      { firstName: "Alicja", lastName: "Mazur", classId: class2Id },
    ];
    
    const insertedStudents = await db.insert(student)
      .values([...studentsClass1, ...studentsClass2])
      .returning({ id: student.id, firstName: student.firstName });
    
    console.log("🌱 Seedowanie lekcji i wyjść uczniów...");
    
    // 4. Tworzenie aktywnej lekcji (świeżej — 5 min temu, żeby nie została
    //    automatycznie zamknięta przez auto-expire po 45 minutach)
    const activeSessionRes = await db.insert(lessonSession).values({
      id: "session_active_1",
      classId: class1Id,
      teacherId: createdUsers["tomasz.n@szkola.pl"],
      subject: "Matematyka",
      lessonNumber: "3",
      startTime: "10:00",
      isActive: true,
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
    }).returning({ id: lessonSession.id });
    
    // 5. Tworzenie zakończonej lekcji
    const pastSessionRes = await db.insert(lessonSession).values({
      id: "session_past_1",
      classId: class1Id,
      teacherId: createdUsers["anna.n@szkola.pl"],
      subject: "Język Polski",
      lessonNumber: "1",
      startTime: "08:00",
      isActive: false,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    }).returning({ id: lessonSession.id });
    
    const student1Id = insertedStudents[0].id; // Kamil Kowalski
    const student2Id = insertedStudents[1].id; // Zofia Zielińska
    
    // 6. Aktywne wyjście
    await db.insert(studentLeave).values({
      id: "leave_active_1",
      studentId: student1Id,
      lessonSessionId: activeSessionRes[0].id,
      reason: "Toaleta",
      leftAt: new Date(Date.now() - 5 * 60 * 1000),
      returnedAt: null,
    });
    
    // 7. Zakończone wyjście
    const pastLeaveRes = await db.insert(studentLeave).values({
      id: "leave_past_1",
      studentId: student2Id,
      lessonSessionId: pastSessionRes[0].id,
      reason: "Higienistka",
      leftAt: new Date(Date.now() - 110 * 60 * 1000), 
      returnedAt: new Date(Date.now() - 95 * 60 * 1000),
    }).returning({ id: studentLeave.id });
    
    console.log("🌱 Seedowanie logów audytowych...");
    
    // 8. Log audytowy
    await db.insert(auditLog).values({
      id: "log_1",
      changedBy: createdUsers["anna.n@szkola.pl"],
      leaveId: pastLeaveRes[0].id,
      action: "UPDATE_RETURN_TIME",
      oldValue: "NULL",
      newValue: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
      changedAt: new Date(Date.now() - 94 * 60 * 1000),
    });

    console.log("✅ Baza danych została pomyślnie zasilona!");
  } catch (error) {
    console.error("❌ Wystąpił błąd podczas seedowania:", error);
    process.exitCode = 1;
  } finally {
    // Zamykamy proces po zakończeniu całości; kod wyjścia odzwierciedla błąd.
    process.exit(process.exitCode ?? 0);
  }
}

// Uruchomienie głównej funkcji
main();