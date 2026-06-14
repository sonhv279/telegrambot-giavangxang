import type { FuelAdjustmentPeriod, PriceSnapshot } from '../types.js';
import { nowIso } from '../utils/time.js';
import { sha256 } from '../utils/hash.js';
import { withSnapshotHash } from '../services/normalize.js';

export class MockCrawler {
  async crawlGold(): Promise<PriceSnapshot[]> {
    const crawledAt = nowIso();
    const effectiveTime = crawledAt;
    return [
      withSnapshotHash({
        type: 'gold',
        source: 'SJC Mock',
        productName: 'SJC 1 lượng',
        productGroup: 'SJC',
        category: 'gold_bar',
        buyPrice: 84_800_000,
        sellPrice: 86_800_000,
        spread: 2_000_000,
        unit: 'VND/lượng',
        effectiveTime,
        crawledAt
      }),
      withSnapshotHash({
        type: 'gold',
        source: 'PNJ Mock',
        productName: 'PNJ Nhẫn 9999',
        productGroup: 'PNJ 9999',
        category: 'gold_ring',
        buyPrice: 83_900_000,
        sellPrice: 85_200_000,
        spread: 1_300_000,
        unit: 'VND/lượng',
        effectiveTime,
        crawledAt
      }),
      withSnapshotHash({
        type: 'gold',
        source: 'DOJI Mock',
        productName: 'DOJI Nhẫn tròn trơn 9999',
        productGroup: 'DOJI 9999',
        category: 'gold_ring',
        buyPrice: 84_000_000,
        sellPrice: 85_100_000,
        spread: 1_100_000,
        unit: 'VND/lượng',
        effectiveTime,
        crawledAt
      })
    ];
  }

  async crawlFuel(): Promise<{ snapshots: PriceSnapshot[]; period: FuelAdjustmentPeriod }> {
    const crawledAt = nowIso();
    const effectiveTime = '2026-06-12T15:00:00.000Z';
    const adjustmentPeriod = 'Kỳ điều hành mock 12/06/2026';
    const rows = [
      ['E5 RON92', 'E5 RON92', 19_460, 19_840],
      ['RON95-III', 'RON95', 20_090, 20_490],
      ['RON95-IV', 'RON95', 20_230, 20_630],
      ['RON95-V', 'RON95', 20_420, 20_820],
      ['Diesel 0.05S', 'Diesel', 18_230, 18_590],
      ['Dầu hỏa', 'Dầu hỏa', 18_050, 18_410],
      ['Mazut 180CST', 'Mazut', 15_530, 15_840]
    ] as const;

    const snapshots = rows.flatMap(([productName, productGroup, region1Price, region2Price]) => [
      withSnapshotHash({
        type: 'fuel',
        source: 'Petrolimex Mock',
        productName,
        productGroup,
        region: 'region_1',
        sellPrice: region1Price,
        unit: 'VND/lít',
        effectiveTime,
        adjustmentPeriod,
        crawledAt
      }),
      withSnapshotHash({
        type: 'fuel',
        source: 'Petrolimex Mock',
        productName,
        productGroup,
        region: 'region_2',
        sellPrice: region2Price,
        unit: 'VND/lít',
        effectiveTime,
        adjustmentPeriod,
        crawledAt
      })
    ]);

    return {
      snapshots,
      period: {
        source: 'Petrolimex Mock',
        effectiveTime,
        title: adjustmentPeriod,
        rawHash: sha256(`fuel-period|${effectiveTime}|${adjustmentPeriod}`),
        detectedAt: crawledAt
      }
    };
  }
}
