import type { Pool } from 'pg';
import { nowIso } from '../utils/time.js';

export class NotificationRepository {
  constructor(private readonly pool: Pool) {}

  async markNotificationSent(userId: number, notificationType: string, snapshotHash: string): Promise<boolean> {
    const result = await this.pool.query(`
      INSERT INTO sent_notifications (user_id, notification_type, snapshot_hash, sent_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(user_id, notification_type, snapshot_hash) DO NOTHING
    `, [userId, notificationType, snapshotHash, nowIso()]);
    return (result.rowCount ?? 0) > 0;
  }

  async canSendDailyDigest(userId: number, digestDate: string): Promise<boolean> {
    const result = await this.pool.query('SELECT id FROM sent_daily_digests WHERE user_id = $1 AND digest_date = $2', [userId, digestDate]);
    return result.rowCount === 0;
  }

  async markDailyDigestSent(userId: number, digestDate: string, messageHash: string): Promise<boolean> {
    const result = await this.pool.query(`
      INSERT INTO sent_daily_digests (user_id, digest_date, message_hash, sent_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(user_id, digest_date) DO NOTHING
    `, [userId, digestDate, messageHash, nowIso()]);
    return (result.rowCount ?? 0) > 0;
  }
}
