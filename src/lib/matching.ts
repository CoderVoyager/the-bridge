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
}

/**
 * Find the best-matched buyer for an item based on category + proximity.
 * Returns the top buyer and a count of category-matching buyers within radius.
 */
export function matchBuyers(category: string, itemLocation: Location): MatchResult {
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
  const nearbyDemand = withDistance.filter(
    (bd) => bd.distance <= NEARBY_DEMAND_RADIUS_KM
  ).length;

  // Rank: nearest first (category already matched)
  withDistance.sort((a, b) => a.distance - b.distance);

  const best = withDistance[0]?.buyer;
  const bestDistance = withDistance[0]?.distance ?? 0;

  return {
    bestBuyerId: best?.id,
    bestBuyerName: best?.name,
    bestBuyerCity: best?.location.city,
    bestBuyerDistanceKm: Math.round(bestDistance),
    nearbyDemand,
  };
}
