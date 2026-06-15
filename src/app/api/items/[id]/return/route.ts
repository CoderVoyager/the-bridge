import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem } from '@/lib/store';
import { matchBuyers } from '@/lib/matching';
import { ReturnHold } from '@/lib/types';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  if (item.returnHold) {
    return NextResponse.json({ error: 'Bridge return already initiated for this item.' }, { status: 400 });
  }

  // Check how many nearby buyers want this category
  const matchResult = matchBuyers(item.category, item.location);

  // Create the return hold
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const returnHold: ReturnHold = {
    status: 'holding',
    initiatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    refundAmount: item.originalPrice,
    originalDeliveryCharge: item.deliveryCharge ?? 0,
    deliveryCashback: 0,
    daysWaited: 0,
    viewCount: 0,
    interestedCount: matchResult.nearbyDemand,
  };

  // Also set a route so it appears in the shop as "open-box"
  const route = {
    path: 'ship_direct' as const,
    matchedBuyerId: matchResult.bestBuyerId,
    cost: {
      shipDirect: 40 + matchResult.bestBuyerDistanceKm * 1.5,
      warehouseAlt: 1320,
      carbonKgSaved: Math.round((600 - matchResult.bestBuyerDistanceKm) * 0.12 * 100) / 100,
    },
    reason: 'Bridge Return — holding for nearby buyer match.',
  };

  updateItem(id, { returnHold, route });

  return NextResponse.json({
    success: true,
    returnHold,
    interestedBuyersCount: matchResult.nearbyDemand,
    nearestBuyerDistanceKm: matchResult.bestBuyerDistanceKm,
    warehouseSaving: Math.round(route.cost.warehouseAlt - route.cost.shipDirect),
    carbonKgSaved: route.cost.carbonKgSaved,
  });
}

// GET: return buffer status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  if (!item.returnHold) {
    return NextResponse.json({ error: 'No active Bridge return for this item.' }, { status: 404 });
  }

  const hold = item.returnHold;
  const now = Date.now();
  const daysWaited = Math.floor((now - new Date(hold.initiatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - now) / (1000 * 60 * 60 * 24)));
  const deliveryCashback = Math.round((Math.min(daysWaited, 7) / 7) * hold.originalDeliveryCharge);

  return NextResponse.json({
    item: {
      id: item.id,
      title: item.title,
      brand: item.brand,
      category: item.category,
      originalPrice: item.originalPrice,
    },
    returnHold: hold,
    daysWaited,
    daysLeft,
    deliveryCashback,
    totalRefund: hold.refundAmount + deliveryCashback,
  });
}
