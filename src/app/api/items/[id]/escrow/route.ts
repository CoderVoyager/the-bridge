import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem, getItems } from '@/lib/store';
import { recordSuccessfulDeal, recordDispute, getTrustRecord } from '@/lib/trust';
import { awardGreenCredits, GreenAction } from '@/lib/green';
import { getBuyerById } from '@/lib/store';
import fs from 'fs';
import path from 'path';
import { Item } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const body = await request.json();
  const { action } = body as { action: 'accept' | 'dispute' };

  if (action === 'accept') {
    const trustRec = recordSuccessfulDeal(item.ownerId);

    // Determine green action based on route
    const routePath = item.route?.path;
    let greenAction: GreenAction = 'resell';
    if (routePath === 'donate') greenAction = 'donate';
    else if (routePath === 'recycle') greenAction = 'recycle';
    else if (routePath === 'refurbish' || routePath === 'repair') greenAction = 'buy_refurbished';
    else if (routePath === 'ship_direct') greenAction = 'resell';

    const carbonSaved = item.route?.cost?.carbonKgSaved ?? 0;
    const buyerCity = item.route?.matchedBuyerId
      ? getBuyerById(item.route.matchedBuyerId)?.location.city ?? 'a new owner'
      : 'a new owner';

    // Award green credits
    const greenEntry = awardGreenCredits(
      item.ownerId,
      item.id,
      greenAction,
      carbonSaved,
      `${item.title} → ${buyerCity}`
    );

    // THE LOOP: for ship_direct, create a new item owned by the buyer (pre-enrolled)
    let loopItem: Item | null = null;
    if (routePath === 'ship_direct' && item.route?.matchedBuyerId) {
      const buyer = getBuyerById(item.route.matchedBuyerId);
      if (buyer) {
        loopItem = {
          id: `item_loop_${Date.now()}`,
          title: item.title,
          category: item.category,
          brand: item.brand,
          originalPrice: item.assessment?.price ?? item.originalPrice,
          ageMonths: item.ageMonths + 1, // slightly older
          location: buyer.location,
          ownerId: buyer.id,
          photos: [], // fresh start for new owner
          // Pre-enrolled: assessment carried over as reference
          assessment: item.assessment
            ? { ...item.assessment, matchedBuyerId: undefined, nearbyDemand: 0 }
            : undefined,
        };

        // Add to items store
        const items = getItems();
        items.push(loopItem);
        const DATA_DIR = path.join(process.cwd(), 'data');
        fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(items, null, 2), 'utf-8');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Funds released to seller. Transaction complete!',
      trustRecord: trustRec,
      greenCredits: greenEntry,
      carbonKgSaved: carbonSaved,
      buyerCity,
      loopItemCreated: loopItem ? true : false,
      loopItemId: loopItem?.id,
    });
  } else if (action === 'dispute') {
    const trustRec = recordDispute(item.ownerId);
    return NextResponse.json({
      success: true,
      message: 'Dispute filed. Buyer refunded under guarantee. Seller score affected.',
      trustRecord: trustRec,
      greenCredits: null,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const trustRecord = getTrustRecord(item.ownerId);
  return NextResponse.json({ item, trustRecord });
}
