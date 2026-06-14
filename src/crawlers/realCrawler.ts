import axios from 'axios';
import * as cheerio from 'cheerio';
import type { FuelAdjustmentPeriod, PriceSnapshot } from '../types.js';
import { detectFuelGroup, withSnapshotHash } from '../services/normalize.js';
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
  const dateFirst = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  const timeFirst = value.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const match = dateFirst
    ? { day: dateFirst[1], month: dateFirst[2], year: dateFirst[3], hour: dateFirst[4], minute: dateFirst[5], second: dateFirst[6] ?? '0' }
    : timeFirst
      ? { hour: timeFirst[1], minute: timeFirst[2], second: timeFirst[3] ?? '0', day: timeFirst[4], month: timeFirst[5], year: timeFirst[6] }
      : null;
  if (!match) return nowIso();
  const { day, month, year, hour, minute, second } = match;
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
    const [giaVangResult, pnjResult] = await Promise.allSettled([
      this.crawlGoldFromGiaVangOrg(),
      this.crawlGoldFromPnj()
    ]);

    const snapshots = [
      ...(giaVangResult.status === 'fulfilled' ? giaVangResult.value : []),
      ...(pnjResult.status === 'fulfilled' ? pnjResult.value : [])
    ];

    if (snapshots.length === 0) throw new Error('No gold rows parsed from configured sources');
    return snapshots;
  }

  private async crawlGoldFromPnj(): Promise<PriceSnapshot[]> {
    const response = await http.get<PnjGoldResponse>('https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00');
    const crawledAt = nowIso();
    const effectiveTime = parseViDateTime(response.data.updateDate);

    return (response.data.data ?? [])
      .filter((row) => ['SJC', 'N24K'].includes(row.masp ?? ''))
      .map((row) => {
        const buy = toNumber(row.giamua);
        const sell = toNumber(row.giaban);
        const productName = row.masp === 'SJC' ? 'Vàng miếng SJC' : 'Vàng nhẫn 1 chỉ';
        if (!productName || buy === null || sell === null || buy <= 0 || sell <= 0) return null;
        const buyPrice = pnjPriceToVndPerLuong(buy);
        const sellPrice = pnjPriceToVndPerLuong(sell);

        return withSnapshotHash({
          type: 'gold',
          source: 'PNJ API - TP. Hồ Chí Minh',
          productName,
          productGroup: 'PNJ API',
          category: row.masp === 'SJC' ? 'gold_bar' : 'gold_ring',
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

  private async crawlGoldFromGiaVangOrg(): Promise<PriceSnapshot[]> {
    const response = await http.get<string>('https://giavang.org/');
    const crawledAt = nowIso();
    const $ = cheerio.load(response.data);
    const pageText = $.text().replace(/\s+/g, ' ');
    const effectiveTime = parseViDateTime(pageText.match(/Cập nhật lúc\s+(\d{1,2}:\d{2}:\d{2}\s+\d{1,2}\/\d{1,2}\/\d{4})/)?.[1]);

    return [
      ...this.parseGiaVangComparisonTable($, '#gia_vang_sjc', 'Vàng miếng SJC', 'gold_bar', effectiveTime, crawledAt),
      ...this.parseGiaVangComparisonTable($, '#gia_vang_nhan', 'Vàng nhẫn 1 chỉ', 'gold_ring', effectiveTime, crawledAt)
    ];
  }

  private parseGiaVangComparisonTable(
    $: cheerio.CheerioAPI,
    headingSelector: string,
    productName: string,
    category: 'gold_bar' | 'gold_ring',
    effectiveTime: string,
    crawledAt: string
  ): PriceSnapshot[] {
    const table = $(headingSelector).nextAll('table').first();
    const snapshots: PriceSnapshot[] = [];
    let currentRegion = '';

    table.find('tbody tr').each((_, row) => {
      const cells = $(row).find('th,td').map((__, cell) => $(cell).text().replace(/\s+/g, ' ').trim()).get();
      if (cells.length < 3 || cells.some((cell) => cell.includes('https://giavang.org'))) return;

      let system: string;
      let buyRaw: string;
      let sellRaw: string;
      if (cells.length >= 4) {
        currentRegion = cells[0];
        system = cells[1];
        buyRaw = cells[2];
        sellRaw = cells[3];
      } else {
        system = cells[0];
        buyRaw = cells[1];
        sellRaw = cells[2];
      }

      const buy = parseVnd(buyRaw);
      const sell = parseVnd(sellRaw);
      if (!system || buy === null || sell === null || buy <= 0 || sell <= 0) return;
      const buyPrice = buy * 1_000;
      const sellPrice = sell * 1_000;

      snapshots.push(withSnapshotHash({
        type: 'gold',
        source: currentRegion ? `${system} - ${currentRegion}` : system,
        productName,
        productGroup: system,
        category,
        buyPrice,
        sellPrice,
        spread: sellPrice - buyPrice,
        unit: 'VND/lượng',
        effectiveTime,
        crawledAt
      }));
    });

    return snapshots;
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
