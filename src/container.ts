import { getPool } from './db/connection.js';
import { migrate } from './db/schema.js';
import { UserRepository } from './repositories/users.js';
import { PriceSnapshotRepository } from './repositories/priceSnapshots.js';
import { NotificationRepository } from './repositories/notifications.js';
import { CrawlerRunRepository } from './repositories/crawlerRuns.js';
import { MockCrawler } from './crawlers/mockCrawler.js';
import { AlertService } from './services/alertService.js';

const pool = getPool();
let migrationPromise: Promise<void> | null = null;

export const ensureDatabase = async (): Promise<void> => {
  if (!migrationPromise) migrationPromise = migrate(pool);
  await migrationPromise;
};

export const repositories = {
  users: new UserRepository(pool),
  snapshots: new PriceSnapshotRepository(pool),
  notifications: new NotificationRepository(pool),
  crawlerRuns: new CrawlerRunRepository(pool)
};

export const crawlers = {
  mock: new MockCrawler()
};

export const services = {
  alerts: new AlertService(repositories.users, repositories.snapshots)
};
