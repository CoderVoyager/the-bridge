import { NextRequest, NextResponse } from 'next/server';
import { getItemById, getBuyerById } from '@/lib/store';
import { getTrustRecord } from '@/lib/trust';
import { distanceKm } from '@/lib/buyer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const buyerId = request.nextUrl.searchParams.get('buyerId');

  const item = getItemById(id);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const sellerTrust = getTrustRecord(item.ownerId);
  const buyer = buyerId ? getBuyerById(buyerId) : null;
  const distance = buyer ? Math.round(distanceKm(buyer.location, item.location)) : null;

  return NextResponse.json({
    item,
    sellerTrust,
    distanceKm: distance,
    isNearby: distance !== null && distance <= 25,
  });
}
