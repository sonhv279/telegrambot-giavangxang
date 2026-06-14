import 'dotenv/config';

const numberFromEnv = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  botToken: process.env.BOT_TOKEN ?? '',
  databaseUrl: process.env.DATABASE_URL ?? '',
  publicAppUrl: process.env.PUBLIC_APP_URL ?? '',
  cronSecret: process.env.CRON_SECRET ?? '',
  timezone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  demoMode: (process.env.DEMO_MODE ?? 'true') === 'true',
  allowMockData: (process.env.DEMO_MODE ?? 'true') === 'true' && process.env.NODE_ENV !== 'production',
  goldDefaultThreshold: numberFromEnv('GOLD_DEFAULT_THRESHOLD', 200_000),
  goldSpreadThreshold: numberFromEnv('GOLD_SPREAD_THRESHOLD', 300_000)
};
