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

  if (!item.assessment) {
    return NextResponse.json({ error: 'Item not yet graded. Complete capture first.' }, { status: 400 });
  }

  // Ensure the route is set to a listable path
  // If router said ship_direct or list_hold, keep it. Otherwise set to list_hold.
  const currentPath = item.route?.path;
  if (!currentPath || (currentPath !== 'ship_direct' && currentPath !== 'list_hold')) {
    const route = {
      ...item.route,
      path: 'list_hold' as const,
      reason: 'Listed on marketplace by seller.',
      cost: item.route?.cost ?? { shipDirect: 0, warehouseAlt: 0, carbonKgSaved: 0 },
    };
    updateItem(id, { route });
  }

  return NextResponse.json({ success: true, message: 'Item is now live on the marketplace!' });
}
