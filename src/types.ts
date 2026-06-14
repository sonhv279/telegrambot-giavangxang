export type PriceType = 'gold' | 'fuel';

export type GoldCategory = 'gold_bar' | 'gold_ring';

export type FuelRegion = 'region_1' | 'region_2';

export interface User {
  id: number;
  telegramChatId: string;
  createdAt: string;
  muted: boolean;
  timezone: string;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
}

export interface PriceSnapshot {
  id?: number;
  type: PriceType;
  source: string;
  productName: string;
  productGroup?: string | null;
  category?: GoldCategory | null;
  region?: FuelRegion | null;
  buyPrice?: number | null;
  sellPrice?: number | null;
  spread?: number | null;
  unit?: string | null;
  effectiveTime?: string | null;
  adjustmentPeriod?: string | null;
  crawledAt: string;
  rawHash: string;
}

export interface FuelAdjustmentPeriod {
  id?: number;
  source: string;
  effectiveTime: string;
  title?: string | null;
  rawHash: string;
  detectedAt: string;
}

export interface UserAlertSetting {
  id: number;
  userId: number;
  type: PriceType;
  productFilter?: string | null;
  threshold?: number | null;
  enabled: boolean;
}

export interface GoldBestPrices {
  category: GoldCategory;
  bestBuy?: PriceSnapshot;
  bestSell?: PriceSnapshot;
}

export interface PriceChange {
  buyChange: number | null;
  sellChange: number | null;
  spreadChange: number | null;
}
