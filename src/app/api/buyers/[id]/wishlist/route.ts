import { NextRequest, NextResponse } from 'next/server';
import { getBuyers } from '@/lib/store';
import fs from 'fs';
import path from 'path';

const BUYERS_FILE = path.join(process.cwd(), 'data', 'buyers.json');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action, category } = body as { action: 'add' | 'remove'; category: string };

  if (!category) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }

  const buyers = getBuyers();
  const index = buyers.findIndex((b) => b.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
  }

  if (action === 'add') {
    if (!buyers[index].wishlist.includes(category)) {
      buyers[index].wishlist.push(category);
    }
  } else if (action === 'remove') {
    buyers[index].wishlist = buyers[index].wishlist.filter((c) => c !== category);
  }

  fs.writeFileSync(BUYERS_FILE, JSON.stringify(buyers, null, 2), 'utf-8');

  return NextResponse.json({ success: true, wishlist: buyers[index].wishlist });
}
