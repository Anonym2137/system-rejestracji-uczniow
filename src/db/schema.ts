import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// BETTER-AUTH SCHEMAS
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  role: text('role', { enum: ['admin', 'teacher', 'educator', 'student'] }).notNull().default('teacher'),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, {onDelete: "cascade"}),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  issuer: text('issuer'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// CLASSES AND STUDENTS
export const schoolClass = sqliteTable('school_class', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  educatorId: text('educator_id').references(() => user.id),
});

export const student = sqliteTable('student', {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => user.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  // WF-53: usunięcie klasy jest możliwe tylko gdy nie ma przypisanych uczniów,
  // dlatego NIE kaskadujemy — baza zablokuje usunięcie klasy z uczniami.
  classId: integer('class_id').notNull().references(() => schoolClass.id, { onDelete: 'restrict' }),
});

// LESSONS, LEAVE
export const lessonSession = sqliteTable('lesson_session', {
  id: text('id').primaryKey().$defaultFn(() => sql`lower(hex(randomblob(16)))`),
  classId: integer('class_id').notNull().references(() => schoolClass.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').notNull().references(() => user.id),
  subject: text('subject'), // np. "Matematyka"
  lessonNumber: text('lesson_number'), // np. "3"
  startTime: text('start_time'), // np. "08:00"
  startedAt: integer('started_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()), 
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const studentLeave = sqliteTable('student_leave', {
  id: text('id').primaryKey().$defaultFn(() => sql`lower(hex(randomblob(16)))`),
  studentId: integer('student_id').notNull().references(() => student.id, { onDelete: 'cascade' }),
  lessonSessionId: text('lesson_session_id').notNull().references(() => lessonSession.id, { onDelete: 'cascade' }),
  // WF-20: wyjście rejestrujemy zawsze z powodem — kolumna nie może być pusta.
  reason: text('reason').notNull().default('Inny'),
  leftAt: integer('left_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
    
  // Rejestracja POWROTU: Na początku puste (NULL). Gdy wraca, robimy UPDATE na tę kolumnę.
  returnedAt: integer('returned_at', { mode: 'timestamp' }),
}, (table) => [
  // Indeksy przyspieszające filtrowanie historii i aktywnych wyjść
  index('student_id_idx').on(table.studentId),
  index('lesson_idx').on(table.lessonSessionId),
  // WF-24 / RB-01: uczeń może mieć maksymalnie jedno aktywne wyjście
  // (indeks częściowy — dotyczy tylko wierszy bez zarejestrowanego powrotu).
  uniqueIndex('student_active_leave_idx')
    .on(table.studentId)
    .where(sql`returned_at IS NULL`),
]);

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => sql`lower(hex(randomblob(16)))`),
  changedBy: text('changed_by').notNull().references(() => user.id), // Kto zmienił
  // Ślad audytowy musi przetrwać usunięcie wyjścia/ucznia, dlatego NIE ma tu
  // klucza obcego do student_leave — inaczej blokowałby kaskadowe usuwanie.
  leaveId: text('leave_id').notNull(), // Czego dotyczyła zmiana (historyczny identyfikator)
  action: text('action').notNull(), // np. "UPDATE_RETURN_TIME"
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedAt: integer('changed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});