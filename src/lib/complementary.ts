import { Item } from './types';

/**
 * Complementary item recommendations.
 * 
 * Primary method: AI-generated keywords stored on each item at listing time.
 * Gemini generates 5 complementary product keywords when an item is graded.
 * We match those keywords against other marketplace items' titles.
 * 
 * Fallback: Category-level pairing map (for items without keywords).
 * 
 * In production at Amazon's scale: this would use the Product Graph API
 * with co-purchase signals from billions of transactions.
 */

// Fallback category pairings (used if AI keywords not available)
const CATEGORY_PAIRINGS: Record<string, string[]> = {
  electronics: ['audio', 'gaming', 'accessories'],
  audio: ['electronics', 'accessories', 'gaming'],
  footwear: ['apparel', 'fitness', 'accessories'],
  baby_gear: ['baby_gear', 'kitchen_appliances'],
  kitchen_appliances: ['kitchen_appliances', 'baby_gear'],
  winter_wear: ['apparel', 'footwear'],
  apparel: ['footwear', 'winter_wear', 'fitness'],
  gaming: ['electronics', 'audio', 'accessories'],
  fitness: ['footwear', 'apparel', 'audio'],
  accessories: ['electronics', 'audio', 'footwear'],
  other: [],
};

export interface ComplementaryItem {
  id: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  condition: string;
  city: string;
  reason: string;
}

/**
 * Find complementary items from the marketplace.
 * 
 * Scoring:
 *  +5 if item title matches an AI-generated complementary keyword
 *  +3 if category is in the fallback complementary list
 *  +2 if same brand (brand ecosystem)
 *  +1 if same city (bundle delivery)
 * 
 * Returns top 4 matches (minimum score 2).
 */
export function findComplementaryItems(
  currentItem: Item,
  allMarketplaceItems: Item[]
): ComplementaryItem[] {
  const aiKeywords = currentItem.complementaryKeywords ?? [];
  const fallbackCategories = CATEGORY_PAIRINGS[currentItem.category] ?? [];

  const scored: Array<{ item: Item; score: number; reason: string }> = [];

  for (const item of allMarketplaceItems) {
    // Skip self
    if (item.id === currentItem.id) continue;
    // Must have assessment and be listed
    if (!item.assessment || !item.route) continue;
    if (item.route.path !== 'ship_direct' && item.route.path !== 'list_hold') continue;

    let score = 0;
    let reason = '';
    const titleLower = item.title.toLowerCase();

    // AI keyword match (strongest signal)
    const matchedKeyword = aiKeywords.find((kw) => titleLower.includes(kw));
    if (matchedKeyword) {
      score += 5;
      reason = `Pairs with "${matchedKeyword}"`;
    }

    // Fallback: category complementarity
    if (!matchedKeyword && fallbackCategories.includes(item.category)) {
      score += 3;
      reason = `Goes with ${currentItem.category.replace(/_/g, ' ')}`;
    }

    // Same brand bonus
    if (item.brand.toLowerCase() === currentItem.brand.toLowerCase()) {
      score += 2;
      if (!reason) reason = `Same brand: ${item.brand}`;
    }

    // Same city bonus (bundle delivery)
    if (item.location.city === currentItem.location.city) {
      score += 1;
    }

    // Only include if there's meaningful relevance
    if (score >= 2) {
      scored.push({ item, score, reason: reason || 'Recommended' });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return top 4
  return scored.slice(0, 4).map(({ item, reason }) => ({
    id: item.id,
    title: item.title,
    brand: item.brand,
    category: item.category,
    price: item.assessment!.price,
    originalPrice: item.originalPrice,
    condition: item.assessment!.grade.condition,
    city: item.location.city,
    reason,
  }));
}
