import type { FuelRegion, GoldCategory, PriceSnapshot } from '../types.js';
import { sha256 } from '../utils/hash.js';

export const detectGoldCategory = (productName: string): GoldCategory => {
  const name = productName.toLowerCase();
  if (name.includes('nhẫn') || name.includes('9999') || name.includes('tron tron') || name.includes('tròn trơn')) {
    return 'gold_ring';
  }
  return 'gold_bar';
};

export const detectFuelGroup = (productName: string): string => {
  const normalized = productName.toUpperCase().replace(/\s+/g, ' ');
  if (normalized.includes('RON95') || normalized.includes('RON 95')) return 'RON95';
  if (normalized.includes('E5') || normalized.includes('RON92') || normalized.includes('RON 92')) return 'E5 RON92';
  if (normalized.includes('DIESEL') || normalized.includes('ĐIÊZEN')) return 'Diesel';
  if (normalized.includes('DẦU HỎA') || normalized.includes('KEROSENE')) return 'Dầu hỏa';
  if (normalized.includes('MAZUT')) return 'Mazut';
  return productName;
};

export const detectRegion = (value: string): FuelRegion | null => {
  const normalized = value.toLowerCase();
  if (normalized.includes('vùng 1') || normalized.includes('region 1')) return 'region_1';
  if (normalized.includes('vùng 2') || normalized.includes('region 2')) return 'region_2';
  return null;
};

export const withSnapshotHash = (snapshot: Omit<PriceSnapshot, 'rawHash'>): PriceSnapshot => {
  const rawHash = sha256([
    snapshot.type,
    snapshot.source,
    snapshot.productName,
    snapshot.productGroup ?? '',
    snapshot.category ?? '',
    snapshot.region ?? '',
    snapshot.buyPrice ?? '',
    snapshot.sellPrice ?? '',
    snapshot.effectiveTime ?? '',
    snapshot.adjustmentPeriod ?? ''
  ].join('|'));
  return { ...snapshot, rawHash };
};
