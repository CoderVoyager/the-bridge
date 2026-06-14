/**
 * Risk flag rules for items entering the resale pipeline.
 */

const DATA_WIPE_CATEGORIES = ['electronics', 'phones', 'tablets', 'laptops', 'smartwatches'];
const SANITIZATION_CATEGORIES = ['footwear', 'winter_wear', 'apparel', 'sportswear', 'innerwear', 'baby_gear'];

// Example recalled/hazardous items (brand + keyword combos)
const BLOCKED_ITEMS: Array<{ brand: string; keyword: string }> = [
  { brand: 'Samsung', keyword: 'Galaxy Note 7' },
  { brand: 'Hoverboard', keyword: '' },
  { brand: 'Fisher-Price', keyword: 'Rock n Play' },
];

export function computeRiskFlags(
  category: string,
  brand: string,
  title: string
): string[] {
  const flags: string[] = [];

  // Data wipe check
  if (DATA_WIPE_CATEGORIES.some((c) => category.toLowerCase().includes(c))) {
    flags.push('needs_data_wipe');
  }

  // Sanitization check
  if (SANITIZATION_CATEGORIES.some((c) => category.toLowerCase().includes(c))) {
    flags.push('needs_sanitization');
  }

  // Recall/hazardous check
  const titleLower = title.toLowerCase();
  const brandLower = brand.toLowerCase();
  for (const blocked of BLOCKED_ITEMS) {
    const brandMatch = brandLower.includes(blocked.brand.toLowerCase());
    const keywordMatch =
      blocked.keyword === '' || titleLower.includes(blocked.keyword.toLowerCase());
    if (brandMatch && keywordMatch) {
      flags.push('block_resale');
      break;
    }
  }

  return flags;
}
