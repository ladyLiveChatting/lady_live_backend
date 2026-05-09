/**
 * Live-call coin billing: girl base rate, boy-facing boost, per-minute ceil billing,
 * gross → company share → girl net. Mirrors Dart in meet_connect_shared.
 */

/** Fixed in product policy — not configurable via API. */
export const BOYS_VISIBLE_RATE_MULTIPLIER = 1.2;

/** Company share of girl gross, percent (integer). Fixed in product policy. */
export const COMPANY_DEDUCTION_FROM_GIRL_GROSS_PERCENT = 10;

/**
 * Calls shorter than this many whole seconds use the “short call” path:
 * girl earns 0, girl pays a fixed wallet penalty, company takes % of boy’s payment.
 */
export const SHORT_CALL_MAX_DURATION_SECONDS_EXCLUSIVE = 30;

/** Fixed penalty (coins) deducted from the girl’s wallet on short calls. */
export const GIRL_SHORT_CALL_PENALTY_COINS = 100;

/** On short calls: company profit = floor(boysDeductedCoins × this ÷ 100). */
export const COMPANY_SHARE_OF_BOY_PAYMENT_SHORT_CALL_PERCENT = 10;

/**
 * How many coins equal ₹1. Business rule: 100 coins = ₹10 → 10 coins per rupee.
 * Rupees from coins: coins / COINS_PER_RUPEE.
 */
export const COINS_PER_RUPEE = 10;

export type CallCoinBillingInput = {
  girlBaseCoinsPerMinute: number;
  durationSeconds: number;
};

export type CallCoinBillingResult = {
  girlBaseCoinsPerMinute: number;
  boysVisibleCoinsPerMinute: number;
  callDurationSeconds: number;
  chargedMinutes: number;
  boysDeductedCoins: number;
  girlsGrossCoins: number;
  companyDeductionCoins: number;
  girlsFinalCoins: number;
  companyProfitCoins: number;
  companyProfitRupees: number;
  /** True when `durationSeconds < SHORT_CALL_MAX_DURATION_SECONDS_EXCLUSIVE`. */
  isShortCall: boolean;
  /** Coins to deduct from girl wallet when [isShortCall] (policy constant). */
  girlShortCallPenaltyCoins: number;
};

export function computeBoysVisibleCoinsPerMinute(
  girlBaseCoinsPerMinute: number,
): number {
  if (girlBaseCoinsPerMinute < 0) {
    throw new RangeError('girlBaseCoinsPerMinute must be >= 0');
  }
  return Math.round(girlBaseCoinsPerMinute * BOYS_VISIBLE_RATE_MULTIPLIER);
}

/**
 * Billable minutes: round up to the next full minute, minimum 1 minute when duration >= 0.
 * Examples: 62s → 2; 130s → 3; 0s → 1.
 */
export function computeChargedMinutes(durationSeconds: number): number {
  if (durationSeconds < 0) {
    throw new RangeError('durationSeconds must be >= 0');
  }
  return Math.max(1, Math.ceil(durationSeconds / 60));
}

export function computeCallCoinBilling(
  input: CallCoinBillingInput,
): CallCoinBillingResult {
  const { girlBaseCoinsPerMinute, durationSeconds } = input;
  if (girlBaseCoinsPerMinute < 0) {
    throw new RangeError('girlBaseCoinsPerMinute must be >= 0');
  }
  if (durationSeconds < 0) {
    throw new RangeError('durationSeconds must be >= 0');
  }

  const boysVisibleCoinsPerMinute = computeBoysVisibleCoinsPerMinute(
    girlBaseCoinsPerMinute,
  );
  const chargedMinutes = computeChargedMinutes(durationSeconds);
  const boysDeductedCoins = boysVisibleCoinsPerMinute * chargedMinutes;

  const isShortCall =
    durationSeconds < SHORT_CALL_MAX_DURATION_SECONDS_EXCLUSIVE;

  if (isShortCall) {
    const companyDeductionCoins = Math.floor(
      (boysDeductedCoins * COMPANY_SHARE_OF_BOY_PAYMENT_SHORT_CALL_PERCENT) /
        100,
    );
    const companyProfitCoins = companyDeductionCoins;
    const companyProfitRupees = companyProfitCoins / COINS_PER_RUPEE;
    return {
      girlBaseCoinsPerMinute,
      boysVisibleCoinsPerMinute,
      callDurationSeconds: durationSeconds,
      chargedMinutes,
      boysDeductedCoins,
      girlsGrossCoins: 0,
      companyDeductionCoins,
      girlsFinalCoins: 0,
      companyProfitCoins,
      companyProfitRupees,
      isShortCall: true,
      girlShortCallPenaltyCoins: GIRL_SHORT_CALL_PENALTY_COINS,
    };
  }

  const girlsGrossCoins = boysDeductedCoins;
  const companyDeductionCoins = Math.floor(
    (girlsGrossCoins * COMPANY_DEDUCTION_FROM_GIRL_GROSS_PERCENT) / 100,
  );
  const girlsFinalCoins = girlsGrossCoins - companyDeductionCoins;
  const companyProfitCoins = companyDeductionCoins;
  const companyProfitRupees = companyProfitCoins / COINS_PER_RUPEE;

  return {
    girlBaseCoinsPerMinute,
    boysVisibleCoinsPerMinute,
    callDurationSeconds: durationSeconds,
    chargedMinutes,
    boysDeductedCoins,
    girlsGrossCoins,
    companyDeductionCoins,
    girlsFinalCoins,
    companyProfitCoins,
    companyProfitRupees,
    isShortCall: false,
    girlShortCallPenaltyCoins: 0,
  };
}
