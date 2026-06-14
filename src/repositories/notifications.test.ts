import { describe, expect, it } from 'vitest';

class InMemoryNotificationDedupe {
  private readonly sentNotifications = new Set<string>();
  private readonly sentDigests = new Set<string>();

  markNotificationSent(userId: number, notificationType: string, snapshotHash: string): boolean {
    const key = `${userId}|${notificationType}|${snapshotHash}`;
    if (this.sentNotifications.has(key)) return false;
    this.sentNotifications.add(key);
    return true;
  }

  canSendDailyDigest(userId: number, digestDate: string): boolean {
    return !this.sentDigests.has(`${userId}|${digestDate}`);
  }

  markDailyDigestSent(userId: number, digestDate: string): boolean {
    const key = `${userId}|${digestDate}`;
    if (this.sentDigests.has(key)) return false;
    this.sentDigests.add(key);
    return true;
  }
}

describe('notification dedupe semantics', () => {
  it('dedupes realtime notifications', () => {
    const repo = new InMemoryNotificationDedupe();

    expect(repo.markNotificationSent(1, 'gold_price_change', 'hash')).toBe(true);
    expect(repo.markNotificationSent(1, 'gold_price_change', 'hash')).toBe(false);
  });

  it('dedupes daily digest once per day per user', () => {
    const repo = new InMemoryNotificationDedupe();

    expect(repo.canSendDailyDigest(1, '2026-06-15')).toBe(true);
    expect(repo.markDailyDigestSent(1, '2026-06-15')).toBe(true);
    expect(repo.canSendDailyDigest(1, '2026-06-15')).toBe(false);
    expect(repo.markDailyDigestSent(1, '2026-06-15')).toBe(false);
  });
});
