import { NextRequest, NextResponse } from 'next/server';
import { getItemById, getBuyerById, getItems } from '@/lib/store';
import { getTrustRecord } from '@/lib/trust';
import { distanceKm } from '@/lib/buyer';
import { findComplementaryItems } from '@/lib/complementary';

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

  // Open-box info
  const isOpenBox = !!item.returnHold && item.returnHold.status === 'holding';
  const openBoxDaysLeft = isOpenBox
    ? Math.max(0, Math.ceil((new Date(item.returnHold!.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Complementary items (simulates Amazon's Product Graph)
  const allItems = getItems();
  const complementaryItems = findComplementaryItems(item, allItems);

  return NextResponse.json({
    item,
    sellerTrust,
    distanceKm: distance,
    isNearby: distance !== null && distance <= 25,
    isOpenBox,
    openBoxDaysLeft,
    complementaryItems,
  });
}
