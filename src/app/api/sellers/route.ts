import { NextResponse } from 'next/server';
import { getSellers } from '@/lib/store';

export async function GET() {
  const sellers = getSellers();
  const list = sellers.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.location.city,
    avatar: s.avatar,
  }));
  return NextResponse.json({ sellers: list });
}
