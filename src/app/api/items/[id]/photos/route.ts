import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem } from '@/lib/store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const body = await request.json();
  const { photos } = body as { photos: string[] };

  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
  }

  const updated = updateItem(id, { photos });

  return NextResponse.json({ success: true, item: updated });
}
