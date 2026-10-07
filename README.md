# Rejestr Wyjść Uczniów

Prosty system rejestracji wyjść uczniów z zajęć — panel nauczyciela. Nauczyciel weryfikuje, kto z niego wyjdzie, kto wróci, widzi historię wyjść i aktywne wyjścia w bieżącej lekcji.

## Wymagania

- Node.js 20+
- npm
- SQLite (plik bazowy, domyślnie `sqlite.db`)

## Szybki start

1. `npm install`
2. Skopiuj `.env.example` do `.env` i wypełnij wartości:
   - `DB_FILE_NAME` — ścieżka do pliku SQLite (np. `./sqlite.db`)
   - `BETTER_AUTH_SECRET` — dowolny długi ciąg (np. wygeneruj `openssl rand -hex 32`)
   - `BETTER_AUTH_URL` — URL aplikacji, np. `http://localhost:3000`
3. Wygeneruj i zastosuj migracje:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
4. Zasiej bazę danych:
   ```bash
   npm run db:seed
   ```
5. Uruchom serwer:
   ```bash
   npm run dev
   ```

Serwer startuje na `http://localhost:3000`.

## Auth i role

Używamy better-auth z email+hasłem. Po seedowaniu dostępne są następujące konta (hasło domyślne: `haslo123`):

| Email | Rola |
|---|---|
| admin@gmail.com | admin |
| maria.w@szkola.pl | educator |
| tomasz.n@szkola.pl | teacher |
| anna.n@szkola.pl | teacher |

Role w systemie:
- **admin** — pełny dostęp, obejmuje wszystkie klasy
- **teacher** — swoje klasy, rozpoczęcie/zakończenie lekcji, rejestracja wyjść/powrotów
- **educator** — podobnie jak teacher, z dostępem do własnych klas

## Dane seedowe

Po `npm run db:seed` dostępne są:
- 2 klasy: Klasa 1A, Klasa 2B
- Uczniowie przypisani do klas
- Aktywna i zakończona sesja lekcji
- Wyjścia (aktywne i zakończone)
- Logi audytowe

## Struktura katalogów

```
src/
  app/
    api/          — endpointy API (dashboard, leaves, lesson, history, classes, students, auth)
    (pages)/      — strony: dashboard, history, classes, settings, sign-in
  db/
    schema.ts     — schemat Drizzle (tables)
    index.ts      — połączenie z bazą
    seed.ts       — seed danych
  lib/
    auth.ts       — konfiguracja better-auth
    auth-client.ts — klient auth (signIn, signOut, useSession)
```

## API

### GET /api/dashboard
Sesja wymagana. Zwraca klasę nauczyciela, aktywną lekcję, listę uczniów, aktywne wyjścia i statystyki na dzisiaj.

### POST /api/leaves
Rejestracja wyjścia ucznia. Ciało: `{ studentId: number, reason: string }`. Wymaga aktywnej lekcji, sprawdza uprawnienia.

### PATCH /api/leaves/:id/return
Rejestracja powrotu ucznia. Wymaga aktywnej lekcji i uprawnień.

### POST /api/lesson
Rozpoczęcie (`action: "start"`, `classId`, `subject`) lub zakończenie (`action: "stop"`, `lessonId`) lekcji.

### GET /api/history
Historia wyjść z filtrami: `class`, `reason`, `from`, `to`.

### GET /api/classes
Lista klas z liczbą uczniów (nauczyciel widzi swoje, admin wszystkie).

### GET /api/students?classId=…
Uczniowie w danej klasie.

## Zasady commitów

Zob. `COMMIT_CONVENTIONS.md`.

Typowe prefiksy: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.

Przykłady:
```
feat: dodaj endpoint zwrotu ucznia
fix: popraw walidację reason w POST /api/leaves
docs: dodaj README i .env.example
chore: dodaj skrypty db:generate/db:migrate
```

## Rozwój

- Lint: `npm run lint`
- Build: `npm run build`
- Migracje: `npx drizzle-kit generate`, `npx drizzle-kit migrate`
- Studio DB: `npx drizzle-kit studio`
- Seed: `npm run db:seed`

## Regression tests

Run `npm test` to check authentication roles, class data isolation, lesson
permissions, and transaction rollback. Tests apply migrations to a temporary
SQLite database and do not use or modify `.env` or the development database.
