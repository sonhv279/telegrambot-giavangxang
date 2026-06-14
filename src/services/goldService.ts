import type { GoldBestPrices, GoldCategory, PriceChange, PriceSnapshot } from '../types.js';
import { isTrackedGoldProduct } from './normalize.js';

export const calculatePriceChange = (current: PriceSnapshot, previous?: PriceSnapshot): PriceChange => ({
  buyChange: current.buyPrice !== null && current.buyPrice !== undefined && previous?.buyPrice !== null && previous?.buyPrice !== undefined
    ? current.buyPrice - previous.buyPrice
    : null,
  sellChange: current.sellPrice !== null && current.sellPrice !== undefined && previous?.sellPrice !== null && previous?.sellPrice !== undefined
    ? current.sellPrice - previous.sellPrice
    : null,
  spreadChange: current.spread !== null && current.spread !== undefined && previous?.spread !== null && previous?.spread !== undefined
    ? current.spread - previous.spread
    : null
});

export const getBestGoldPrices = (snapshots: PriceSnapshot[], category: GoldCategory): GoldBestPrices => {
  const items = snapshots.filter((item) => item.type === 'gold' && item.category === category && isTrackedGoldProduct(item.productName));
  const sellCandidates = items.filter((item) => item.sellPrice !== null && item.sellPrice !== undefined);
  const buyCandidates = items.filter((item) => item.buyPrice !== null && item.buyPrice !== undefined);

  return {
    category,
    bestBuy: sellCandidates.sort((a, b) => Number(a.sellPrice) - Number(b.sellPrice))[0],
    bestSell: buyCandidates.sort((a, b) => Number(b.buyPrice) - Number(a.buyPrice))[0]
  };
};

export const shouldAlertGoldChange = (
  change: PriceChange,
  threshold: number,
  spreadThreshold: number
): boolean => {
  const buyChanged = change.buyChange !== null && Math.abs(change.buyChange) >= threshold;
  const sellChanged = change.sellChange !== null && Math.abs(change.sellChange) >= threshold;
  const spreadChanged = change.spreadChange !== null && Math.abs(change.spreadChange) >= spreadThreshold;
  return buyChanged || sellChanged || spreadChanged;
};
