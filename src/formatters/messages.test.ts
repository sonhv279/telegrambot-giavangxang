import { describe, expect, it } from 'vitest';
import type { FuelRegion, GoldCategory, PriceSnapshot } from '../types.js';
import { formatDailyDigest, formatGoldBest, formatGoldList } from './messages.js';

const gold = (
  source: string,
  productName: string,
  category: GoldCategory,
  buyPrice: number,
  sellPrice: number,
  crawledAt = '2026-06-15T00:00:00.000Z'
): PriceSnapshot => ({
  type: 'gold',
  source,
  productName,
  category,
  buyPrice,
  sellPrice,
  spread: sellPrice - buyPrice,
  unit: 'VND/lượng',
  effectiveTime: crawledAt,
  crawledAt,
  rawHash: `${source}-${productName}-${buyPrice}-${sellPrice}`
});

const fuel = (
  productName: string,
  region: FuelRegion,
  sellPrice: number,
  crawledAt = '2026-06-15T00:00:00.000Z'
): PriceSnapshot => ({
  type: 'fuel',
  source: 'GiaXangHomNay/Petrolimex',
  productName,
  region,
  sellPrice,
  unit: 'VND/lít',
  effectiveTime: crawledAt,
  crawledAt,
  rawHash: `${productName}-${region}-${sellPrice}`
});

describe('message formatters', () => {
  it('formats PNJ API prices for /gold', () => {
    const message = formatGoldList([
      gold('PNJ - TP. Hồ Chí Minh', 'Vàng miếng SJC', 'gold_bar', 143_000_000, 146_500_000),
      gold('PNJ API - TP. Hồ Chí Minh', 'Vàng miếng SJC', 'gold_bar', 144_000_000, 147_000_000),
      gold('PNJ API - TP. Hồ Chí Minh', 'Vàng nhẫn 1 chỉ', 'gold_ring', 144_000_000, 147_000_000)
    ]);

    expect(message).toContain('Giá vàng PNJ mới nhất');
    expect(message).toContain('Vàng miếng SJC');
    expect(message).toContain('Vàng nhẫn 1 chỉ');
    expect(message).toContain('Bán ra: 147.000.000 đ');
    expect(message).not.toContain('Bán ra: 146.500.000 đ');
  });

  it('formats HCM best prices for gold bar and ring', () => {
    const message = formatGoldBest([
      gold('Mi Hồng - TP. Hồ Chí Minh', 'Vàng miếng SJC', 'gold_bar', 145_500_000, 147_000_000),
      gold('Ngọc Thẩm - TP. Hồ Chí Minh', 'Vàng miếng SJC', 'gold_bar', 143_000_000, 146_500_000),
      gold('Mi Hồng - TP. Hồ Chí Minh', 'Vàng nhẫn 1 chỉ', 'gold_ring', 145_500_000, 147_000_000),
      gold('Ngọc Thẩm - TP. Hồ Chí Minh', 'Vàng nhẫn 1 chỉ', 'gold_ring', 140_000_000, 143_500_000),
      gold('PNJ API - TP. Hồ Chí Minh', 'Vàng nhẫn 1 chỉ', 'gold_ring', 144_000_000, 147_000_000)
    ]);

    expect(message).toContain('Nơi mua/bán vàng tốt nhất TPHCM');
    expect(message).toContain('Vàng miếng SJC');
    expect(message).toContain('Vàng nhẫn 1 chỉ');
    expect(message).toContain('Mua vàng tốt nhất (giá bán thấp nhất): Ngọc Thẩm - 146.500.000 đ');
    expect(message).toContain('Mua vàng tốt nhất (giá bán thấp nhất): Ngọc Thẩm - 143.500.000 đ');
    expect(message).toContain('Bán vàng tốt nhất (giá mua cao nhất): Mi Hồng - 145.500.000 đ');
    expect(message).not.toContain('PNJ API:');
  });

  it('omits missing gold categories in best-price sections', () => {
    const message = formatGoldBest([
      gold('Mi Hồng - TP. Hồ Chí Minh', 'Vàng miếng SJC', 'gold_bar', 145_500_000, 147_000_000),
      gold('Ngọc Thẩm - TP. Hồ Chí Minh', 'Vàng miếng SJC', 'gold_bar', 143_000_000, 146_500_000)
    ]);

    expect(message).toContain('Vàng miếng SJC');
    expect(message).not.toContain('Vàng nhẫn 1 chỉ');
    expect(message).not.toContain('N/A');
  });

  it('formats a compact daily digest', () => {
    const message = formatDailyDigest([
      gold('Bảo Tín Mạnh Hải - Bắc Ninh', 'Vàng miếng SJC', 'gold_bar', 148_000_000, 150_500_000),
      gold('Bảo Tín Mạnh Hải - Bắc Ninh', 'Vàng nhẫn 1 chỉ', 'gold_ring', 148_000_000, 150_500_000),
      gold('Mi Hồng - TP. Hồ Chí Minh', 'Vàng miếng SJC', 'gold_bar', 149_000_000, 150_500_000),
      gold('Ngọc Thẩm - TP. Hồ Chí Minh', 'Vàng miếng SJC', 'gold_bar', 147_000_000, 150_000_000),
      gold('Mi Hồng - TP. Hồ Chí Minh', 'Vàng nhẫn 1 chỉ', 'gold_ring', 149_000_000, 150_500_000),
      gold('Ngọc Thẩm - TP. Hồ Chí Minh', 'Vàng nhẫn 1 chỉ', 'gold_ring', 142_500_000, 146_000_000)
    ], [
      fuel('Xăng E5 RON 92-II', 'region_1', 21_330),
      fuel('Xăng E5 RON 92-II', 'region_2', 21_760)
    ]);

    expect(message).toContain('🥇 GIÁ VÀNG');
    expect(message).toContain('Vàng miếng SJC:\n- Giá mua: 148.000.000 đ\n- Giá bán: 150.500.000 đ');
    expect(message).toContain('🏆 Nơi mua/bán vàng tốt nhất TPHCM');
    expect(message).toContain('- Mua vàng tốt nhất (giá bán thấp nhất): Ngọc Thẩm - 150.000.000 đ');
    expect(message).toContain('Xăng E5 RON 92-II:\n- Vùng 1: 21.330 đ\n- Vùng 2: 21.760 đ');
    expect(message).not.toContain('Bảng giá TPHCM');
    expect(message).not.toContain('📡 Nguồn:');
    expect(message).not.toContain('Vùng 2 cao hơn/thấp hơn');
  });
});
