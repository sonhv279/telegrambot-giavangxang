import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot } from '../src/bot/index.js';
import { telegramCommands } from '../src/bot/botCommands.js';
import { env } from '../src/config/env.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (env.cronSecret && req.headers.authorization !== `Bearer ${env.cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const bot = createBot();
  if (!bot || !env.publicAppUrl) {
    res.status(500).json({ error: 'BOT_TOKEN and PUBLIC_APP_URL are required' });
    return;
  }

  const webhookUrl = `${env.publicAppUrl.replace(/\/$/, '')}/api/telegram`;
  await bot.telegram.setMyCommands(telegramCommands);
  await bot.telegram.setWebhook(webhookUrl, { drop_pending_updates: false });
  res.status(200).json({ ok: true, webhookUrl });
}
