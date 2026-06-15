import { describe, expect, it } from 'vitest';
import { shouldRunDailyDigestNow } from './jobs.js';

const vietnamTime = (hour: number, minute: number): Date => {
  const utcHour = hour - 7;
  return new Date(Date.UTC(2026, 5, 15, utcHour, minute));
};

describe('jobs', () => {
  it('allows a short window for the daily digest cron tick', () => {
    expect(shouldRunDailyDigestNow(vietnamTime(9, 0))).toBe(true);
    expect(shouldRunDailyDigestNow(vietnamTime(9, 9))).toBe(true);
    expect(shouldRunDailyDigestNow(vietnamTime(9, 10))).toBe(false);
    expect(shouldRunDailyDigestNow(vietnamTime(8, 59))).toBe(false);
  });
});
