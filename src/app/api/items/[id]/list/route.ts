import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem } from '@/lib/store';
import { awardGreenCredits } from '@/lib/green';
import { notifyMatchingBuyers } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  if (!item.assessment) {
    return NextResponse.json({ error: 'Item not yet graded. Complete capture first.' }, { status: 400 });
  }

  // Check the action — list on marketplace OR donate OR recycle
  const body = await request.json().catch(() => ({}));
  const action = (body as { action?: string }).action ?? 'list';

  if (action === 'donate') {
    // Mark as donated — NOT listed on marketplace
    const route = {
      path: 'donate' as const,
      reason: 'Donated by seller — goes to verified charity partner.',
      cost: item.route?.cost ?? { shipDirect: 0, warehouseAlt: 0, carbonKgSaved: 0 },
    };
    updateItem(id, { route });

    // Award green credits for donation
    awardGreenCredits(
      item.ownerId,
      item.id,
      'donate',
      5, // ~5 kg CO₂ saved vs landfill
      `Donated ${item.title}`
    );

    return NextResponse.json({ success: true, message: 'Item donated! You earned 50 Green Credits. 🎁' });
  }

  if (action === 'recycle') {
    const route = {
      path: 'recycle' as const,
      reason: 'Scheduled for safe recycling pickup.',
      cost: item.route?.cost ?? { shipDirect: 0, warehouseAlt: 0, carbonKgSaved: 0 },
    };
    updateItem(id, { route });

    return NextResponse.json({ success: true, message: 'Recycling pickup scheduled. Materials will be responsibly recovered. ♻️' });
  }

  // Default: list on marketplace
  const currentPath = item.route?.path;
  if (!currentPath || (currentPath !== 'ship_direct' && currentPath !== 'list_hold')) {
    const route = {
      ...item.route,
      path: 'list_hold' as const,
      reason: 'Listed on marketplace by seller.',
      cost: item.route?.cost ?? { shipDirect: 0, warehouseAlt: 0, carbonKgSaved: 0 },
    };
    updateItem(id, { route });
  }

  // Notify matching buyers
  const price = item.assessment?.price ?? item.originalPrice;
  notifyMatchingBuyers(item, price);

  return NextResponse.json({ success: true, message: 'Item is now live on the marketplace!' });
}
