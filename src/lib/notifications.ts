import fs from 'fs';
import path from 'path';
import { Item, Buyer, Location } from './types';
import { getBuyers } from './store';
import { WAREHOUSE_DISTANCE_KM } from './config';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'notifications.json');

// Notify buyers within this % of warehouse distance
const NOTIFY_THRESHOLD_RATIO = 0.5; // 50% of warehouse distance = 300km max
const NOTIFY_THRESHOLD_KM = WAREHOUSE_DISTANCE_KM * NOTIFY_THRESHOLD_RATIO;

// Priority tiers (% of warehouse distance)
const HIGH_PRIORITY_RATIO = 0.05;   // < 5% = 30km (same city)
const MEDIUM_PRIORITY_RATIO = 0.15; // < 15% = 90km (nearby)
// Anything else up to 50% = low priority

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  buyerId: string;
  buyerName: string;
  itemId: string;
  itemTitle: string;
  itemBrand: string;
  itemCategory: string;
  itemPrice: number;
  distanceKm: number;
  priority: NotificationPriority;
  message: string;
  read: boolean;
  timestamp: string;
}

function haversineKm(a: Location, b: Location): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function getPriority(distanceKm: number): NotificationPriority {
  const highThreshold = WAREHOUSE_DISTANCE_KM * HIGH_PRIORITY_RATIO;    // 30km
  const medThreshold = WAREHOUSE_DISTANCE_KM * MEDIUM_PRIORITY_RATIO;   // 90km
  
  if (distanceKm <= highThreshold) return 'high';
  if (distanceKm <= medThreshold) return 'medium';
  return 'low';
}

function getMessage(priority: NotificationPriority, itemTitle: string, distanceKm: number, price: number): string {
  const priceStr = `₹${price.toLocaleString('en-IN')}`;
  switch (priority) {
    case 'high':
      return `🔥 Near you! ${itemTitle} just listed ${distanceKm}km away for ${priceStr} — same-day delivery possible!`;
    case 'medium':
      return `${itemTitle} available in your region (${distanceKm}km) for ${priceStr}`;
    case 'low':
      return `${itemTitle} listed in your state (${distanceKm}km) for ${priceStr}`;
  }
}

function readNotifications(): Notification[] {
  try {
    const raw = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
    return JSON.parse(raw) as Notification[];
  } catch {
    return [];
  }
}

function writeNotifications(data: Notification[]): void {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore on serverless (Vercel)
  }
}

/**
 * When an item is listed/initiated for return, find all matching buyers
 * within the economic threshold and create notifications for them.
 */
export function notifyMatchingBuyers(item: Item, price: number): Notification[] {
  const buyers = getBuyers();
  const created: Notification[] = [];
  const existing = readNotifications();

  for (const buyer of buyers) {
    // Check if buyer wants this category (wishlist or notifyList)
    const wantsCategory = buyer.wishlist.includes(item.category);
    const notifyEntry = buyer.notifyList.find((n) => n.category === item.category);
    
    if (!wantsCategory && !notifyEntry) continue;

    // Check budget (if notifyList has maxPrice)
    if (notifyEntry && notifyEntry.maxPrice < price) continue;

    // Check distance
    const dist = Math.round(haversineKm(item.location, buyer.location));
    if (dist > NOTIFY_THRESHOLD_KM) continue;

    // Don't duplicate (same buyer + same item)
    const alreadyNotified = existing.some(
      (n) => n.buyerId === buyer.id && n.itemId === item.id
    );
    if (alreadyNotified) continue;

    const priority = getPriority(dist);
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      buyerId: buyer.id,
      buyerName: buyer.name,
      itemId: item.id,
      itemTitle: item.title,
      itemBrand: item.brand,
      itemCategory: item.category,
      itemPrice: price,
      distanceKm: dist,
      priority,
      message: getMessage(priority, item.title, dist, price),
      read: false,
      timestamp: new Date().toISOString(),
    };

    created.push(notification);
  }

  // Save all new notifications
  if (created.length > 0) {
    const all = [...existing, ...created];
    writeNotifications(all);
  }

  return created;
}

/**
 * Get notifications for a specific buyer (unread first, then read).
 */
export function getBuyerNotifications(buyerId: string): Notification[] {
  const all = readNotifications();
  return all
    .filter((n) => n.buyerId === buyerId)
    .sort((a, b) => {
      // Unread first, then by timestamp desc
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

/**
 * Get unread count for a buyer.
 */
export function getUnreadCount(buyerId: string): number {
  const all = readNotifications();
  return all.filter((n) => n.buyerId === buyerId && !n.read).length;
}

/**
 * Mark a notification as read.
 */
export function markAsRead(notificationId: string): void {
  const all = readNotifications();
  const index = all.findIndex((n) => n.id === notificationId);
  if (index !== -1) {
    all[index].read = true;
    writeNotifications(all);
  }
}

/**
 * Mark all notifications for a buyer as read.
 */
export function markAllRead(buyerId: string): void {
  const all = readNotifications();
  let changed = false;
  for (const n of all) {
    if (n.buyerId === buyerId && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) writeNotifications(all);
}

/**
 * Reset notifications.
 */
export function resetNotifications(): void {
  writeNotifications([]);
}
