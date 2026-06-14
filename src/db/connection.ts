import { Pool } from 'pg';
import { env } from '../config/env.js';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000
});
