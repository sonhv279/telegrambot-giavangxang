import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot } from '../../src/bot/index.js';
import { env } from '../../src/config/env.js';
import { runGoldJob } from '../../src/services/jobs.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (env.cronSecret && req.headers.authorization !== `Bearer ${env.cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const result = await runGoldJob(createBot());
  res.status(200).json({ ok: true, ...result });
}
