import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({ url: process.env.DB_FILE_NAME! });

// SQLite domyślnie NIE egzekwuje kluczy obcych. Bez tego wszystkie
// `ON DELETE CASCADE` / `ON DELETE RESTRICT` zadeklarowane w schemacie
// są ignorowane — np. usunięcie ucznia z historią wyjść kończyło się
// błędem FOREIGN KEY constraint failed, a usunięcie klasy z uczniami
// przechodziło, zostawiając osierocone rekordy.
client.execute('PRAGMA foreign_keys = ON').catch((error) => {
  console.error('Nie udało się włączyć PRAGMA foreign_keys:', error);
});

export const db = drizzle(client, { schema });
