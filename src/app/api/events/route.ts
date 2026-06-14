import { NextRequest, NextResponse } from 'next/server';
import { logEvent, getSellerInterestStats } from '@/lib/events';
import { getItemById } from '@/lib/store';

// POST: log an interest event
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, itemId, query, buyerCity, distanceKm, buyerId } = body as {
    type: 'view' | 'search';
    itemId?: string;
    query?: string;
    buyerCity: string;
    distanceKm: number;
    buyerId: string;
  };

  // Get seller ID from item if it's a view event
  let sellerId: string | undefined;
  if (type === 'view' && itemId) {
    const item = getItemById(itemId);
    sellerId = item?.ownerId;
  }

  const event = logEvent({ type, itemId, query, buyerCity, distanceKm, buyerId, sellerId });

  return NextResponse.json({ success: true, event });
}

// GET: get interest stats for a seller
export async function GET(request: NextRequest) {
  const sellerId = request.nextUrl.searchParams.get('sellerId');
  if (!sellerId) {
    return NextResponse.json({ error: 'sellerId required' }, { status: 400 });
  }

  const stats = getSellerInterestStats(sellerId);
  return NextResponse.json(stats);
}
