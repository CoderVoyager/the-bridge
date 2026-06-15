import { NextResponse } from 'next/server';
import { getTrustRecord } from '@/lib/trust';
import { getUserGreenCredits } from '@/lib/green';
import { getItems } from '@/lib/store';

export async function GET() {
  const trust = getTrustRecord('user_self');
  const green = getUserGreenCredits('user_self');
  const items = getItems();

  // Count Bridge Return stats
  const bridgeReturns = items.filter((i) => i.returnHold);
  const activeHolds = bridgeReturns.filter((i) => i.returnHold?.status === 'holding').length;
  const matchedReturns = bridgeReturns.filter((i) => i.returnHold?.status === 'matched').length;
  const totalWarehouseSaved = matchedReturns * 1278; // approx per return

  return NextResponse.json({
    trust,
    green: {
      totalCredits: green.totalCredits,
      totalCarbonKg: Math.round(green.totalCarbonKg * 100) / 100,
      entryCount: green.entries.length,
    },
    bridgeReturns: {
      activeHolds,
      matchedReturns,
      totalWarehouseSaved,
    },
  });
}
