import { crawlers, repositories, services } from '../container.js';
import { env } from '../config/env.js';
import { logger } from '../logger/index.js';
import type { PriceSnapshot } from '../types.js';

export const runGoldCrawl = async (): Promise<PriceSnapshot[]> => {
  const runId = await repositories.crawlerRuns.start(env.allowMockData ? 'mock' : 'real', 'gold');
  try {
    const snapshots = env.allowMockData ? await crawlers.mock.crawlGold() : await crawlers.real.crawlGold();
    await repositories.snapshots.insertMany(snapshots);
    await repositories.crawlerRuns.finish(runId, 'success');
    return snapshots;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await repositories.crawlerRuns.finish(runId, 'failed', message);
    logger.error({ error }, 'gold crawl failed');
    return [];
  }
};

export const runFuelCrawl = async (): Promise<{ snapshots: PriceSnapshot[]; isNewPeriod: boolean }> => {
  const runId = await repositories.crawlerRuns.start(env.allowMockData ? 'mock' : 'real', 'fuel');
  try {
    const result = env.allowMockData ? await crawlers.mock.crawlFuel() : await crawlers.real.crawlFuel();
    await repositories.snapshots.insertMany(result.snapshots);
    const isNewPeriod = await repositories.snapshots.insertFuelPeriod(result.period);
    await repositories.crawlerRuns.finish(runId, 'success');
    return { snapshots: result.snapshots, isNewPeriod };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await repositories.crawlerRuns.finish(runId, 'failed', message);
    logger.error({ error }, 'fuel crawl failed');
    return { snapshots: [], isNewPeriod: false };
  }
};

export const buildGoldAlerts = (snapshots: PriceSnapshot[]) => services.alerts.buildGoldAlertCandidates(snapshots);
