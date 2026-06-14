import { NextRequest, NextResponse } from 'next/server';
import { getItemById, getBuyerById, addItem } from '@/lib/store';
import { recordSuccessfulDeal, recordDispute, getTrustRecord } from '@/lib/trust';
import { awardGreenCredits } from '@/lib/green';
import { distanceKm } from '@/lib/buyer';
import { Item } from '@/lib/types';

const CARBON_PER_KM = 0.12;
const WAREHOUSE_DISTANCE_KM = 600;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { buyerId, action } = body as { buyerId: string; action: 'accept' | 'dispute' };

  const item = getItemById(id);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const buyer = getBuyerById(buyerId);
  if (!buyer) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
  }

  if (action === 'accept') {
    // Bump seller trust
    const sellerTrust = recordSuccessfulDeal(item.ownerId);

    // Bump buyer trust (reusing same system, keyed by buyer id)
    const buyerTrust = recordSuccessfulDeal(buyerId);

    // Compute savings
    const resalePrice = item.assessment?.price ?? item.originalPrice;
    const priceSaving = item.originalPrice - resalePrice;
    const dist = distanceKm(buyer.location, item.location);
    const carbonKgSaved = (WAREHOUSE_DISTANCE_KM - dist) * CARBON_PER_KM;

    // Award buyer green credits
    const greenEntry = awardGreenCredits(
      buyerId,
      item.id,
      'buy_refurbished',
      Math.max(0, Math.round(carbonKgSaved * 100) / 100),
      `Bought ${item.title} second-life`
    );

    // THE LOOP: create new item owned by buyer (pre-enrolled)
    const loopItem: Item = {
      id: `item_buyer_${Date.now()}`,
      title: item.title,
      category: item.category,
      brand: item.brand,
      originalPrice: resalePrice, // their purchase price becomes the new "original"
      ageMonths: item.ageMonths + 1,
      location: buyer.location,
      ownerId: buyerId,
      photos: [],
      // Pre-enrolled with existing grade
      assessment: item.assessment
        ? { ...item.assessment, matchedBuyerId: undefined, nearbyDemand: 0 }
        : undefined,
    };
    addItem(loopItem);

    return NextResponse.json({
      success: true,
      outcome: 'accepted',
      message: 'Purchase complete! Funds released to seller.',
      sellerTrust,
      buyerTrust,
      greenCredits: greenEntry,
      priceSaving,
      carbonKgSaved: Math.max(0, Math.round(carbonKgSaved * 100) / 100),
      loopItemId: loopItem.id,
    });
  } else if (action === 'dispute') {
    // Seller trust penalized
    const sellerTrust = recordDispute(item.ownerId);
    // Buyer trust: just count as a deal, no accept bonus
    const buyerTrust = getTrustRecord(buyerId);

    return NextResponse.json({
      success: true,
      outcome: 'disputed',
      message: 'Dispute filed. Full refund issued under Amazon guarantee. Seller notified.',
      sellerTrust,
      buyerTrust,
      greenCredits: null,
      priceSaving: 0,
      carbonKgSaved: 0,
      loopItemId: null,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
