/** Platform share of gift price, percent (integer). Fixed in product policy. */
export const GIFT_PLATFORM_CUT_PERCENT = 30;

export type GiftSettlement = {
  priceCoins: number;
  platformCutCoins: number;
  girlEarnedCoins: number;
};

export function computeGiftSettlement(priceCoins: number): GiftSettlement {
  if (priceCoins < 0) {
    throw new RangeError('priceCoins must be >= 0');
  }
  const platformCutCoins = Math.floor(
    (priceCoins * GIFT_PLATFORM_CUT_PERCENT) / 100,
  );
  const girlEarnedCoins = priceCoins - platformCutCoins;
  return { priceCoins, platformCutCoins, girlEarnedCoins };
}
