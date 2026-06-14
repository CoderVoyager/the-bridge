import { NextRequest, NextResponse } from 'next/server';
import { getItems } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const items = getItems();
  const buyerItems = items.filter((item) => item.ownerId === id);

  return NextResponse.json({
    items: buyerItems.map((item) => ({
      id: item.id,
      title: item.title,
      brand: item.brand,
      category: item.category,
      originalPrice: item.originalPrice,
      ageMonths: item.ageMonths,
      location: item.location,
      hasAssessment: !!item.assessment,
      condition: item.assessment?.grade?.condition,
    })),
  });
}
