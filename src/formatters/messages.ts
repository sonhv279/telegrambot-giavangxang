import type { GoldCategory, PriceChange, PriceSnapshot, User } from '../types.js';
import { estimateRegion2Delta, groupFuelByRegion } from '../services/fuelService.js';
import { calculatePriceChange, getBestGoldPrices } from '../services/goldService.js';
import { formatDateTimeVi, formatDateVi } from '../utils/time.js';
import { formatSignedVnd, formatVnd } from '../utils/price.js';
import { getTrackedGoldProductLabel, isTrackedGoldProduct } from '../services/normalize.js';

const categoryLabel = (category: GoldCategory): string => category === 'gold_bar' ? 'Vàng miếng' : 'Vàng nhẫn';

export const goldSnapshotKey = (snapshot: PriceSnapshot): string => [snapshot.source, snapshot.productName, snapshot.region ?? ''].join('|');

const goldSourceName = (source: string): string => source.split(' - ')[0].replace(/ API$/i, '');

const isPnjApiGold = (snapshot: PriceSnapshot): boolean =>
  snapshot.type === 'gold' && snapshot.source.startsWith('PNJ API -') && getTrackedGoldProductLabel(snapshot.productName) !== null;

const isPnjFallbackGold = (snapshot: PriceSnapshot): boolean =>
  snapshot.type === 'gold' && snapshot.source === 'PNJ - TP. Hồ Chí Minh' && getTrackedGoldProductLabel(snapshot.productName) !== null;

const isHoChiMinhGiaVangGold = (snapshot: PriceSnapshot): boolean =>
  snapshot.type === 'gold'
  && snapshot.source.includes('TP. Hồ Chí Minh')
  && !snapshot.source.startsWith('PNJ API -')
  && getTrackedGoldProductLabel(snapshot.productName) !== null;

const formatGoldChange = (change: PriceChange): string => {
  if (change.buyChange === null && change.sellChange === null && change.spreadChange === null) return 'Biến động: Chưa đủ dữ liệu so sánh';
  return [
    `Biến động mua: ${formatSignedVnd(change.buyChange)}`,
    `Biến động bán: ${formatSignedVnd(change.sellChange)}`,
    `Biến động spread: ${formatSignedVnd(change.spreadChange)}`
  ].join('\n');
};

export const formatGoldList = (snapshots: PriceSnapshot[], previousByKey = new Map<string, PriceSnapshot | undefined>()): string => {
  const pnjApi = snapshots.filter(isPnjApiGold);
  const goldSnapshots = pnjApi.length > 0 ? pnjApi : snapshots.filter(isPnjFallbackGold);
  if (goldSnapshots.length === 0) return 'Chưa có dữ liệu giá vàng PNJ.';
  const lines = ['🥇 Giá vàng PNJ mới nhất', 'Đơn vị: VND/lượng', 'Chỉ hiển thị: Vàng miếng SJC và Vàng nhẫn 1 chỉ'];

  for (const productName of ['Vàng miếng SJC', 'Vàng nhẫn 1 chỉ']) {
    const items = goldSnapshots
      .filter((snapshot) => getTrackedGoldProductLabel(snapshot.productName) === productName)
      .sort((a, b) => b.crawledAt.localeCompare(a.crawledAt));
    if (items.length === 0) continue;
    const latest = items[0];
    const previous = previousByKey.get(goldSnapshotKey(latest));
    const change = calculatePriceChange(latest, previous);

    lines.push('', productName);
    lines.push(`Nguồn: ${goldSourceName(latest.source)} - TP. Hồ Chí Minh`);
    lines.push(`Mua vào: ${formatVnd(latest.buyPrice)}`);
    lines.push(`Bán ra: ${formatVnd(latest.sellPrice)}`);
    lines.push(`Spread: ${formatVnd(latest.spread)}`);
    lines.push(formatGoldChange(change));
    lines.push(`Cập nhật: ${formatDateTimeVi(latest.effectiveTime ?? latest.crawledAt)}`);
  }

  lines.push('', 'Xem so sánh tốt nhất: /gold_best');
  return lines.join('\n');
};

export const formatGoldBest = (snapshots: PriceSnapshot[]): string => {
  const tracked = snapshots.filter(isHoChiMinhGiaVangGold);
  if (tracked.length === 0) return 'Chưa có dữ liệu so sánh giá vàng tại TP. Hồ Chí Minh.';
  const lines = ['🏆 Nơi mua/bán vàng tốt nhất TPHCM', 'Đơn vị: VND/lượng'];
  for (const category of ['gold_bar', 'gold_ring'] as GoldCategory[]) {
    const best = getBestGoldPrices(tracked, category);
    const productName = category === 'gold_bar' ? 'Vàng miếng SJC' : 'Vàng nhẫn 1 chỉ';
    const items = tracked
      .filter((snapshot) => snapshot.category === category)
      .sort((a, b) => goldSourceName(a.source).localeCompare(goldSourceName(b.source), 'vi'));
    lines.push('', productName);
    lines.push(`Mua vàng tốt nhất (giá bán thấp nhất): ${best.bestBuy ? `${goldSourceName(best.bestBuy.source)} - ${formatVnd(best.bestBuy.sellPrice)}` : 'N/A'}`);
    lines.push(`Bán vàng tốt nhất (giá mua cao nhất): ${best.bestSell ? `${goldSourceName(best.bestSell.source)} - ${formatVnd(best.bestSell.buyPrice)}` : 'N/A'}`);
    lines.push('Bảng giá TPHCM:');
    for (const item of items) {
      lines.push(`${goldSourceName(item.source)}: mua ${formatVnd(item.buyPrice)} / bán ${formatVnd(item.sellPrice)}`);
    }
  }
  const latest = [...tracked].sort((a, b) => b.crawledAt.localeCompare(a.crawledAt))[0];
  lines.push('', `Cập nhật: ${formatDateTimeVi(latest.effectiveTime ?? latest.crawledAt)}`);
  return lines.join('\n');
};

export const formatFuelList = (snapshots: PriceSnapshot[]): string => {
  if (snapshots.length === 0) return 'Chưa có dữ liệu giá xăng dầu.';
  const groups = groupFuelByRegion(snapshots);
  const lines = ['⛽ Giá xăng dầu mới nhất'];
  for (const [name, group] of groups) {
    lines.push('', name, `Vùng 1: ${formatVnd(group.region1?.sellPrice)}`, `Vùng 2: ${formatVnd(group.region2?.sellPrice)}`);
  }
  const latest = snapshots[0];
  lines.push('', `Kỳ điều hành: ${latest?.adjustmentPeriod ?? 'Chưa rõ'}`);
  lines.push(`Hiệu lực: ${formatDateTimeVi(latest?.effectiveTime)}`);
  return lines.join('\n');
};

export const formatGoldAlert = (snapshot: PriceSnapshot): string => [
  '⚡ Giá vàng thay đổi',
  '',
  `Loại: ${categoryLabel(snapshot.category as GoldCategory)}`,
  `Sản phẩm: ${snapshot.productName}`,
  `Nguồn: ${snapshot.source}`,
  `Mua: ${formatVnd(snapshot.buyPrice)}`,
  `Bán: ${formatVnd(snapshot.sellPrice)}`,
  `Spread: ${formatVnd(snapshot.spread)}`,
  `Cập nhật: ${formatDateTimeVi(snapshot.crawledAt)}`
].join('\n');

export const formatFuelAlert = (snapshots: PriceSnapshot[]): string => ['⛽ Có bảng giá xăng dầu mới', '', formatFuelList(snapshots)].join('\n');

export const formatDailyDigest = (gold: PriceSnapshot[], fuel: PriceSnapshot[], _user?: User): string => {
  const trackedGold = gold.filter((item) => isTrackedGoldProduct(item.productName));
  const goldBar = trackedGold.filter((item) => item.category === 'gold_bar');
  const goldRing = trackedGold.filter((item) => item.category === 'gold_ring');
  const fuelRegion2Delta = estimateRegion2Delta(fuel);
  const lines = [
    '📊 BẢN TIN THỊ TRƯỜNG SÁNG',
    `📅 ${formatDateVi()} - 09:00`,
    '',
    '━━━━━━━━━━━━━━',
    '',
    '🥇 VÀNG MIẾNG',
    goldBar[0] ? `${goldBar[0].source} ${goldBar[0].productName}\nMua: ${formatVnd(goldBar[0].buyPrice)}\nBán: ${formatVnd(goldBar[0].sellPrice)}\nBiến động: Chưa đủ dữ liệu so sánh` : 'Chưa có dữ liệu',
    formatGoldBest(goldBar),
    '',
    '━━━━━━━━━━━━━━',
    '',
    '💍 VÀNG NHẪN',
    goldRing[0] ? `${goldRing[0].source} ${goldRing[0].productName}\nMua: ${formatVnd(goldRing[0].buyPrice)}\nBán: ${formatVnd(goldRing[0].sellPrice)}\nBiến động: Chưa đủ dữ liệu so sánh` : 'Chưa có dữ liệu',
    formatGoldBest(goldRing),
    '',
    '━━━━━━━━━━━━━━',
    '',
    '⛽ XĂNG DẦU (VÙNG 1)'
  ];

  const fuelGroups = groupFuelByRegion(fuel);
  let visible = 0;
  for (const [name, group] of fuelGroups) {
    if (visible >= 7) continue;
    lines.push(`${name}: ${formatVnd(group.region1?.sellPrice)}`);
    visible += 1;
  }
  if (fuelGroups.size > visible) lines.push(`Còn ${fuelGroups.size - visible} sản phẩm khác`);
  if (fuelRegion2Delta !== null) lines.push(`Vùng 2 cao hơn/thấp hơn Vùng 1 khoảng ${formatSignedVnd(fuelRegion2Delta)}`);
  lines.push('Chi tiết xem: /fuel');
  lines.push('', '━━━━━━━━━━━━━━', '', '⚡ ĐIỂM NHẤN', 'Theo dõi /gold_best để xem nơi mua/bán tốt nhất.', '', `🕒 Dữ liệu cập nhật: ${formatDateTimeVi(gold[0]?.crawledAt ?? fuel[0]?.crawledAt)}`, `📡 Nguồn: ${[...new Set([...gold, ...fuel].map((item) => item.source))].join(', ') || 'N/A'}`);
  return lines.join('\n');
};
