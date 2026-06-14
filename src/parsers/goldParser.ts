import * as cheerio from 'cheerio';
import type { PriceSnapshot } from '../types.js';
import { detectGoldCategory, withSnapshotHash } from '../services/normalize.js';
import { parseVnd } from '../utils/price.js';

export const parseGoldTable = (html: string, source: string, crawledAt: string): PriceSnapshot[] => {
  const $ = cheerio.load(html);
  const snapshots: PriceSnapshot[] = [];

  $('tr').each((_, row) => {
    const cells = $(row).find('td').map((__, cell) => $(cell).text().trim()).get();
    if (cells.length < 3) return;
    const [productName, buyRaw, sellRaw] = cells;
    const buyPrice = parseVnd(buyRaw);
    const sellPrice = parseVnd(sellRaw);
    if (!productName || buyPrice === null || sellPrice === null) return;

    snapshots.push(withSnapshotHash({
      type: 'gold',
      source,
      productName,
      productGroup: productName.split(/\s+/).slice(0, 2).join(' '),
      category: detectGoldCategory(productName),
      buyPrice,
      sellPrice,
      spread: sellPrice - buyPrice,
      unit: 'VND/lượng',
      effectiveTime: crawledAt,
      crawledAt
    }));
  });

  return snapshots;
};
