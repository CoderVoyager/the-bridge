import { Assessment, RouteDecision } from './types';
import {
  WAREHOUSE_BASE_HANDLING,
  WAREHOUSE_DISTANCE_KM,
  WAREHOUSE_COST_PER_KM,
  LOCAL_DELIVERY_BASE,
  LOCAL_COST_PER_KM,
  CARBON_PER_KM,
} from './config';
import { getCategoryAdjustedRefurbCost } from './refurbish';

export interface RouterInput {
  assessment: Assessment;
  buyerDistanceKm: number;
  category?: string;
  originalPrice?: number;
  budgetMatchedDemand?: number; // buyers who can actually afford the item
  isReturnable?: boolean; // true = within 30 days, Amazon's responsibility (warehouse is an option)
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
    carbonKgSaved: Math.round(carbonKgSaved * 100) / 100,
  };
}

// Amazon Renewed resale factor by condition (what warehouse can sell it for)
const WAREHOUSE_RESALE_FACTOR: Record<string, number> = {
  like_new: 0.85,  // Warehouse sells "Renewed" at 85% of original
  good: 0.70,      // 70%
  fair: 0.50,      // 50%
  damaged: 0.30,   // 30% (after refurb)
};

// Warehouse storage + relisting overhead (INR)
const WAREHOUSE_STORAGE_COST = 80;
const WAREHOUSE_RELISTING_FEE = 50;

/**
 * Calculate net value if item is sold via The Bridge (locally).
 */
function netValueBridge(
  sellingPrice: number,
  deliveryCost: number
): number {
  return sellingPrice - deliveryCost;
}

/**
 * Calculate net value if item goes to warehouse.
 * Accounts for: logistics + handling + refurb cost + storage + relisting.
 */
function netValueWarehouse(
  originalPrice: number,
  condition: string,
  defects: string[],
  category: string
): { netValue: number; refurbCost: number; warehouseSellingPrice: number } {
  const warehouseLogistics = WAREHOUSE_BASE_HANDLING + WAREHOUSE_DISTANCE_KM * WAREHOUSE_COST_PER_KM;
  
  // Get refurbishment cost based on defects
  const refurbEstimate = getCategoryAdjustedRefurbCost(defects, category);
  const refurbCost = refurbEstimate.needsRepair ? refurbEstimate.totalCost : 0;
  
  // What warehouse can sell it for after refurb
  const resaleFactor = WAREHOUSE_RESALE_FACTOR[condition] ?? 0.50;
  // If damaged + refurbished, it sells at "good" price
  const effectiveFactor = condition === 'damaged' && refurbEstimate.needsRepair
    ? WAREHOUSE_RESALE_FACTOR['good']
    : resaleFactor;
  const warehouseSellingPrice = Math.round(originalPrice * effectiveFactor);
  
  const totalWarehouseCost = warehouseLogistics + refurbCost + WAREHOUSE_STORAGE_COST + WAREHOUSE_RELISTING_FEE;
  const netValue = warehouseSellingPrice - totalWarehouseCost;

  return { netValue, refurbCost, warehouseSellingPrice };
}

/**
 * Enhanced route decision engine.
 * 
 * TWO MODES:
 * 
 * A) Returnable items (≤30 days, Amazon's responsibility):
 *    Full net-value comparison — Bridge vs Warehouse.
 *    Can route to: ship_direct, list_hold, refurbish, repair, donate, recycle.
 * 
 * B) Non-returnable items (old, customer's own stuff):
 *    Simplified — no warehouse option. Only: list, donate, recycle.
 *    Can route to: ship_direct, list_hold, donate, recycle.
 */
export function decideRoute(input: RouterInput): RouteDecision {
  const { assessment, buyerDistanceKm, category = 'other', originalPrice = 0, isReturnable = false } = input;
  const { grade, price, riskFlags, nearbyDemand } = assessment;
  const budgetDemand = input.budgetMatchedDemand ?? nearbyDemand;
  const cost = computeCosts(buyerDistanceKm);

  // ══════════════════════════════════════════════════
  // Rule 1: Safety — Blocked items ALWAYS recycle (both paths)
  // ══════════════════════════════════════════════════
  if (riskFlags.includes('block_resale')) {
    return {
      path: 'recycle',
      cost,
      reason: 'Item is flagged as recalled or hazardous — cannot be resold.',
    };
  }

  // ══════════════════════════════════════════════════════════════
  // PATH B: Non-returnable (old items) — simple List/Donate/Recycle
  // No warehouse involved. Seller's own item.
  // ══════════════════════════════════════════════════════════════
  if (!isReturnable) {
    // For non-returnable items, use a local delivery cost estimate (not cross-country)
    // If no local buyer, we still list and wait — delivery cost is hypothetical
    const localDeliveryCost = LOCAL_DELIVERY_BASE + Math.min(buyerDistanceKm, 25) * LOCAL_COST_PER_KM;

    // If resale price is too low to even cover local shipping
    if (price < localDeliveryCost) {
      return {
        path: 'donate',
        cost,
        reason: `Resale value (₹${price}) is too low for listing. Donation recommended — earn 50 Green Credits.`,
      };
    }

    // Has budget-matched buyers nearby → list with confidence
    if (budgetDemand > 0 && assessment.matchedBuyerId) {
      return {
        path: 'ship_direct',
        matchedBuyerId: assessment.matchedBuyerId,
        cost,
        reason: `${budgetDemand} buyer(s) nearby can afford ₹${price}. Listing on marketplace.`,
      };
    }

    // Buyers want this category but can't afford the price
    if (nearbyDemand > 0 && budgetDemand === 0) {
      return {
        path: 'list_hold',
        cost,
        reason: `${nearbyDemand} nearby buyers want ${category}, but none have budget for ₹${price}. Listing anyway — new buyers may appear.`,
      };
    }

    // No demand at all — still list if valuable enough
    if (price > localDeliveryCost * 2) {
      return {
        path: 'list_hold',
        cost,
        reason: `No nearby demand yet, but item has good resale value (₹${price}). Listing on marketplace.`,
      };
    }

    // Low value + no demand → donate
    return {
      path: 'donate',
      cost,
      reason: `Low demand and marginal resale value (₹${price}). Donation recommended — earn 50 Green Credits.`,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // PATH A: Returnable items (≤30 days) — full Bridge vs Warehouse comparison
  // Amazon's responsibility. Warehouse IS an option.
  // ══════════════════════════════════════════════════════════════

  // Rule 2: Damaged + needs physical repair → compare warehouse refurb vs Bridge as-is
  if (grade.condition === 'damaged') {
    const refurbEstimate = getCategoryAdjustedRefurbCost(grade.defects, category);

    if (refurbEstimate.needsRepair) {
      const warehouseCalc = netValueWarehouse(originalPrice, grade.condition, grade.defects, category);
      const bridgeAsIsPrice = price;
      const bridgeNet = netValueBridge(bridgeAsIsPrice, cost.shipDirect);

      if (warehouseCalc.netValue > bridgeNet && warehouseCalc.netValue > 0) {
        return {
          path: 'refurbish',
          matchedBuyerId: assessment.matchedBuyerId,
          cost,
          reason: `Item needs repair (est. ₹${refurbEstimate.totalCost}). Warehouse refurb yields ₹${warehouseCalc.netValue} net vs Bridge ₹${Math.round(bridgeNet)} net. Routing to warehouse.`,
        };
      } else if (bridgeNet > 0 && budgetDemand > 0) {
        return {
          path: 'ship_direct',
          matchedBuyerId: assessment.matchedBuyerId,
          cost,
          reason: `Damaged item, but selling "as-is" at ₹${bridgeAsIsPrice} locally (net ₹${Math.round(bridgeNet)}) beats warehouse refurb (net ₹${warehouseCalc.netValue}).`,
        };
      } else {
        return {
          path: 'donate',
          cost,
          reason: `Repair cost (₹${refurbEstimate.totalCost}) exceeds recoverable value. Better donated.`,
        };
      }
    }
    // Damaged but only cosmetic → fall through to net-value comparison
  }

  // Rule 3: Net Value Comparison — Bridge vs Warehouse
  const bridgeNetValue = netValueBridge(price, cost.shipDirect);
  const warehouseCalc = netValueWarehouse(originalPrice, grade.condition, grade.defects, category);

  // If resale price too low for both paths
  if (price < cost.shipDirect && warehouseCalc.netValue <= 0) {
    return {
      path: 'donate',
      cost,
      reason: `Resale value (₹${price}) too low for shipping (₹${cost.shipDirect}). Warehouse also negative (₹${warehouseCalc.netValue}). Donation recommended.`,
    };
  }

  // Rule 4: Bridge wins if buyers exist AND economics are better
  if (budgetDemand > 0 && assessment.matchedBuyerId) {
    if (bridgeNetValue >= warehouseCalc.netValue) {
      return {
        path: 'ship_direct',
        matchedBuyerId: assessment.matchedBuyerId,
        cost,
        reason: `Bridge net ₹${Math.round(bridgeNetValue)} ≥ Warehouse net ₹${warehouseCalc.netValue}. ${budgetDemand} buyer(s) can afford ₹${price}. Saves ₹${cost.warehouseAlt - cost.shipDirect} and ${cost.carbonKgSaved} kg CO₂.`,
      };
    } else {
      const warehouseAdvantage = warehouseCalc.netValue - bridgeNetValue;

      // Small warehouse advantage (<₹500) → prefer Bridge for sustainability
      if (warehouseAdvantage < 500) {
        return {
          path: 'ship_direct',
          matchedBuyerId: assessment.matchedBuyerId,
          cost,
          reason: `Warehouse nets ₹${warehouseAdvantage} more, but Bridge saves ${cost.carbonKgSaved} kg CO₂ and delivers faster. Routing via Bridge.`,
        };
      }

      // Significant warehouse advantage → list on Bridge first, warehouse as fallback
      return {
        path: 'list_hold',
        matchedBuyerId: assessment.matchedBuyerId,
        cost,
        reason: `Warehouse nets ₹${warehouseCalc.netValue} vs Bridge ₹${Math.round(bridgeNetValue)}. Listing for 7 days — if no buyer, routes to warehouse.`,
      };
    }
  }

  // Rule 5: No budget-matched buyers
  if (nearbyDemand > 0 && budgetDemand === 0) {
    if (bridgeNetValue > 0) {
      return {
        path: 'list_hold',
        cost,
        reason: `${nearbyDemand} nearby buyers want ${category}, but none have budget for ₹${price}. Listing on Bridge — warehouse fallback after 7 days.`,
      };
    }
  }

  // Rule 6: No demand — warehouse if profitable, else donate
  if (warehouseCalc.netValue > 0) {
    return {
      path: 'list_hold',
      cost,
      reason: `No nearby buyers. Listing on marketplace. Warehouse fallback: net ₹${warehouseCalc.netValue} after logistics.`,
    };
  }

  return {
    path: 'donate',
    cost,
    reason: `No buyers found and warehouse uneconomical (net ₹${warehouseCalc.netValue}). Donation recommended.`,
  };
}
