import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';

let directory: string;
let db: typeof import('../src/db').db;
let auth: typeof import('../src/lib/auth').auth;
let schema: typeof import('../src/db/schema');
let ownerId: string;
let otherId: string;
let adminId: string;
let ownerCookie: string;
let otherCookie: string;
let adminCookie: string;
let classId: number;
let otherClassId: number;
let studentId: number;

function request(path: string, cookie = ownerCookie, body?: unknown, method = 'POST') {
  return new Request(`http://localhost:3000${path}`, {
    method: body === undefined && method === 'POST' ? 'GET' : method,
    headers: { cookie, 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

async function signIn(email: string) {
  const response = await auth.api.signInEmail({
    body: { email, password: 'test-password-123' }, asResponse: true,
  });
  assert.equal(response.status, 200);
  return response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'student-regressions-'));
  // Do not read or modify the developer's .env or database.
  process.env.DOTENV_CONFIG_PATH = '/dev/null';
  process.env.DB_FILE_NAME = `file:${join(directory, 'test.db')}`;
  process.env.BETTER_AUTH_SECRET = 'test-only-secret-at-least-32-characters-long';
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  ({ db } = await import('../src/db'));
  schema = await import('../src/db/schema');
  await migrate(db, { migrationsFolder: './drizzle' });
  ({ auth } = await import('../src/lib/auth'));
  const owner = await auth.api.signUpEmail({ body: {
    name: 'Owner', email: 'owner@example.com', password: 'test-password-123',
  } });
  const other = await auth.api.signUpEmail({ body: {
    name: 'Other', email: 'other@example.com', password: 'test-password-123',
  } });
  const admin = await auth.api.signUpEmail({ body: {
    name: 'Admin', email: 'admin@example.com', password: 'test-password-123',
  } });
  ownerId = owner.user.id;
  otherId = other.user.id;
  adminId = admin.user.id;
  await db.update(schema.user).set({ role: 'admin' }).where(eq(schema.user.id, adminId));
  ownerCookie = await signIn('owner@example.com');
  otherCookie = await signIn('other@example.com');
  adminCookie = await signIn('admin@example.com');
  const [cls] = await db.insert(schema.schoolClass).values({ name: '1A', educatorId: ownerId }).returning();
  const [otherCls] = await db.insert(schema.schoolClass).values({ name: '2B', educatorId: otherId }).returning();
  classId = cls.id;
  otherClassId = otherCls.id;
  const [student] = await db.insert(schema.student).values({ firstName: 'Jan', lastName: 'Kowalski', classId }).returning();
  studentId = student.id;
});

after(async () => {
  db?.$client.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('auth clients cannot promote their role through signup or update-user', async () => {
  const response = await auth.handler(request('/api/auth/sign-up/email', '', {
    name: 'Attacker', email: 'attacker@example.com', password: 'test-password-123', role: 'admin',
  }));
  const [created] = await db.select().from(schema.user).where(eq(schema.user.email, 'attacker@example.com'));
  assert.ok(response.status >= 400 || created?.role === 'teacher');
  await auth.handler(request('/api/auth/update-user', ownerCookie, { role: 'admin' }));
  const [owner] = await db.select().from(schema.user).where(eq(schema.user.id, ownerId));
  assert.equal(owner.role, 'teacher');
});

test('history, reasons and statistics remain assigned to the lesson class after a student moves', async () => {
  const [lesson] = await db.insert(schema.lessonSession).values({ classId, teacherId: ownerId, isActive: false }).returning();
  await db.insert(schema.studentLeave).values({ studentId, lessonSessionId: lesson.id, reason: 'Private class reason', returnedAt: new Date() });
  await db.update(schema.student).set({ classId: otherClassId }).where(eq(schema.student.id, studentId));
  const { GET: history } = await import('../src/app/api/history/route');
  const { GET: reasons } = await import('../src/app/api/leaves/reasons/route');
  const { GET: dashboard } = await import('../src/app/api/dashboard/route');
  assert.equal((await (await history(request('/api/history'))).json()).length, 1);
  assert.equal((await (await history(request('/api/history', otherCookie))).json()).length, 0);
  assert.ok((await (await reasons(request('/api/leaves/reasons'))).json()).includes('Private class reason'));
  assert.ok(!(await (await reasons(request('/api/leaves/reasons', otherCookie))).json()).includes('Private class reason'));
  const data = await (await dashboard(request(`/api/dashboard?classId=${classId}`))).json();
  assert.equal(data.todayStats.totalExits, 1);
  assert.equal((await history(request('/api/history?from=invalid'))).status, 400);
  await db.update(schema.student).set({ classId }).where(eq(schema.student.id, studentId));
});

test('class owner can register and return exits and end a lesson started by someone else', async (t) => {
  const [lesson] = await db.insert(schema.lessonSession).values({ classId, teacherId: otherId }).returning();
  const { POST: exit } = await import('../src/app/api/leaves/route');
  const { PATCH: markReturn } = await import('../src/app/api/leaves/[id]/return/route');
  const { POST: changeLesson } = await import('../src/app/api/lesson/route');
  assert.equal((await exit(request('/api/leaves', ownerCookie, { studentId, reason: '   ' }))).status, 400);
  const response = await exit(request('/api/leaves', ownerCookie, { studentId, reason: 'Toaleta' }));
  assert.equal(response.status, 200);
  const { leave } = await response.json();
  const context = { params: Promise.resolve({ id: leave.id }) };
  // An audit failure must roll back the return, rather than silently lose the audit trail.
  await db.$client.execute("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_log BEGIN SELECT RAISE(ABORT, 'test audit failure'); END");
  const silence = t.mock.method(console, 'error', () => {});
  assert.equal((await markReturn(request('/api/leaves/return', ownerCookie, undefined, 'PATCH'), context)).status, 500);
  const [unchanged] = await db.select().from(schema.studentLeave).where(eq(schema.studentLeave.id, leave.id));
  assert.equal(unchanged.returnedAt, null);
  await db.$client.execute('DROP TRIGGER fail_audit');
  silence.mock.restore();
  assert.equal((await markReturn(request('/api/leaves/return', ownerCookie, undefined, 'PATCH'), context)).status, 200);
  assert.equal((await markReturn(request('/api/leaves/return', ownerCookie, undefined, 'PATCH'), context)).status, 409);
  assert.equal((await changeLesson(request('/api/lesson', ownerCookie, { action: 'stop', lessonId: lesson.id }))).status, 200);
  const { PATCH: correction } = await import('../src/app/api/leaves/[id]/route');
  assert.equal((await correction(request('/api/leaves/correction', ownerCookie, { returnedAt: null }, 'PATCH'), context)).status, 400);
});

test('ending a lesson rolls back automatic returns if closing the lesson fails', async () => {
  const [lesson] = await db.insert(schema.lessonSession).values({ classId, teacherId: ownerId }).returning();
  const [leave] = await db.insert(schema.studentLeave).values({ studentId, lessonSessionId: lesson.id, reason: 'Toaleta' }).returning();
  await db.$client.execute("CREATE TRIGGER fail_end BEFORE UPDATE ON lesson_session BEGIN SELECT RAISE(ABORT, 'test lesson failure'); END");
  const { endLessonWithReturns } = await import('../src/lib/lessons');
  await assert.rejects(endLessonWithReturns(lesson.id));
  const [unchanged] = await db.select().from(schema.studentLeave).where(eq(schema.studentLeave.id, leave.id));
  assert.equal(unchanged.returnedAt, null);
  await db.$client.execute('DROP TRIGGER fail_end');
  await endLessonWithReturns(lesson.id);
});

test('admin user endpoints validate roles and report the assigned role', async () => {
  const { POST } = await import('../src/app/api/users/route');
  const { PUT } = await import('../src/app/api/users/[id]/route');
  const body = { name: 'New Teacher', email: 'new@example.com', password: 'test-password-123', role: 'educator' };
  assert.equal((await POST(request('/api/users', adminCookie, { ...body, role: 'invalid' }))).status, 400);
  const response = await POST(request('/api/users', adminCookie, body));
  assert.equal(response.status, 201);
  const created = (await response.json()).user;
  assert.equal(created.role, 'educator');
  const { DELETE } = await import('../src/app/api/users/[id]/route');
  assert.equal((await DELETE(request('/api/users/delete', adminCookie, undefined, 'DELETE'), { params: Promise.resolve({ id: created.id }) })).status, 200);
  const context = { params: Promise.resolve({ id: ownerId }) };
  assert.equal((await PUT(request('/api/users/edit', adminCookie, {}, 'PUT'), context)).status, 400);
  assert.equal((await PUT(request('/api/users/edit', adminCookie, { email: 'other@example.com' }, 'PUT'), context)).status, 409);
});


test('invalid JSON and referenced-user deletion produce client errors', async () => {
  const { POST } = await import('../src/app/api/leaves/route');
  for (const body of ['{', 'null', '[]']) {
    const response = await POST(new Request('http://localhost:3000/api/leaves', {
      method: 'POST', headers: { cookie: ownerCookie, 'Content-Type': 'application/json' }, body,
    }));
    assert.equal(response.status, 400);
  }
  const { DELETE } = await import('../src/app/api/users/[id]/route');
  assert.equal((await DELETE(request('/api/users/delete', adminCookie, undefined, 'DELETE'), {
    params: Promise.resolve({ id: ownerId }),
  })).status, 409);
  // A failed deletion must preserve the user's sessions.
  assert.ok(await auth.api.getSession({ headers: new Headers({ cookie: ownerCookie }) }));
});

test('middleware returns JSON 401 for APIs and redirects unauthenticated pages', async () => {
  const { middleware } = await import('../src/middleware');
  const { NextRequest } = await import('next/server');
  const api = await middleware(new NextRequest('http://localhost:3000/api/dashboard'));
  assert.equal(api.status, 401);
  assert.equal(api.headers.get('location'), null);
  const page = await middleware(new NextRequest('http://localhost:3000/history'));
  assert.equal(page.status, 307);
  assert.equal(page.headers.get('location'), 'http://localhost:3000/sign-in');
});


test('admin can assign, preserve and remove a class educator by user ID', async () => {
  const { PUT } = await import('../src/app/api/classes/[id]/route');
  const context = { params: Promise.resolve({ id: classId.toString() }) };
  const assign = await PUT(request('/api/classes/edit', adminCookie, { educatorId: otherId }, 'PUT'), context);
  assert.equal(assign.status, 200);
  assert.equal((await assign.json()).class.educatorId, otherId);
  const rename = await PUT(request('/api/classes/edit', adminCookie, { name: '1A renamed' }, 'PUT'), context);
  assert.equal(rename.status, 200);
  assert.equal((await rename.json()).class.educatorId, otherId);
  const remove = await PUT(request('/api/classes/edit', adminCookie, { educatorId: null }, 'PUT'), context);
  assert.equal(remove.status, 200);
  assert.equal((await remove.json()).class.educatorId, null);
});
