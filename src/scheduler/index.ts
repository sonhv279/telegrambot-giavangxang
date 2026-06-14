import cron from 'node-cron';
import type { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { repositories } from '../container.js';
import { formatDailyDigest, formatFuelAlert, formatGoldAlert } from '../formatters/messages.js';
import { logger } from '../logger/index.js';
import { buildGoldAlerts, runFuelCrawl, runGoldCrawl } from '../services/crawlRunner.js';
import { sha256 } from '../utils/hash.js';
import { todayInTimezone } from '../utils/time.js';

const currentParts = (): { hour: number; minute: number; dayOfWeek: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: env.timezone,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour: Number(get('hour')), minute: Number(get('minute')), dayOfWeek: weekdayMap[get('weekday')] ?? 0 };
};

const shouldRunGold = (): boolean => {
  const { hour, minute } = currentParts();
  const minutes = hour * 60 + minute;
  if (minutes >= 8 * 60 + 55 && minutes <= 8 * 60 + 59) return true;
  if (minutes >= 8 * 60 && minutes <= 11 * 60 + 30) return true;
  if (minutes >= 13 * 60 + 30 && minutes <= 17 * 60) return true;
  if (minutes >= 19 * 60 + 30 && minutes <= 23 * 60 + 30) return minute % 3 === 0;
  return minute % 15 === 0;
};

const sendGoldAlerts = async (bot: Telegraf, snapshots: Awaited<ReturnType<typeof runGoldCrawl>>): Promise<void> => {
  const alerts = await buildGoldAlerts(snapshots);
  for (const alert of alerts) {
    const inserted = await repositories.notifications.markNotificationSent(alert.user.id, alert.notificationType, alert.snapshot.rawHash);
    if (!inserted) continue;
    try {
      await bot.telegram.sendMessage(alert.user.telegramChatId, formatGoldAlert(alert.snapshot));
    } catch (error) {
      logger.error({ error, userId: alert.user.id }, 'failed to send gold alert');
    }
  }
};

const sendFuelPeriodAlert = async (bot: Telegraf, snapshots: Awaited<ReturnType<typeof runFuelCrawl>>['snapshots']): Promise<void> => {
  const latest = snapshots[0];
  if (!latest) return;
  for (const user of await repositories.users.listActiveUsers()) {
    const inserted = await repositories.notifications.markNotificationSent(user.id, 'fuel_adjustment_period', latest.adjustmentPeriod ?? latest.rawHash);
    if (!inserted) continue;
    try {
      await bot.telegram.sendMessage(user.telegramChatId, formatFuelAlert(snapshots));
    } catch (error) {
      logger.error({ error, userId: user.id }, 'failed to send fuel alert');
    }
  }
};

const sendDailyDigests = async (bot: Telegraf): Promise<void> => {
  const gold = await repositories.snapshots.latestByType('gold');
  const fuel = await repositories.snapshots.latestByType('fuel');
  for (const user of await repositories.users.listDailyDigestUsers()) {
    const digestDate = todayInTimezone(user.timezone);
    if (!await repositories.notifications.canSendDailyDigest(user.id, digestDate)) continue;
    const message = formatDailyDigest(gold, fuel, user);
    try {
      await bot.telegram.sendMessage(user.telegramChatId, message);
      await repositories.notifications.markDailyDigestSent(user.id, digestDate, sha256(message));
    } catch (error) {
      logger.error({ error, userId: user.id }, 'failed to send daily digest');
    }
  }
};

export const startScheduler = (bot: Telegraf | null): void => {
  cron.schedule('* * * * *', async () => {
    if (!shouldRunGold()) return;
    const snapshots = await runGoldCrawl();
    if (bot) await sendGoldAlerts(bot, snapshots);
  }, { timezone: env.timezone });

  cron.schedule('*/30 * * * * *', async () => {
    const { hour, minute, dayOfWeek } = currentParts();
    if (dayOfWeek !== 4 || hour !== 14 || minute < 30) return;
    const result = await runFuelCrawl();
    if (bot && result.isNewPeriod) await sendFuelPeriodAlert(bot, result.snapshots);
  }, { timezone: env.timezone });

  cron.schedule('*/3 15-16 * * 4', async () => {
    const { hour, minute } = currentParts();
    if (hour === 15 && minute < 30) return;
    const result = await runFuelCrawl();
    if (bot && result.isNewPeriod) await sendFuelPeriodAlert(bot, result.snapshots);
  }, { timezone: env.timezone });

  cron.schedule('0 6,12,18 * * *', async () => {
    const result = await runFuelCrawl();
    if (bot && result.isNewPeriod) await sendFuelPeriodAlert(bot, result.snapshots);
  }, { timezone: env.timezone });

  cron.schedule('0 9 * * *', async () => {
    await runGoldCrawl();
    await runFuelCrawl();
    if (bot) await sendDailyDigests(bot);
  }, { timezone: env.timezone });

  logger.info('scheduler started');
};
