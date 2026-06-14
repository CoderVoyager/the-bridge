import { NextRequest, NextResponse } from 'next/server';
import { getItemById, updateItem } from '@/lib/store';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = getItemById(id);

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  if (!item.route) {
    return NextResponse.json({ error: 'No route decision on item. Run assessment first.' }, { status: 400 });
  }

  // Route is already saved — this endpoint just confirms the user accepted it
  const updated = updateItem(id, { route: item.route });

  return NextResponse.json({ success: true, item: updated });
}
