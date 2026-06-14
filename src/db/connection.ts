import { Pool } from 'pg';
import { env } from '../config/env.js';

let poolInstance: Pool | null = null;

export const getPool = (): Pool => {
  if (poolInstance) return poolInstance;

  poolInstance = new Pool({
    connectionString: env.databaseUrl || undefined,
    ssl: env.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000
  });

  return poolInstance;
};
