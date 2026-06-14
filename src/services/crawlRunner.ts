import { crawlers, repositories, services } from '../container.js';
import { logger } from '../logger/index.js';
import type { PriceSnapshot } from '../types.js';

export const runGoldCrawl = async (): Promise<PriceSnapshot[]> => {
    const runId = await repositories.crawlerRuns.start('mock', 'gold');
  try {
    const snapshots = await crawlers.mock.crawlGold();
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
  const runId = await repositories.crawlerRuns.start('mock', 'fuel');
  try {
    const result = await crawlers.mock.crawlFuel();
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
