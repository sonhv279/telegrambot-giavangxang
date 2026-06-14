import type { PriceSnapshot } from '../types.js';

export const groupFuelByRegion = (snapshots: PriceSnapshot[]): Map<string, { region1?: PriceSnapshot; region2?: PriceSnapshot }> => {
  const result = new Map<string, { region1?: PriceSnapshot; region2?: PriceSnapshot }>();
  for (const snapshot of snapshots.filter((item) => item.type === 'fuel')) {
    const key = snapshot.productName;
    const current = result.get(key) ?? {};
    if (snapshot.region === 'region_1') current.region1 = snapshot;
    if (snapshot.region === 'region_2') current.region2 = snapshot;
    result.set(key, current);
  }
  return result;
};

export const estimateRegion2Delta = (snapshots: PriceSnapshot[]): number | null => {
  const groups = groupFuelByRegion(snapshots);
  const deltas: number[] = [];
  for (const group of groups.values()) {
    if (group.region1?.sellPrice !== undefined && group.region1.sellPrice !== null && group.region2?.sellPrice !== undefined && group.region2.sellPrice !== null) {
      deltas.push(group.region2.sellPrice - group.region1.sellPrice);
    }
  }
  if (deltas.length === 0) return null;
  return Math.round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length);
};
