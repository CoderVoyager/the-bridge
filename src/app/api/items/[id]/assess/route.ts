import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem } from '@/lib/store';
import { calculatePrice } from '@/lib/pricing';
import { matchBuyers } from '@/lib/matching';
import { computeRiskFlags } from '@/lib/risk';
import { decideRoute } from '@/lib/router';
import { Assessment, Grade, Item } from '@/lib/types';
import { GoogleGenAI } from '@google/genai';

/**
 * Check if an item is within the return window (≤30 days from purchase).
 * These are Amazon's responsibility — warehouse is a valid routing option.
 */
function isWithinReturnWindow(item: Item): boolean {
  if (item.customListing) return false; // custom items are never Amazon returns
  if (!item.purchaseDate) return false;
  const daysSince = (Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince <= 30;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  if (!item.photos || item.photos.length === 0) {
    return NextResponse.json({ error: 'No photos on item. Run capture first.' }, { status: 400 });
  }

  try {
    // 1. Call grading API internally
    const gradeRes = await fetch(new URL('/api/grade', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: item.photos }),
    });

    if (!gradeRes.ok) {
      const errBody = await gradeRes.json();
      return NextResponse.json({ error: errBody.error || 'Grading failed' }, { status: 500 });
    }

    const { grade } = (await gradeRes.json()) as { grade: Grade };

    // 2. Pricing — different for Bridge Returns vs Resale (compute first for budget matching)
    let price: number;
    const isBridgeReturn = !!item.returnHold;

    if (isBridgeReturn) {
      // Open-box pricing: smaller discount (10-15% off) since item is near-new
      const openBoxFactors: Record<string, number> = {
        like_new: 0.90,  // 10% off
        good: 0.82,      // 18% off
        fair: 0.70,      // 30% off
        damaged: 0.50,   // 50% off
      };
      const factor = openBoxFactors[grade.condition] ?? 0.85;
      price = Math.round((item.originalPrice * factor) / 10) * 10;
    } else {
      // Normal resale pricing (deeper discounts for older items)
      price = calculatePrice(item.originalPrice, grade.condition, 5); // initial estimate with avg demand
    }

    // 3. Matching with budget filter (pass computed price for budget check)
    const matchResult = matchBuyers(item.category, item.location, price);

    // Recalculate price with actual demand if not bridge return
    if (!isBridgeReturn) {
      price = calculatePrice(item.originalPrice, grade.condition, matchResult.budgetMatchedDemand);
    }

    // 4. Risk flags
    const riskFlags = computeRiskFlags(item.category, item.brand, item.title);

    // Assemble assessment
    const assessment: Assessment = {
      grade,
      price,
      matchedBuyerId: matchResult.bestBuyerId,
      nearbyDemand: matchResult.nearbyDemand,
      riskFlags,
    };

    // 5. Route decision (internal logic)
    const route = decideRoute({
      assessment,
      buyerDistanceKm: matchResult.bestBuyerDistanceKm,
      category: item.category,
      originalPrice: item.originalPrice,
      budgetMatchedDemand: matchResult.budgetMatchedDemand,
      isReturnable: isBridgeReturn || isWithinReturnWindow(item),
    });

    // Save on item (assessment + route stored for buyer-side use)
    // Also generate complementary keywords using Gemini
    let complementaryKeywords: string[] = [];
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const kwResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [{
              text: `For a second-hand marketplace, what 5 accessories or complementary products would someone typically buy alongside a "${item.title}" (category: ${item.category}, brand: ${item.brand})? Return ONLY a JSON array of 5 short product keywords (2-3 words each, lowercase). No prose, no markdown fences.`
            }],
          }],
        });
        const kwText = (kwResponse.text ?? '').trim();
        const arrMatch = kwText.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          const parsed = JSON.parse(arrMatch[0]);
          if (Array.isArray(parsed)) {
            complementaryKeywords = parsed.slice(0, 5).map((k: unknown) => String(k).toLowerCase());
          }
        }
      }
    } catch {
      // Non-critical — if keyword generation fails, complementary section just won't show
    }

    const updated = updateItem(id, { assessment, route, complementaryKeywords });

    // Determine seller-facing recommendation — follows the router's decision
    const recommendation = riskFlags.includes('block_resale')
      ? 'recycle'
      : route.path === 'donate'
      ? 'donate'
      : route.path === 'refurbish' || route.path === 'repair'
      ? 'refurbish'
      : 'list'; // ship_direct and list_hold both mean "list on marketplace"

    // Total interested buyers count (budget-filtered for accuracy)
    const interestedBuyersCount = matchResult.budgetMatchedDemand;

    return NextResponse.json({
      success: true,
      // Seller-facing data (no buyer identity)
      grade,
      price,
      recommendation,
      interestedBuyersCount,
      riskFlags,
      costComparison: route.cost,
      carbonKgSaved: route.cost.carbonKgSaved,
      routeReason: route.reason,
      isReturnable: isBridgeReturn || isWithinReturnWindow(item),
      // Internal (not displayed to seller but needed)
      routePath: route.path,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Assessment error:', message);
    return NextResponse.json({ error: 'Assessment failed: ' + message }, { status: 500 });
  }
}
