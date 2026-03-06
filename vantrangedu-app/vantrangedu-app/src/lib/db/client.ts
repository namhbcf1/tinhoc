import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(env: any) {
  // Cloudflare D1 Binding passed via Server Component context
  return drizzle(env.DB, { schema });
}
