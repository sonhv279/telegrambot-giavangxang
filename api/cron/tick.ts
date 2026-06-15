import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBot } from '../../src/bot/index.js';
import { env } from '../../src/config/env.js';
import { currentVietnamTimeParts, runDailyDigestJob, runFuelJob, runGoldJob, shouldRunDailyDigestNow, shouldRunFuelNow, shouldRunGoldNow } from '../../src/services/jobs.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (env.cronSecret && req.headers.authorization !== `Bearer ${env.cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.query.dry_run === '1') {
    const now = new Date();
    res.status(200).json({
      ok: true,
      dryRun: true,
      timezone: env.timezone,
      vietnamTime: currentVietnamTimeParts(now),
      wouldRun: {
        gold: shouldRunGoldNow(now),
        fuel: shouldRunFuelNow(now),
        dailyDigest: shouldRunDailyDigestNow(now)
      }
    });
    return;
  }

  const bot = createBot();
  const shouldRunDailyDigest = shouldRunDailyDigestNow();
  const [gold, fuel] = await Promise.all([
    runGoldJob(bot),
    runFuelJob(bot)
  ]);
  const dailyDigest = shouldRunDailyDigest ? await runDailyDigestJob(bot) : { sent: 0 };

  res.status(200).json({ ok: true, gold, fuel, dailyDigest });
}
