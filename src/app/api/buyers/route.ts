import { NextResponse } from 'next/server';
import { getBuyers } from '@/lib/store';

export async function GET() {
  const buyers = getBuyers();
  // Return minimal info for the role switcher
  const list = buyers.map((b) => ({
    id: b.id,
    name: b.name,
    city: b.location.city,
  }));
  return NextResponse.json({ buyers: list });
}
