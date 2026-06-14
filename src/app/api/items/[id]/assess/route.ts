import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem } from '@/lib/store';
import { calculatePrice } from '@/lib/pricing';
import { matchBuyers } from '@/lib/matching';
import { computeRiskFlags } from '@/lib/risk';
import { decideRoute } from '@/lib/router';
import { Assessment, Grade } from '@/lib/types';

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

    // 3. Pricing
    const price = calculatePrice(item.originalPrice, grade.condition, matchResult.nearbyDemand);

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
    const updated = updateItem(id, { assessment, route });

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
