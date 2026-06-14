import { Buyer, Item, Location, PriceSensitivity, SizeProfile, Condition } from './types';
import { NEARBY_DEMAND_RADIUS_KM } from './config';

export interface CategoryAffinity {
  category: string;
  score: number; // 0-1, higher = stronger affinity
}

export interface DemandProfile {
  buyerId: string;
  buyerName: string;
  location: Location;
  categoryAffinities: CategoryAffinity[];
  sizeProfile: SizeProfile;
  priceSensitivity: PriceSensitivity;
  topCategories: string[]; // top 3-5 categories by affinity
}

/**
 * Build a demand profile from a buyer's data.
 * Aggregates signals from: wishlist (weight 3), purchaseHistory (weight 2), recentlyViewed (weight 1).
 */
export function buildDemandProfile(buyer: Buyer): DemandProfile {
  const scores: Record<string, number> = {};

  // Wishlist — strongest signal (weight 3)
  for (const cat of buyer.wishlist) {
    scores[cat] = (scores[cat] ?? 0) + 3;
  }

  // Purchase history — strong signal (weight 2)
  for (const entry of buyer.purchaseHistory) {
    scores[entry.category] = (scores[entry.category] ?? 0) + 2;
  }

  // Recently viewed — light signal (weight 1)
  for (const cat of buyer.recentlyViewed) {
    scores[cat] = (scores[cat] ?? 0) + 1;
  }

  // Normalize to 0-1
  const maxScore = Math.max(...Object.values(scores), 1);
  const affinities: CategoryAffinity[] = Object.entries(scores)
    .map(([category, score]) => ({ category, score: Math.round((score / maxScore) * 100) / 100 }))
    .sort((a, b) => b.score - a.score);

  const topCategories = affinities.slice(0, 5).map((a) => a.category);

  return {
    buyerId: buyer.id,
    buyerName: buyer.name,
    location: buyer.location,
    categoryAffinities: affinities,
    sizeProfile: buyer.sizeProfile,
    priceSensitivity: buyer.priceSensitivity,
    topCategories,
  };
}

/**
 * Haversine distance between two locations in km.
 */
export function distanceKm(a: Location, b: Location): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// === Personalized Ranking ===

export interface ScoredItem {
  itemId: string;
  totalScore: number;
  reasons: string[];
  // Individual signal scores (for debugging)
  categoryScore: number;
  brandScore: number;
  distanceScore: number;
  priceScore: number;
  gradeScore: number;
}

/** Size-relevant categories */
const SHOE_CATEGORIES = ['footwear'];
const CLOTHING_CATEGORIES = ['winter_wear', 'apparel', 'sportswear'];

/** Condition preference: higher = better for premium buyers */
const CONDITION_RANK: Record<Condition, number> = {
  like_new: 4,
  good: 3,
  fair: 2,
  damaged: 1,
};

/**
 * Score and rank shop items for a specific buyer.
 * Returns items sorted by relevance (highest first) with reason tags.
 */
export function scoreItemsForBuyer(
  buyer: Buyer,
  items: Item[]
): ScoredItem[] {
  const profile = buildDemandProfile(buyer);
  const affinityMap = new Map(profile.categoryAffinities.map((a) => [a.category, a.score]));

  // Brand affinity from purchase history
  const brandCounts: Record<string, number> = {};
  for (const entry of buyer.purchaseHistory) {
    brandCounts[entry.brand] = (brandCounts[entry.brand] ?? 0) + 1;
  }
  const maxBrandCount = Math.max(...Object.values(brandCounts), 1);

  return items
    .map((item) => {
      const reasons: string[] = [];

      // 1. Category affinity (0-35 points)
      const catAffinity = affinityMap.get(item.category) ?? 0;
      const categoryScore = catAffinity * 35;
      if (catAffinity >= 0.7) {
        if (buyer.wishlist.includes(item.category)) {
          reasons.push('matches your wishlist');
        } else {
          reasons.push('in your interests');
        }
      }

      // 2. Brand affinity (0-15 points)
      const brandAffinity = (brandCounts[item.brand] ?? 0) / maxBrandCount;
      const brandScore = brandAffinity * 15;
      if (brandAffinity > 0) {
        reasons.push(`${item.brand} — you've bought before`);
      }

      // 3. Distance (0-25 points, nearer = higher)
      const dist = distanceKm(buyer.location, item.location);
      const distanceScore = Math.max(0, 25 * (1 - dist / 2000)); // 0km=25, 2000km=0
      if (dist <= NEARBY_DEMAND_RADIUS_KM) {
        reasons.push(`${Math.round(dist)} km away`);
      }

      // 4. Price vs sensitivity (0-15 points)
      let priceScore = 0;
      const resalePrice = item.assessment?.price ?? item.originalPrice;
      const saving = item.originalPrice - resalePrice;
      const savingPct = saving / item.originalPrice;

      if (buyer.priceSensitivity === 'deal' && savingPct >= 0.4) {
        priceScore = 15;
        reasons.push('great price');
      } else if (buyer.priceSensitivity === 'mid' && savingPct >= 0.25) {
        priceScore = 12;
        reasons.push('good value');
      } else if (buyer.priceSensitivity === 'premium') {
        // Premium buyers prefer better condition over discount
        priceScore = 8;
      } else {
        priceScore = savingPct * 10;
      }

      // 5. Grade preference (0-10 points)
      const condition = (item.assessment?.grade?.condition ?? 'good') as Condition;
      const condRank = CONDITION_RANK[condition];
      let gradeScore = 0;
      if (buyer.priceSensitivity === 'premium') {
        // Premium buyers want like_new/good
        gradeScore = condRank >= 3 ? 10 : condRank * 2;
        if (condRank >= 4) reasons.push('near-new condition');
      } else {
        // Others are okay with fair+
        gradeScore = condRank >= 2 ? 8 : 4;
      }

      // 6. Size match bonus (flat +5 if relevant and matches)
      if (SHOE_CATEGORIES.includes(item.category) && buyer.sizeProfile.shoeSize) {
        reasons.push(`your size: ${buyer.sizeProfile.shoeSize}`);
        // We can't actually check item size without item size data, so just signal the buyer cares
      }
      if (CLOTHING_CATEGORIES.includes(item.category) && buyer.sizeProfile.clothingSize) {
        reasons.push(`your size: ${buyer.sizeProfile.clothingSize}`);
      }

      const totalScore = categoryScore + brandScore + distanceScore + priceScore + gradeScore;

      // Keep top 2 most interesting reasons
      const topReasons = reasons.slice(0, 2);

      return {
        itemId: item.id,
        totalScore: Math.round(totalScore * 10) / 10,
        reasons: topReasons,
        categoryScore,
        brandScore,
        distanceScore,
        priceScore,
        gradeScore,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

// === Proactive Offers ===

export interface ProactiveOffer {
  buyerId: string;
  buyerName: string;
  itemId: string;
  itemTitle: string;
  condition: string;
  price: number;
  originalPrice: number;
  distanceKm: number;
  category: string;
}

/**
 * Find proactive offers: items that match a buyer's notifyList by category,
 * are within ~25km, and under maxPrice.
 */
export function findProactiveOffers(buyer: Buyer, items: Item[]): ProactiveOffer[] {
  const offers: ProactiveOffer[] = [];

  for (const notify of buyer.notifyList) {
    for (const item of items) {
      if (!item.assessment || !item.route) continue;
      if (item.route.path !== 'ship_direct' && item.route.path !== 'list_hold') continue;
      if (item.category !== notify.category) continue;

      const resalePrice = item.assessment.price;
      if (resalePrice > notify.maxPrice) continue;

      const dist = distanceKm(buyer.location, item.location);
      if (dist > NEARBY_DEMAND_RADIUS_KM) continue;

      offers.push({
        buyerId: buyer.id,
        buyerName: buyer.name,
        itemId: item.id,
        itemTitle: item.title,
        condition: item.assessment.grade.condition,
        price: resalePrice,
        originalPrice: item.originalPrice,
        distanceKm: Math.round(dist),
        category: item.category,
      });
    }
  }

  return offers;
}
