import type { FuelRegion, GoldCategory, PriceSnapshot } from '../types.js';
import { sha256 } from '../utils/hash.js';

export const detectGoldCategory = (productName: string): GoldCategory => {
  const name = productName.toLowerCase();
  if (name.includes('nhẫn') || name.includes('kim bảo') || name.includes('phúc lộc tài') || name.includes('phượng hoàng') || name.includes('tron tron') || name.includes('tròn trơn')) {
    return 'gold_ring';
  }
  return 'gold_bar';
};

export const detectFuelGroup = (productName: string): string => {
  const normalized = productName.toUpperCase().replace(/\s+/g, ' ');
  if (normalized.includes('RON95') || normalized.includes('RON 95')) return 'RON95';
  if (normalized.includes('E5') || normalized.includes('RON92') || normalized.includes('RON 92')) return 'E5 RON92';
  if (normalized.includes('DIESEL') || normalized.includes('ĐIÊZEN') || /\bDO\b/.test(normalized) || normalized.includes('0,05S') || normalized.includes('0,001S')) return 'Diesel';
  if (normalized.includes('DẦU HỎA') || normalized.includes('DẦU KO') || normalized.includes('KEROSENE')) return 'Dầu hỏa';
  if (normalized.includes('MAZUT')) return 'Mazut';
  return productName;
};

export const detectRegion = (value: string): FuelRegion | null => {
  const normalized = value.toLowerCase();
  if (normalized.includes('vùng 1') || normalized.includes('region 1')) return 'region_1';
  if (normalized.includes('vùng 2') || normalized.includes('region 2')) return 'region_2';
  return null;
};

export const isTrackedGoldProduct = (productName: string): boolean => {
  return getTrackedGoldProductLabel(productName) !== null;
};

export const getTrackedGoldProductLabel = (productName: string): 'Vàng miếng SJC' | 'Vàng nhẫn 1 chỉ' | null => {
  const name = productName.toLowerCase();
  const isGoldBar = name.includes('vàng miếng sjc') || name.includes('vang mieng sjc');
  const isOneChiRing = name.includes('vàng nhẫn 1 chỉ') || name.includes('vang nhan 1 chi') || name.includes('nhẫn sjc 1 chỉ') || name.includes('nhẫn trơn pnj 999.9');
  if (isGoldBar) return 'Vàng miếng SJC';
  if (isOneChiRing) return 'Vàng nhẫn 1 chỉ';
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
