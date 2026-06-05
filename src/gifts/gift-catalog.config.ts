export type GiftCategory = 'all' | 'popular' | 'new';

export type GiftCatalogItem = {
  id: string;
  name: string;
  emoji: string;
  priceCoins: number;
  categories: GiftCategory[];
};

/** Static gift catalog — boys pay full price; girls receive net after platform cut. */
export const GIFT_CATALOG: GiftCatalogItem[] = [
  {
    id: 'rose',
    name: 'Rose',
    emoji: '🌹',
    priceCoins: 19,
    categories: ['all', 'popular'],
  },
  {
    id: 'teddy',
    name: 'Teddy Bear',
    emoji: '🧸',
    priceCoins: 99,
    categories: ['all', 'popular'],
  },
  {
    id: 'chocolate',
    name: 'Chocolate',
    emoji: '🍫',
    priceCoins: 49,
    categories: ['all'],
  },
  {
    id: 'kiss',
    name: 'Kiss',
    emoji: '💋',
    priceCoins: 29,
    categories: ['all', 'popular'],
  },
  {
    id: 'ring',
    name: 'Ring',
    emoji: '💍',
    priceCoins: 199,
    categories: ['all', 'new'],
  },
  {
    id: 'perfume',
    name: 'Perfume',
    emoji: '🧴',
    priceCoins: 149,
    categories: ['all'],
  },
  {
    id: 'cake',
    name: 'Cake',
    emoji: '🎂',
    priceCoins: 59,
    categories: ['all', 'new'],
  },
  {
    id: 'car',
    name: 'Car',
    emoji: '🚗',
    priceCoins: 499,
    categories: ['all', 'popular'],
  },
  {
    id: 'ship',
    name: 'Ship',
    emoji: '🚢',
    priceCoins: 999,
    categories: ['all', 'new'],
  },
];

export function findGiftById(id: string): GiftCatalogItem | undefined {
  return GIFT_CATALOG.find((g) => g.id === id);
}

export function listGifts(filter?: GiftCategory): GiftCatalogItem[] {
  if (!filter || filter === 'all') return [...GIFT_CATALOG];
  return GIFT_CATALOG.filter((g) => g.categories.includes(filter));
}
