import type { Pool } from 'pg';
import { env } from '../config/env.js';
import type { User } from '../types.js';
import { nowIso } from '../utils/time.js';

const mapUser = (row: any): User => ({
  id: Number(row.id),
  telegramChatId: row.telegram_chat_id,
  createdAt: new Date(row.created_at).toISOString(),
  muted: Boolean(row.muted),
  timezone: row.timezone,
  dailyDigestEnabled: Boolean(row.daily_digest_enabled),
  dailyDigestTime: row.daily_digest_time
});

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByTelegramChatId(chatId: string): Promise<User | undefined> {
    const result = await this.pool.query('SELECT * FROM users WHERE telegram_chat_id = $1', [chatId]);
    return result.rows[0] ? mapUser(result.rows[0]) : undefined;
  }

  async upsertByTelegramChatId(chatId: string): Promise<User> {
    await this.pool.query(`
      INSERT INTO users (telegram_chat_id, created_at, timezone, daily_digest_enabled, daily_digest_time)
      VALUES ($1, $2, $3, TRUE, '09:00')
      ON CONFLICT(telegram_chat_id) DO NOTHING
    `, [chatId, nowIso(), env.timezone]);

    const user = await this.findByTelegramChatId(chatId);
    if (!user) throw new Error('Failed to create user');
    await this.ensureDefaultAlertSettings(user.id);
    return user;
  }

  async listActiveUsers(): Promise<User[]> {
    const result = await this.pool.query('SELECT * FROM users WHERE muted = FALSE');
    return result.rows.map(mapUser);
  }

  async listDailyDigestUsers(): Promise<User[]> {
    const result = await this.pool.query('SELECT * FROM users WHERE muted = FALSE AND daily_digest_enabled = TRUE');
    return result.rows.map(mapUser);
  }

  async setMuted(userId: number, muted: boolean): Promise<void> {
    await this.pool.query('UPDATE users SET muted = $1 WHERE id = $2', [muted, userId]);
  }

  async setDailyDigest(userId: number, enabled: boolean): Promise<void> {
    await this.pool.query('UPDATE users SET daily_digest_enabled = $1 WHERE id = $2', [enabled, userId]);
  }

  async setGoldThreshold(userId: number, threshold: number): Promise<void> {
    await this.pool.query(`
      INSERT INTO user_alert_settings (user_id, type, product_filter, threshold, enabled)
      VALUES ($1, 'gold', '*', $2, TRUE)
      ON CONFLICT(user_id, type, product_filter)
      DO UPDATE SET threshold = EXCLUDED.threshold, enabled = TRUE
    `, [userId, threshold]);
  }

  async getGoldThreshold(userId: number): Promise<number> {
    const result = await this.pool.query(`
      SELECT threshold FROM user_alert_settings
      WHERE user_id = $1 AND type = 'gold' AND product_filter = '*'
    `, [userId]);
    return Number(result.rows[0]?.threshold ?? env.goldDefaultThreshold);
  }

  private async ensureDefaultAlertSettings(userId: number): Promise<void> {
    await this.pool.query(`
      INSERT INTO user_alert_settings (user_id, type, product_filter, threshold, enabled)
      VALUES ($1, 'gold', '*', $2, TRUE)
      ON CONFLICT(user_id, type, product_filter) DO NOTHING
    `, [userId, env.goldDefaultThreshold]);
  }
}
