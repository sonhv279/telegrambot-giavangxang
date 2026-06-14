import { describe, expect, it } from 'vitest';
import type { PriceSnapshot } from '../types.js';
import { estimateRegion2Delta, groupFuelByRegion } from './fuelService.js';

const fuel = (productName: string, region: 'region_1' | 'region_2', sellPrice: number): PriceSnapshot => ({
  type: 'fuel',
  source: 'test',
  productName,
  productGroup: productName.includes('RON95') ? 'RON95' : productName,
  region,
  sellPrice,
  unit: 'VND/lít',
  crawledAt: new Date().toISOString(),
  rawHash: `${productName}-${region}-${sellPrice}`
});

describe('fuel service', () => {
  it('groups fuel prices by region', () => {
    const grouped = groupFuelByRegion([
      fuel('RON95-III', 'region_1', 20_000),
      fuel('RON95-III', 'region_2', 20_400)
    ]);

    expect(grouped.get('RON95-III')?.region1?.sellPrice).toBe(20_000);
    expect(grouped.get('RON95-III')?.region2?.sellPrice).toBe(20_400);
  });

  it('estimates region 2 delta', () => {
    expect(estimateRegion2Delta([
      fuel('RON95-III', 'region_1', 20_000),
      fuel('RON95-III', 'region_2', 20_400),
      fuel('Diesel', 'region_1', 18_000),
      fuel('Diesel', 'region_2', 18_300)
    ])).toBe(350);
  });
});
