import * as cheerio from 'cheerio';
import type { PriceSnapshot } from '../types.js';
import { detectFuelGroup, detectRegion, withSnapshotHash } from '../services/normalize.js';
import { parseVnd } from '../utils/price.js';

export const parseFuelTable = (
  html: string,
  source: string,
  crawledAt: string,
  effectiveTime: string,
  adjustmentPeriod: string
): PriceSnapshot[] => {
  const $ = cheerio.load(html);
  const snapshots: PriceSnapshot[] = [];

  $('tr').each((_, row) => {
    const cells = $(row).find('td').map((__, cell) => $(cell).text().trim()).get();
    if (cells.length < 3) return;

    const productName = cells[0];
    const productGroup = detectFuelGroup(productName);
    if (!productName) return;

    if (cells.length >= 3 && !detectRegion(cells[1])) {
      const region1Price = parseVnd(cells[1]);
      const region2Price = parseVnd(cells[2]);
      if (region1Price !== null) snapshots.push(buildFuel(source, productName, productGroup, 'region_1', region1Price, crawledAt, effectiveTime, adjustmentPeriod));
      if (region2Price !== null) snapshots.push(buildFuel(source, productName, productGroup, 'region_2', region2Price, crawledAt, effectiveTime, adjustmentPeriod));
      return;
    }

    const region = detectRegion(cells[1]);
    const sellPrice = parseVnd(cells[2]);
    if (region && sellPrice !== null) {
      snapshots.push(buildFuel(source, productName, productGroup, region, sellPrice, crawledAt, effectiveTime, adjustmentPeriod));
    }
  });

  return snapshots;
};

const buildFuel = (
  source: string,
  productName: string,
  productGroup: string,
  region: 'region_1' | 'region_2',
  sellPrice: number,
  crawledAt: string,
  effectiveTime: string,
  adjustmentPeriod: string
): PriceSnapshot => withSnapshotHash({
  type: 'fuel',
  source,
  productName,
  productGroup,
  region,
  sellPrice,
  unit: productGroup === 'Mazut' ? 'VND/kg' : 'VND/lít',
  effectiveTime,
  adjustmentPeriod,
  crawledAt
});
