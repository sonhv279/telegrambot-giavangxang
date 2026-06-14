import type { Pool } from 'pg';
import { env } from '../config/env.js';
import type { FuelAdjustmentPeriod, PriceSnapshot, PriceType } from '../types.js';

const mapSnapshot = (row: any): PriceSnapshot => ({
  id: Number(row.id),
  type: row.type,
  source: row.source,
  productName: row.product_name,
  productGroup: row.product_group,
  category: row.category,
  region: row.region,
  buyPrice: row.buy_price === null ? null : Number(row.buy_price),
  sellPrice: row.sell_price === null ? null : Number(row.sell_price),
  spread: row.spread === null ? null : Number(row.spread),
  unit: row.unit,
  effectiveTime: row.effective_time ? new Date(row.effective_time).toISOString() : null,
  adjustmentPeriod: row.adjustment_period,
  crawledAt: new Date(row.crawled_at).toISOString(),
  rawHash: row.raw_hash
});

export class PriceSnapshotRepository {
  constructor(private readonly pool: Pool) {}

  async insertMany(snapshots: PriceSnapshot[]): Promise<number> {
    let inserted = 0;
    for (const snapshot of snapshots) {
      const result = await this.pool.query(`
        INSERT INTO price_snapshots (
          type, source, product_name, product_group, category, region,
          buy_price, sell_price, spread, unit, effective_time, adjustment_period,
          crawled_at, raw_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT(raw_hash) DO NOTHING
      `, [
        snapshot.type,
        snapshot.source,
        snapshot.productName,
        snapshot.productGroup ?? null,
        snapshot.category ?? null,
        snapshot.region ?? null,
        snapshot.buyPrice ?? null,
        snapshot.sellPrice ?? null,
        snapshot.spread ?? null,
        snapshot.unit ?? null,
        snapshot.effectiveTime ?? null,
        snapshot.adjustmentPeriod ?? null,
        snapshot.crawledAt,
        snapshot.rawHash
      ]);
      inserted += result.rowCount ?? 0;
    }
    return inserted;
  }

  async latestByType(type: PriceType): Promise<PriceSnapshot[]> {
    const mockFilter = env.allowMockData ? '' : "AND source NOT ILIKE '%mock%'";
    const result = await this.pool.query(`
      SELECT DISTINCT ON (source, product_name, COALESCE(region, '')) *
      FROM price_snapshots
      WHERE type = $1
        ${mockFilter}
      ORDER BY source, product_name, COALESCE(region, ''), crawled_at DESC, id DESC
    `, [type]);
    return result.rows.map(mapSnapshot).sort((a, b) =>
      [a.category ?? '', a.productGroup ?? '', a.productName, a.region ?? '', a.source].join('|')
        .localeCompare([b.category ?? '', b.productGroup ?? '', b.productName, b.region ?? '', b.source].join('|'))
    );
  }

  async previousSnapshot(snapshot: PriceSnapshot): Promise<PriceSnapshot | undefined> {
    const result = await this.pool.query(`
      SELECT * FROM price_snapshots
      WHERE type = $1 AND source = $2 AND product_name = $3
        AND COALESCE(region, '') = COALESCE($4, '')
        AND raw_hash != $5
      ORDER BY crawled_at DESC, id DESC
      LIMIT 1
    `, [snapshot.type, snapshot.source, snapshot.productName, snapshot.region ?? '', snapshot.rawHash]);
    return result.rows[0] ? mapSnapshot(result.rows[0]) : undefined;
  }

  async insertFuelPeriod(period: FuelAdjustmentPeriod): Promise<boolean> {
    const result = await this.pool.query(`
      INSERT INTO fuel_adjustment_periods (source, effective_time, title, raw_hash, detected_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(raw_hash) DO NOTHING
    `, [period.source, period.effectiveTime, period.title ?? null, period.rawHash, period.detectedAt]);
    return (result.rowCount ?? 0) > 0;
  }
}
