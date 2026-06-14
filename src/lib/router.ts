import { Assessment, RouteDecision } from './types';
import {
  WAREHOUSE_BASE_HANDLING,
  WAREHOUSE_DISTANCE_KM,
  WAREHOUSE_COST_PER_KM,
  LOCAL_DELIVERY_BASE,
  LOCAL_COST_PER_KM,
  CARBON_PER_KM,
} from './config';

export interface RouterInput {
  assessment: Assessment;
  buyerDistanceKm: number; // distance to matched buyer
}

/**
 * Compute the cost breakdown for ship-direct vs warehouse routes.
 */
function computeCosts(buyerDistanceKm: number) {
  const shipDirect = LOCAL_DELIVERY_BASE + buyerDistanceKm * LOCAL_COST_PER_KM;
  const warehouseAlt = WAREHOUSE_BASE_HANDLING + WAREHOUSE_DISTANCE_KM * WAREHOUSE_COST_PER_KM;
  const carbonKgSaved = (WAREHOUSE_DISTANCE_KM - buyerDistanceKm) * CARBON_PER_KM;

  return {
    shipDirect: Math.round(shipDirect),
    warehouseAlt: Math.round(warehouseAlt),
    carbonKgSaved: Math.round(carbonKgSaved * 100) / 100, // 2 decimal places
  };
}

/**
 * Route decision engine: picks the optimal path for an item.
 */
export function decideRoute(input: RouterInput): RouteDecision {
  const { assessment, buyerDistanceKm } = input;
  const { grade, price, riskFlags, nearbyDemand } = assessment;
  const cost = computeCosts(buyerDistanceKm);

  // Rule 1: Blocked items go to recycle
  if (riskFlags.includes('block_resale')) {
    return {
      path: 'recycle',
      cost,
      reason: 'Item is flagged as recalled or hazardous — cannot be resold.',
    };
  }

  // Rule 2: If resale price < cost to move it, donate
  if (price < cost.shipDirect) {
    return {
      path: 'donate',
      cost,
      reason: `Resale value (₹${price}) is lower than shipping cost (₹${cost.shipDirect}). Better donated.`,
    };
  }

  // Rule 3: Damaged but has value → refurbish or repair
  if (grade.condition === 'damaged') {
    const defectsText = grade.defects.join(' ').toLowerCase();
    const needsRepair = defectsText.includes('missing') || defectsText.includes('broken');
    if (needsRepair) {
      return {
        path: 'repair',
        matchedBuyerId: assessment.matchedBuyerId,
        cost,
        reason: 'Item is damaged with broken/missing parts — needs repair before resale.',
      };
    }
    return {
      path: 'refurbish',
      matchedBuyerId: assessment.matchedBuyerId,
      cost,
      reason: 'Item is damaged but has resale value — refurbishment will maximize returns.',
    };
  }

  // Rule 4: Nearby demand exists → ship direct
  if (nearbyDemand > 0 && assessment.matchedBuyerId) {
    return {
      path: 'ship_direct',
      matchedBuyerId: assessment.matchedBuyerId,
      cost,
      reason: `Matched buyer nearby (${buyerDistanceKm} km). Direct shipping saves ₹${cost.warehouseAlt - cost.shipDirect} and ${cost.carbonKgSaved} kg CO₂ vs warehouse.`,
    };
  }

  // Rule 5: Fallback — list and hold
  return {
    path: 'list_hold',
    cost,
    reason: 'No nearby buyers found. Listing on marketplace until a match appears.',
  };
}
