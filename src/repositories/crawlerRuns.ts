import type { Pool } from 'pg';
import type { PriceType } from '../types.js';
import { nowIso } from '../utils/time.js';

export class CrawlerRunRepository {
  constructor(private readonly pool: Pool) {}

  async start(source: string, type: PriceType): Promise<number> {
    const result = await this.pool.query(`
      INSERT INTO crawler_runs (source, type, status, started_at)
      VALUES ($1, $2, 'running', $3)
      RETURNING id
    `, [source, type, nowIso()]);
    return Number(result.rows[0].id);
  }

  async finish(id: number, status: 'success' | 'failed', errorMessage?: string): Promise<void> {
    await this.pool.query(`
      UPDATE crawler_runs SET status = $1, finished_at = $2, error_message = $3 WHERE id = $4
    `, [status, nowIso(), errorMessage ?? null, id]);
  }

  async latest(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM crawler_runs ORDER BY started_at DESC LIMIT 10');
    return result.rows;
  }
}
