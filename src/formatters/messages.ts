import type { GoldCategory, PriceSnapshot, User } from '../types.js';
import { estimateRegion2Delta, groupFuelByRegion } from '../services/fuelService.js';
import { getBestGoldPrices } from '../services/goldService.js';
import { formatDateTimeVi, formatDateVi } from '../utils/time.js';
import { formatSignedVnd, formatVnd } from '../utils/price.js';
import { isTrackedGoldProduct } from '../services/normalize.js';

const categoryLabel = (category: GoldCategory): string => category === 'gold_bar' ? 'Vàng miếng' : 'Vàng nhẫn';

export const formatGoldList = (snapshots: PriceSnapshot[]): string => {
  const goldSnapshots = snapshots.filter((snapshot) => snapshot.type === 'gold' && isTrackedGoldProduct(snapshot.productName));
  if (goldSnapshots.length === 0) return 'Chưa có dữ liệu giá vàng.';
  const lines = ['🥇 Giá vàng mới nhất', 'Chỉ hiển thị: Vàng miếng SJC và Vàng nhẫn 1 chỉ'];

  for (const productName of ['Vàng miếng SJC', 'Vàng nhẫn 1 chỉ']) {
    const items = goldSnapshots.filter((snapshot) => snapshot.productName === productName);
    if (items.length === 0) continue;
    const bestBuy = [...items].sort((a, b) => Number(a.sellPrice) - Number(b.sellPrice))[0];
    const bestSell = [...items].sort((a, b) => Number(b.buyPrice) - Number(a.buyPrice))[0];
    const latest = [...items].sort((a, b) => b.crawledAt.localeCompare(a.crawledAt))[0];

    lines.push('', productName);
    lines.push(`🏆 Mua tốt nhất: ${bestBuy.source} - ${formatVnd(bestBuy.sellPrice)}`);
    lines.push(`🏆 Bán tốt nhất: ${bestSell.source} - ${formatVnd(bestSell.buyPrice)}`);
    lines.push(`Cập nhật: ${formatDateTimeVi(latest.crawledAt)}`);
  }

  lines.push('', 'Xem so sánh tốt nhất: /gold_best');
  return lines.join('\n');
};

export const formatGoldBest = (snapshots: PriceSnapshot[]): string => {
  const tracked = snapshots.filter((snapshot) => isTrackedGoldProduct(snapshot.productName));
  const lines = ['🏆 Nơi mua/bán vàng tốt nhất'];
  for (const category of ['gold_bar', 'gold_ring'] as GoldCategory[]) {
    const best = getBestGoldPrices(tracked, category);
    const productName = category === 'gold_bar' ? 'Vàng miếng SJC' : 'Vàng nhẫn 1 chỉ';
    lines.push('', productName);
    lines.push(`Mua vàng tốt nhất: ${best.bestBuy ? `${best.bestBuy.source} - ${formatVnd(best.bestBuy.sellPrice)}` : 'N/A'}`);
    lines.push(`Bán vàng tốt nhất: ${best.bestSell ? `${best.bestSell.source} - ${formatVnd(best.bestSell.buyPrice)}` : 'N/A'}`);
  }
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
