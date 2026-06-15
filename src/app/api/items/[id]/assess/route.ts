import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem } from '@/lib/store';
import { calculatePrice } from '@/lib/pricing';
import { matchBuyers } from '@/lib/matching';
import { computeRiskFlags } from '@/lib/risk';
import { decideRoute } from '@/lib/router';
import { Assessment, Grade } from '@/lib/types';
import { GoogleGenAI } from '@google/genai';

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

    // 2. Matching (internal — for demand count only, not shown to seller)
    const matchResult = matchBuyers(item.category, item.location);

    // 3. Pricing — different for Bridge Returns vs Resale
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
      price = calculatePrice(item.originalPrice, grade.condition, matchResult.nearbyDemand);
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

    // Determine seller-facing recommendation
    const isListable = !riskFlags.includes('block_resale') && price >= route.cost.shipDirect;
    const recommendation = riskFlags.includes('block_resale')
      ? 'recycle'
      : !isListable
      ? 'donate'
      : 'list';

    // Total interested buyers count (anonymous)
    const interestedBuyersCount = matchResult.nearbyDemand;

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
      // Internal (not displayed to seller but needed)
      routePath: route.path,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Assessment error:', message);
    return NextResponse.json({ error: 'Assessment failed: ' + message }, { status: 500 });
  }
}
