/**
 * Refurbishment cost estimator.
 * 
 * Based on AI-detected defects, estimates the cost to refurbish an item
 * at the warehouse. Used in the Bridge vs Warehouse net-value comparison.
 */

// Defect keyword → estimated repair cost (INR)
const DEFECT_COSTS: Array<{ keywords: string[]; cost: number; label: string }> = [
  { keywords: ['cracked screen', 'broken screen', 'screen crack', 'shattered'], cost: 3000, label: 'Screen repair' },
  { keywords: ['broken', 'snapped', 'fractured'], cost: 2000, label: 'Structural repair' },
  { keywords: ['missing', 'lost part', 'no charger', 'no cable'], cost: 500, label: 'Replacement part' },
  { keywords: ['battery', 'not charging', 'battery swell'], cost: 1500, label: 'Battery replacement' },
  { keywords: ['water damage', 'moisture', 'corrosion'], cost: 2500, label: 'Water damage repair' },
  { keywords: ['dent', 'bent', 'warped'], cost: 800, label: 'Dent repair' },
  { keywords: ['scratch', 'scuff', 'scrape', 'worn'], cost: 200, label: 'Cosmetic touch-up' },
  { keywords: ['stain', 'discoloration', 'faded'], cost: 300, label: 'Cleaning/restoration' },
  { keywords: ['tear', 'ripped', 'torn'], cost: 400, label: 'Fabric repair' },
  { keywords: ['sole', 'sole worn', 'sole peeling'], cost: 600, label: 'Sole replacement' },
  { keywords: ['button', 'key', 'not working'], cost: 700, label: 'Component fix' },
  { keywords: ['hinge', 'loose'], cost: 500, label: 'Hinge/joint repair' },
];

// Base warehouse handling cost for refurbishment (inspection + labor overhead)
const REFURB_BASE_OVERHEAD = 200; // INR

export interface RefurbEstimate {
  totalCost: number;
  breakdown: Array<{ label: string; cost: number }>;
  needsRepair: boolean; // true if physical repair needed (not just cosmetic)
}

/**
 * Estimate refurbishment cost based on defect list from AI grading.
 */
export function estimateRefurbCost(defects: string[]): RefurbEstimate {
  const breakdown: Array<{ label: string; cost: number }> = [];
  let needsRepair = false;

  if (defects.length === 0) {
    return { totalCost: 0, breakdown: [], needsRepair: false };
  }

  const defectsLower = defects.map((d) => d.toLowerCase());

  for (const defectCost of DEFECT_COSTS) {
    const matched = defectsLower.some((d) =>
      defectCost.keywords.some((kw) => d.includes(kw))
    );
    if (matched) {
      breakdown.push({ label: defectCost.label, cost: defectCost.cost });
      // Mark as needing repair if cost > ₹1000 (not just cosmetic)
      if (defectCost.cost >= 1000) {
        needsRepair = true;
      }
    }
  }

  // If defects exist but none matched our keywords, add a generic cosmetic cost
  if (breakdown.length === 0 && defects.length > 0) {
    breakdown.push({ label: 'General cosmetic cleanup', cost: 150 });
  }

  const totalCost = breakdown.reduce((sum, b) => sum + b.cost, 0) + REFURB_BASE_OVERHEAD;

  return { totalCost, breakdown, needsRepair };
}

/**
 * Category-based refurbishment difficulty multiplier.
 * Some categories are harder/more expensive to refurbish at warehouse.
 */
const CATEGORY_REFURB_MULTIPLIER: Record<string, number> = {
  electronics: 1.5,    // needs specialized tools
  phones: 1.5,
  laptops: 1.8,
  footwear: 0.8,      // relatively simple
  winter_wear: 0.6,   // mostly cleaning
  baby_gear: 1.0,
  kitchen_appliances: 1.2,
  apparel: 0.5,       // mostly cleaning/stitching
  gaming: 1.4,
  audio: 1.3,
};

/**
 * Get category-adjusted refurbishment cost.
 */
export function getCategoryAdjustedRefurbCost(
  defects: string[],
  category: string
): RefurbEstimate {
  const base = estimateRefurbCost(defects);
  const multiplier = CATEGORY_REFURB_MULTIPLIER[category] ?? 1.0;

  return {
    totalCost: Math.round(base.totalCost * multiplier),
    breakdown: base.breakdown.map((b) => ({
      label: b.label,
      cost: Math.round(b.cost * multiplier),
    })),
    needsRepair: base.needsRepair,
  };
}
