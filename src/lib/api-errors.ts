import { NextResponse } from 'next/server';

class InvalidRequestError extends Error {}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InvalidRequestError('Nieprawidłowy JSON');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new InvalidRequestError('Dane muszą być obiektem JSON');
  }
  return body as Record<string, unknown>;
}

/** Translate expected client and database constraint failures into HTTP errors. */
export function clientErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InvalidRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error === null || typeof error !== 'object') return null;
  if ('code' in error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'Taki rekord już istnieje lub uczeń ma aktywne wyjście' }, { status: 409 });
    }
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return NextResponse.json({ error: 'Rekord jest powiązany z innymi danymi lub wskazany rekord nie istnieje' }, { status: 409 });
    }
  }
  if ('statusCode' in error && typeof error.statusCode === 'number' &&
      error.statusCode >= 400 && error.statusCode < 500 && 'body' in error &&
      error.body !== null && typeof error.body === 'object' && 'message' in error.body &&
      typeof error.body.message === 'string') {
    return NextResponse.json({ error: error.body.message }, { status: error.statusCode });
  }
  return 'cause' in error ? clientErrorResponse(error.cause) : null;
}
