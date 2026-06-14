import { env } from '../config/env.js';
import type { PriceSnapshot, User } from '../types.js';
import { calculatePriceChange, shouldAlertGoldChange } from './goldService.js';
import type { PriceSnapshotRepository } from '../repositories/priceSnapshots.js';
import type { UserRepository } from '../repositories/users.js';

export interface GoldAlertCandidate {
  user: User;
  snapshot: PriceSnapshot;
  notificationType: string;
}

export class AlertService {
  constructor(
    private readonly users: UserRepository,
    private readonly snapshots: PriceSnapshotRepository
  ) {}

  async buildGoldAlertCandidates(newSnapshots: PriceSnapshot[]): Promise<GoldAlertCandidate[]> {
    const activeUsers = await this.users.listActiveUsers();
    const candidates: GoldAlertCandidate[] = [];

    for (const snapshot of newSnapshots.filter((item) => item.type === 'gold')) {
      const previous = await this.snapshots.previousSnapshot(snapshot);
      if (!previous) continue;
      const change = calculatePriceChange(snapshot, previous);

      for (const user of activeUsers) {
        const threshold = await this.users.getGoldThreshold(user.id);
        if (shouldAlertGoldChange(change, threshold, env.goldSpreadThreshold)) {
          candidates.push({ user, snapshot, notificationType: 'gold_price_change' });
        }
      }
    }

    return candidates;
  }
}
