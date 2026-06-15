import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem } from '@/lib/store';
import { computeDeliveryCashback } from '@/lib/types';

/**
 * POST: Advance the buffer timer by 1 day (demo helper).
 * Also checks if buffer has expired.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item || !item.returnHold) {
    return NextResponse.json({ error: 'No active Bridge return.' }, { status: 404 });
  }

  const hold = item.returnHold;
  if (hold.status !== 'holding') {
    return NextResponse.json({ error: 'Return hold is no longer active.' }, { status: 400 });
  }

  // Advance by moving initiatedAt back by 1 day (simulates time passing)
  const initiated = new Date(hold.initiatedAt);
  initiated.setDate(initiated.getDate() - 1);

  const now = Date.now();
  const daysWaited = Math.floor((now - initiated.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, 7 - daysWaited);

  const cashback = computeDeliveryCashback(daysWaited, hold.originalDeliveryCharge);

  // Check if expired
  if (daysWaited >= 7) {
    const updatedHold = {
      ...hold,
      status: 'expired' as const,
      initiatedAt: initiated.toISOString(),
      daysWaited: 7,
      deliveryCashback: hold.originalDeliveryCharge, // full cashback on expire
    };
    // Remove from shop (no longer available)
    updateItem(id, { returnHold: updatedHold, route: undefined });

    return NextResponse.json({
      success: true,
      expired: true,
      message: 'Buffer expired. Full delivery cashback awarded. Normal return proceeds.',
      daysWaited: 7,
      daysLeft: 0,
      deliveryCashback: hold.originalDeliveryCharge,
      totalRefund: hold.refundAmount + hold.originalDeliveryCharge,
    });
  }

  // Update hold with advanced time
  const updatedHold = {
    ...hold,
    initiatedAt: initiated.toISOString(),
    daysWaited,
    deliveryCashback: cashback,
  };
  updateItem(id, { returnHold: updatedHold });

  return NextResponse.json({
    success: true,
    expired: false,
    daysWaited,
    daysLeft,
    deliveryCashback: cashback,
    totalRefund: hold.refundAmount + cashback,
  });
}
