import { NextRequest, NextResponse } from 'next/server';
import { getBuyerNotifications, getUnreadCount, markAsRead, markAllRead } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  const buyerId = request.nextUrl.searchParams.get('buyerId');
  if (!buyerId) {
    return NextResponse.json({ error: 'buyerId required' }, { status: 400 });
  }

  const notifications = getBuyerNotifications(buyerId);
  const unreadCount = getUnreadCount(buyerId);

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, notificationId, buyerId } = body as {
    action: 'markRead' | 'markAllRead';
    notificationId?: string;
    buyerId?: string;
  };

  if (action === 'markRead' && notificationId) {
    markAsRead(notificationId);
    return NextResponse.json({ success: true });
  }

  if (action === 'markAllRead' && buyerId) {
    markAllRead(buyerId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
