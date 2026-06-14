import { NextResponse } from 'next/server';
import { getTrustRecord } from '@/lib/trust';
import { getUserGreenCredits } from '@/lib/green';

export async function GET() {
  const trust = getTrustRecord('user_self');
  const green = getUserGreenCredits('user_self');

  return NextResponse.json({
    trust,
    green: {
      totalCredits: green.totalCredits,
      totalCarbonKg: Math.round(green.totalCarbonKg * 100) / 100,
      entryCount: green.entries.length,
    },
  });
}
