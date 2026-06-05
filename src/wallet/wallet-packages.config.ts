import { ConfigService } from '@nestjs/config';

export type CoinPackage = {
  coins: number;
  priceInr: number;
  priceLabel: string;
};

/** Parse `WALLET_COIN_PACKAGES` env: `coins:priceInr` pairs comma-separated, e.g. `100:99,500:449`. */
export function loadCoinPackages(config: ConfigService): CoinPackage[] {
  const raw =
    config.get<string>('WALLET_COIN_PACKAGES')?.trim() ||
    process.env.WALLET_COIN_PACKAGES?.trim();
  if (!raw) return [];

  const packages: CoinPackage[] = [];
  for (const part of raw.split(',')) {
    const segment = part.trim();
    if (!segment) continue;
    const [coinsRaw, priceRaw] = segment.split(':').map((s) => s.trim());
    const coins = Number(coinsRaw);
    const priceInr = Number(priceRaw);
    if (!Number.isFinite(coins) || !Number.isFinite(priceInr)) continue;
    if (coins < 1 || priceInr < 0) continue;
    packages.push({
      coins: Math.floor(coins),
      priceInr: Math.floor(priceInr),
      priceLabel: `₹${Math.floor(priceInr).toLocaleString('en-IN')}`,
    });
  }
  return packages.sort((a, b) => a.coins - b.coins);
}
