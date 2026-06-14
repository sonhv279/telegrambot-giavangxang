import { describe, expect, it } from 'vitest';
import type { PriceSnapshot } from '../types.js';
import { calculatePriceChange, getBestGoldPrices, shouldAlertGoldChange } from './goldService.js';

const gold = (source: string, buyPrice: number, sellPrice: number): PriceSnapshot => ({
  type: 'gold',
  source,
  productName: `${source} SJC`,
  category: 'gold_bar',
  buyPrice,
  sellPrice,
  spread: sellPrice - buyPrice,
  crawledAt: new Date().toISOString(),
  rawHash: `${source}-${buyPrice}-${sellPrice}`
});

describe('gold service', () => {
  it('calculates best place to buy and sell gold', () => {
    const best = getBestGoldPrices([
      gold('A', 84_000_000, 86_000_000),
      gold('B', 84_500_000, 85_800_000)
    ], 'gold_bar');

    expect(best.bestBuy?.source).toBe('B');
    expect(best.bestSell?.source).toBe('B');
  });

  it('calculates price changes', () => {
    const change = calculatePriceChange(gold('A', 84_300_000, 86_500_000), gold('A', 84_000_000, 86_000_000));
    expect(change.buyChange).toBe(300_000);
    expect(change.sellChange).toBe(500_000);
    expect(change.spreadChange).toBe(200_000);
  });

  it('alerts when threshold is reached', () => {
    expect(shouldAlertGoldChange({ buyChange: 200_000, sellChange: 0, spreadChange: 0 }, 200_000, 300_000)).toBe(true);
    expect(shouldAlertGoldChange({ buyChange: 199_000, sellChange: 0, spreadChange: 0 }, 200_000, 300_000)).toBe(false);
    expect(shouldAlertGoldChange({ buyChange: 0, sellChange: 0, spreadChange: 300_000 }, 200_000, 300_000)).toBe(true);
  });
});
