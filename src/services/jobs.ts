import type { Telegraf } from 'telegraf';
import { ensureDatabase, repositories } from '../container.js';
import { env } from '../config/env.js';
import { formatDailyDigest, formatFuelAlert, formatGoldAlert } from '../formatters/messages.js';
import { logger } from '../logger/index.js';
import { buildGoldAlerts, runFuelCrawl, runGoldCrawl } from './crawlRunner.js';
import { sha256 } from '../utils/hash.js';
import { todayInTimezone } from '../utils/time.js';

export const shouldRunGoldNow = (date = new Date()): boolean => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: env.timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = get('hour');
  const minute = get('minute');
  const minutes = hour * 60 + minute;
  if (minutes >= 8 * 60 + 55 && minutes <= 8 * 60 + 59) return true;
  if (minutes >= 8 * 60 && minutes <= 11 * 60 + 30) return true;
  if (minutes >= 13 * 60 + 30 && minutes <= 17 * 60) return true;
  if (minutes >= 19 * 60 + 30 && minutes <= 23 * 60 + 30) return minute % 3 === 0;
  return minute % 15 === 0;
};

export const currentVietnamTimeParts = (date = new Date()): { hour: number; minute: number; dayOfWeek: number } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: env.timezone,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour: Number(get('hour')), minute: Number(get('minute')), dayOfWeek: weekdayMap[get('weekday')] ?? 0 };
};

export const shouldRunFuelNow = (date = new Date()): boolean => {
  const { hour, minute, dayOfWeek } = currentVietnamTimeParts(date);
  const minutes = hour * 60 + minute;
  if (dayOfWeek === 4 && minutes >= 14 * 60 + 30 && minutes <= 15 * 60 + 30) return true;
  if (dayOfWeek === 4 && minutes > 15 * 60 + 30 && minutes <= 17 * 60) return minute % 3 === 0;
  return hour % 6 === 0 && minute === 0;
};

export const shouldRunDailyDigestNow = (date = new Date()): boolean => {
  const { hour, minute } = currentVietnamTimeParts(date);
  return hour === 9 && minute === 0;
};

export const runGoldJob = async (bot: Telegraf | null): Promise<{ crawled: number; alerts: number }> => {
  if (!shouldRunGoldNow()) return { crawled: 0, alerts: 0 };
  await ensureDatabase();
  const snapshots = await runGoldCrawl();
  if (!bot) return { crawled: snapshots.length, alerts: 0 };

  let sent = 0;
  const alerts = await buildGoldAlerts(snapshots);
  for (const alert of alerts) {
    const inserted = await repositories.notifications.markNotificationSent(alert.user.id, alert.notificationType, alert.snapshot.rawHash);
    if (!inserted) continue;
    try {
      await bot.telegram.sendMessage(alert.user.telegramChatId, formatGoldAlert(alert.snapshot));
      sent += 1;
    } catch (error) {
      logger.error({ error, userId: alert.user.id }, 'failed to send gold alert');
    }
  }
  return { crawled: snapshots.length, alerts: sent };
};

export const runFuelJob = async (bot: Telegraf | null): Promise<{ crawled: number; alerts: number; isNewPeriod: boolean }> => {
  if (!shouldRunFuelNow()) return { crawled: 0, alerts: 0, isNewPeriod: false };
  await ensureDatabase();
  const result = await runFuelCrawl();
  if (!bot || !result.isNewPeriod) return { crawled: result.snapshots.length, alerts: 0, isNewPeriod: result.isNewPeriod };

  const latest = result.snapshots[0];
  if (!latest) return { crawled: 0, alerts: 0, isNewPeriod: result.isNewPeriod };

  let sent = 0;
  for (const user of await repositories.users.listActiveUsers()) {
    const inserted = await repositories.notifications.markNotificationSent(user.id, 'fuel_adjustment_period', latest.adjustmentPeriod ?? latest.rawHash);
    if (!inserted) continue;
    try {
      await bot.telegram.sendMessage(user.telegramChatId, formatFuelAlert(result.snapshots));
      sent += 1;
    } catch (error) {
      logger.error({ error, userId: user.id }, 'failed to send fuel alert');
    }
  }
  return { crawled: result.snapshots.length, alerts: sent, isNewPeriod: result.isNewPeriod };
};

export const runDailyDigestJob = async (bot: Telegraf | null): Promise<{ sent: number }> => {
  await ensureDatabase();
  await runGoldCrawl();
  await runFuelCrawl();
  if (!bot) return { sent: 0 };

  const gold = await repositories.snapshots.latestByType('gold');
  const fuel = await repositories.snapshots.latestByType('fuel');
  let sent = 0;

  for (const user of await repositories.users.listDailyDigestUsers()) {
    const digestDate = todayInTimezone(user.timezone);
    if (!await repositories.notifications.canSendDailyDigest(user.id, digestDate)) continue;
    const message = formatDailyDigest(gold, fuel, user);
    try {
      await bot.telegram.sendMessage(user.telegramChatId, message);
      await repositories.notifications.markDailyDigestSent(user.id, digestDate, sha256(message));
      sent += 1;
    } catch (error) {
      logger.error({ error, userId: user.id }, 'failed to send daily digest');
    }
  }

  return { sent };
};
