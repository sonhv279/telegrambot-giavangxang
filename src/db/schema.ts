import type { Pool } from 'pg';

export const migrate = async (pool: Pool): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      telegram_chat_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL,
      muted BOOLEAN NOT NULL DEFAULT FALSE,
      timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
      daily_digest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      daily_digest_time TEXT NOT NULL DEFAULT '09:00'
    );

    CREATE TABLE IF NOT EXISTS price_snapshots (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_group TEXT,
      category TEXT,
      region TEXT,
      buy_price BIGINT,
      sell_price BIGINT,
      spread BIGINT,
      unit TEXT,
      effective_time TIMESTAMPTZ,
      adjustment_period TEXT,
      crawled_at TIMESTAMPTZ NOT NULL,
      raw_hash TEXT NOT NULL UNIQUE
    );

    CREATE INDEX IF NOT EXISTS idx_price_snapshots_type_product_time
      ON price_snapshots(type, product_name, crawled_at);

    CREATE INDEX IF NOT EXISTS idx_price_snapshots_effective_time
      ON price_snapshots(type, effective_time);

    CREATE TABLE IF NOT EXISTS fuel_adjustment_periods (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      effective_time TIMESTAMPTZ NOT NULL,
      title TEXT,
      raw_hash TEXT NOT NULL UNIQUE,
      detected_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_alert_settings (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      product_filter TEXT,
      threshold BIGINT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE(user_id, type, product_filter)
    );

    CREATE TABLE IF NOT EXISTS sent_notifications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id),
      notification_type TEXT NOT NULL,
      snapshot_hash TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL,
      UNIQUE(user_id, notification_type, snapshot_hash)
    );

    CREATE TABLE IF NOT EXISTS sent_daily_digests (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id),
      digest_date TEXT NOT NULL,
      message_hash TEXT NOT NULL,
      sent_at TIMESTAMPTZ NOT NULL,
      UNIQUE(user_id, digest_date)
    );

    CREATE TABLE IF NOT EXISTS crawler_runs (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      finished_at TIMESTAMPTZ,
      error_message TEXT
    );
  `);
};
