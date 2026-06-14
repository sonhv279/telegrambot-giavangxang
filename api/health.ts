import type { VercelRequest, VercelResponse } from '@vercel/node';
import { env } from '../src/config/env.js';
import { getPool } from '../src/db/connection.js';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const result = {
    ok: true,
    env: {
      botToken: Boolean(env.botToken),
      databaseUrl: Boolean(env.databaseUrl),
      publicAppUrl: Boolean(env.publicAppUrl),
      cronSecret: Boolean(env.cronSecret),
      timezone: env.timezone
    },
    db: 'not_checked' as 'not_checked' | 'ok' | string
  };

  if (!env.databaseUrl) {
    res.status(200).json({ ...result, ok: false, db: 'DATABASE_URL is missing' });
    return;
  }

  try {
    await getPool().query('SELECT 1');
    res.status(200).json({ ...result, db: 'ok' });
  } catch (error) {
    res.status(200).json({
      ...result,
      ok: false,
      db: error instanceof Error ? error.message : 'Unknown database error'
    });
  }
}
