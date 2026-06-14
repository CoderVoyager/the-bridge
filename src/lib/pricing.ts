import { Condition } from './types';
import {
  CONDITION_RESALE_FACTORS,
  DEMAND_FACTOR_MIN,
  DEMAND_FACTOR_MAX,
  DEMAND_SATURATION_COUNT,
} from './config';

/**
 * Calculate resale price for an item.
 * price = originalPrice × conditionFactor × demandFactor
 * Rounded to nearest ₹10.
 */
export function calculatePrice(
  originalPrice: number,
  condition: Condition,
  nearbyDemand: number
): number {
  const conditionFactor = CONDITION_RESALE_FACTORS[condition];

  // demandFactor scales linearly from MIN to MAX based on nearbyDemand count
  const demandRatio = Math.min(nearbyDemand / DEMAND_SATURATION_COUNT, 1);
  const demandFactor =
    DEMAND_FACTOR_MIN + demandRatio * (DEMAND_FACTOR_MAX - DEMAND_FACTOR_MIN);

  const rawPrice = originalPrice * conditionFactor * demandFactor;

  // Round to nearest 10 INR
  return Math.round(rawPrice / 10) * 10;
}
