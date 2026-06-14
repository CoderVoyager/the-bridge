import { NextRequest, NextResponse } from 'next/server';
import { getTrustRecord } from '@/lib/trust';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  const { sellerId } = await params;
  const record = getTrustRecord(sellerId);
  return NextResponse.json(record);
}
