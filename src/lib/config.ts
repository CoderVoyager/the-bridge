// === Tunable Constants for The Bridge ===

import { Condition } from './types';

/** Resale value factor based on condition (multiplied by original price) */
export const CONDITION_RESALE_FACTORS: Record<Condition, number> = {
  like_new: 0.75,
  good: 0.55,
  fair: 0.35,
  damaged: 0.15,
};

/** Demand factor range: scales between min and max based on nearby demand */
export const DEMAND_FACTOR_MIN = 0.9;
export const DEMAND_FACTOR_MAX = 1.15;
/** Demand count that saturates the demand factor to max */
export const DEMAND_SATURATION_COUNT = 10;

/** Minimum trust score for direct shipping */
export const MIN_TRUST_DIRECT_SHIP = 70;

/** Credits earned per successful transaction */
export const CREDITS_PER_TRANSACTION = 50;

/** Nearby demand radius in km */
export const NEARBY_DEMAND_RADIUS_KM = 25;

// === Cost Model for Routing ===

/** Base handling cost at central warehouse (INR) */
export const WAREHOUSE_BASE_HANDLING = 120;

/** Distance to the central warehouse from any origin (km) — fixed for demo */
export const WAREHOUSE_DISTANCE_KM = 600;

/** Cost per km for warehouse route (INR) */
export const WAREHOUSE_COST_PER_KM = 2;

/** Marginal cost for local direct delivery (INR flat) */
export const LOCAL_DELIVERY_BASE = 40;

/** Cost per km for local/direct delivery (INR) */
export const LOCAL_COST_PER_KM = 1.5;

/** CO₂ saved per km difference between warehouse and direct route (kg) */
export const CARBON_PER_KM = 0.12;
