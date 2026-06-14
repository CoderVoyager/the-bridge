import { CONDITION_RESALE_FACTORS } from './config';
import { Condition } from './types';

/**
 * Fast-depreciating categories lose value quicker.
 */
const DEPRECIATION_RATES: Record<string, number> = {
  electronics: 0.04,     // 4% per month
  phones: 0.05,
  tablets: 0.04,
  laptops: 0.035,
  baby_gear: 0.015,
  footwear: 0.02,
  winter_wear: 0.01,
  kitchen_appliances: 0.012,
  apparel: 0.025,
};

const DEFAULT_DEPRECIATION = 0.02;

/**
 * Categories that depreciate fast enough to warrant an "act now" flag.
 */
const FAST_DEPRECIATION_THRESHOLD = 0.03; // 3% per month

/**
 * Estimate current resale value using depreciation curve.
 * Uses condition factor 'good' as baseline assumption for ungraded items.
 */
export function estimateResaleValue(
  originalPrice: number,
  ageMonths: number,
  category: string,
  condition?: Condition
): number {
  const conditionFactor = condition
    ? CONDITION_RESALE_FACTORS[condition]
    : CONDITION_RESALE_FACTORS['good'];

  const depRate = DEPRECIATION_RATES[category] ?? DEFAULT_DEPRECIATION;
  const depreciationFactor = Math.max(0.2, 1 - depRate * ageMonths); // floor at 20%

  const value = originalPrice * conditionFactor * depreciationFactor;
  return Math.round(value / 10) * 10; // round to nearest ₹10
}

/**
 * Check if category is fast-depreciating.
 */
export function isFastDepreciating(category: string): boolean {
  const rate = DEPRECIATION_RATES[category] ?? DEFAULT_DEPRECIATION;
  return rate >= FAST_DEPRECIATION_THRESHOLD;
}

/**
 * Get monthly value drop in INR for display.
 */
export function monthlyValueDrop(originalPrice: number, category: string): number {
  const depRate = DEPRECIATION_RATES[category] ?? DEFAULT_DEPRECIATION;
  return Math.round(originalPrice * CONDITION_RESALE_FACTORS['good'] * depRate);
}
