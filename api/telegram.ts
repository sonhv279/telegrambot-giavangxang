import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot } from '../src/bot/index.js';
import { ensureDatabase } from '../src/container.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const bot = createBot();
  if (!bot) {
    res.status(500).json({ error: 'BOT_TOKEN is not configured' });
    return;
  }

  await ensureDatabase();
  await bot.handleUpdate(req.body);
  res.status(200).json({ ok: true });
}
