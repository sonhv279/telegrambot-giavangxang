import axios from 'axios';
import * as cheerio from 'cheerio';
import type { FuelAdjustmentPeriod, PriceSnapshot } from '../types.js';
import { detectFuelGroup, detectGoldCategory, withSnapshotHash } from '../services/normalize.js';
import { parseVnd } from '../utils/price.js';
import { nowIso } from '../utils/time.js';
import { sha256 } from '../utils/hash.js';

interface PnjGoldRow {
  masp?: string;
  tensp?: string;
  giamua?: number | string;
  giaban?: number | string;
}

interface PnjGoldResponse {
  data?: PnjGoldRow[];
  updateDate?: string;
}

const http = axios.create({
  timeout: 15_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; GiaVangXangBot/0.1; +https://bot-vangxang.vercel.app)'
  }
});

const parseViDateTime = (value?: string): string => {
  if (!value) return nowIso();
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (!match) return nowIso();
  const [, day, month, year, hour, minute, second = '0'] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 7, Number(minute), Number(second))).toISOString();
};

const toNumber = (value: number | string | undefined): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return parseVnd(value);
  return null;
};

const pnjPriceToVndPerLuong = (value: number): number => value * 10_000;

export class RealCrawler {
  async crawlGold(): Promise<PriceSnapshot[]> {
    const response = await http.get<PnjGoldResponse>('https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00');
    const crawledAt = nowIso();
    const effectiveTime = parseViDateTime(response.data.updateDate);

    return (response.data.data ?? [])
      .map((row) => {
        const buy = toNumber(row.giamua);
        const sell = toNumber(row.giaban);
        const productName = row.tensp?.trim();
        if (!productName || buy === null || sell === null || buy <= 0 || sell <= 0) return null;
        const buyPrice = pnjPriceToVndPerLuong(buy);
        const sellPrice = pnjPriceToVndPerLuong(sell);

        return withSnapshotHash({
          type: 'gold',
          source: 'PNJ',
          productName,
          productGroup: row.masp || productName,
          category: detectGoldCategory(productName),
          buyPrice,
          sellPrice,
          spread: sellPrice - buyPrice,
          unit: 'VND/lượng',
          effectiveTime,
          crawledAt
        });
      })
      .filter((item): item is PriceSnapshot => Boolean(item));
  }

  async crawlFuel(): Promise<{ snapshots: PriceSnapshot[]; period: FuelAdjustmentPeriod }> {
    const response = await http.get<string>('https://giaxanghomnay.com');
    const crawledAt = nowIso();
    const $ = cheerio.load(response.data);
    const pageText = $.text().replace(/\s+/g, ' ');
    const effectiveTime = parseViDateTime(pageText.match(/Cập nhật[^0-9]*(\d{1,2}:\d{2}:\d{2}\s+\d{1,2}\/\d{1,2}\/\d{4})/)?.[1]);
    const adjustmentPeriod = pageText.match(/Ngày\s+(\d{1,2}\/\d{1,2}\/\d{4})/)?.[0] ?? `Cập nhật ${effectiveTime}`;
    const snapshots: PriceSnapshot[] = [];

    $('table.table-petro tbody tr').each((_, row) => {
      const cells = $(row).find('td').map((__, cell) => $(cell).text().replace(/\s+/g, ' ').trim()).get();
      if (cells.length < 5) return;
      const productName = cells[0];
      const region1Price = parseVnd(cells[3]);
      const region2Price = parseVnd(cells[4]);
      if (!productName || region1Price === null || region2Price === null) return;
      const productGroup = detectFuelGroup(productName);

      snapshots.push(withSnapshotHash({
        type: 'fuel',
        source: 'GiaXangHomNay/Petrolimex',
        productName,
        productGroup,
        region: 'region_1',
        sellPrice: region1Price,
        unit: productGroup === 'Mazut' ? 'VND/kg' : 'VND/lít',
        effectiveTime,
        adjustmentPeriod,
        crawledAt
      }));

      snapshots.push(withSnapshotHash({
        type: 'fuel',
        source: 'GiaXangHomNay/Petrolimex',
        productName,
        productGroup,
        region: 'region_2',
        sellPrice: region2Price,
        unit: productGroup === 'Mazut' ? 'VND/kg' : 'VND/lít',
        effectiveTime,
        adjustmentPeriod,
        crawledAt
      }));
    });

    if (snapshots.length === 0) throw new Error('No fuel rows parsed from GiaXangHomNay');

    return {
      snapshots,
      period: {
        source: 'GiaXangHomNay/Petrolimex',
        effectiveTime,
        title: adjustmentPeriod,
        rawHash: sha256(`fuel-period|${effectiveTime}|${snapshots.map((item) => item.rawHash).join('|')}`),
        detectedAt: crawledAt
      }
    };
  }
}
