import { Buyer, Location } from './types';
import { getBuyers } from './store';
import { NEARBY_DEMAND_RADIUS_KM } from './config';

/**
 * Haversine distance between two lat/lng points in kilometers.
 */
function haversineKm(a: Location, b: Location): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface MatchResult {
  bestBuyerId: string | undefined;
  bestBuyerName: string | undefined;
  bestBuyerCity: string | undefined;
  bestBuyerDistanceKm: number;
  nearbyDemand: number;
  budgetMatchedDemand: number; // buyers who can also afford the item
}

/**
 * Find the best-matched buyer for an item based on category + proximity + budget.
 * Returns the top buyer and counts of demand (total and budget-filtered).
 */
export function matchBuyers(
  category: string,
  itemLocation: Location,
  itemPrice?: number
): MatchResult {
  const buyers = getBuyers();

  // Filter to buyers whose wishlist includes this category
  const categoryMatches = buyers.filter((b: Buyer) =>
    b.wishlist.includes(category)
  );

  // Compute distance for each
  const withDistance = categoryMatches.map((b: Buyer) => ({
    buyer: b,
    distance: haversineKm(itemLocation, b.location),
  }));

  // Count how many are within radius
  const nearbyAll = withDistance.filter(
    (bd) => bd.distance <= NEARBY_DEMAND_RADIUS_KM
  );
  const nearbyDemand = nearbyAll.length;

  // Budget-filtered demand: buyers whose maxPrice for this category >= item price
  let budgetMatchedDemand = nearbyDemand;
  if (itemPrice !== undefined && itemPrice > 0) {
    budgetMatchedDemand = nearbyAll.filter((bd) => {
      const notify = bd.buyer.notifyList.find((n) => n.category === category);
      if (!notify) return true; // no explicit cap = willing to pay any price in wishlist
      return notify.maxPrice >= itemPrice;
    }).length;
  }

  // Rank: nearest first among budget-matched buyers (category already matched)
  const budgetFiltered = itemPrice
    ? withDistance.filter((bd) => {
        const notify = bd.buyer.notifyList.find((n) => n.category === category);
        if (!notify) return true;
        return notify.maxPrice >= itemPrice;
      })
    : withDistance;

  budgetFiltered.sort((a, b) => a.distance - b.distance);

  // Fallback to unfiltered if no budget match
  const sorted = budgetFiltered.length > 0 ? budgetFiltered : withDistance;
  sorted.sort((a, b) => a.distance - b.distance);

  const best = sorted[0]?.buyer;
  const bestDistance = sorted[0]?.distance ?? 0;

  return {
    bestBuyerId: best?.id,
    bestBuyerName: best?.name,
    bestBuyerCity: best?.location.city,
    bestBuyerDistanceKm: Math.round(bestDistance),
    nearbyDemand,
    budgetMatchedDemand,
  };
}
