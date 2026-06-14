import { NextRequest, NextResponse } from 'next/server';
import { addItem, getSellerById } from '@/lib/store';
import { Item } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, category, brand, askingPrice, ageMonths, sellerId } = body as {
    title: string;
    category: string;
    brand: string;
    askingPrice: number;
    ageMonths: number;
    sellerId: string;
  };

  if (!title || !category || !brand || !askingPrice || !sellerId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Get seller location
  const seller = getSellerById(sellerId);
  const location = seller?.location ?? { lat: 19.076, lng: 72.8777, city: "Mumbai" };

  const newItem: Item = {
    id: `item_custom_${Date.now()}`,
    title,
    category,
    brand,
    originalPrice: askingPrice,
    ageMonths: ageMonths || 0,
    location,
    ownerId: sellerId,
    photos: [],
    customListing: true,
  };

  addItem(newItem);

  return NextResponse.json({ success: true, item: newItem });
}
