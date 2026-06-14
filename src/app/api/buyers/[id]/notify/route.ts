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
  const { action, category, maxPrice } = body as {
    action: 'add' | 'remove';
    category: string;
    maxPrice?: number;
  };

  if (!category) {
    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  }

  const buyers = getBuyers();
  const index = buyers.findIndex((b) => b.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
  }

  if (action === 'add') {
    const existing = buyers[index].notifyList.find((n) => n.category === category);
    if (existing) {
      existing.maxPrice = maxPrice ?? existing.maxPrice;
    } else {
      buyers[index].notifyList.push({ category, maxPrice: maxPrice ?? 99999 });
    }
  } else if (action === 'remove') {
    buyers[index].notifyList = buyers[index].notifyList.filter((n) => n.category !== category);
  }

  fs.writeFileSync(BUYERS_FILE, JSON.stringify(buyers, null, 2), 'utf-8');

  return NextResponse.json({ success: true, notifyList: buyers[index].notifyList });
}
