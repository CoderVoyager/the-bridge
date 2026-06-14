import fs from 'fs';
import path from 'path';

const EVENTS_FILE = path.join(process.cwd(), 'data', 'events.json');

export type EventType = 'view' | 'search';

export interface InterestEvent {
  id: string;
  type: EventType;
  itemId?: string;
  query?: string;
  buyerCity: string;
  distanceKm: number;
  buyerId: string;
  sellerId?: string;
  timestamp: string;
}

function readEvents(): InterestEvent[] {
  const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
  return JSON.parse(raw) as InterestEvent[];
}

function writeEvents(data: InterestEvent[]): void {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Log an interest event (view or search).
 */
export function logEvent(event: Omit<InterestEvent, 'id' | 'timestamp'>): InterestEvent {
  const events = readEvents();
  const entry: InterestEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  events.push(entry);
  writeEvents(events);
  return entry;
}

/**
 * Get interest events for a specific seller's items.
 */
export function getEventsForSeller(sellerId: string): InterestEvent[] {
  const events = readEvents();
  return events
    .filter((e) => e.sellerId === sellerId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Get aggregate interest stats for a seller's items.
 */
export function getSellerInterestStats(sellerId: string): {
  totalViews: number;
  totalSearches: number;
  recentEvents: InterestEvent[];
  itemViews: Record<string, number>;
} {
  const events = getEventsForSeller(sellerId);
  const totalViews = events.filter((e) => e.type === 'view').length;
  const totalSearches = events.filter((e) => e.type === 'search').length;

  const itemViews: Record<string, number> = {};
  for (const e of events) {
    if (e.type === 'view' && e.itemId) {
      itemViews[e.itemId] = (itemViews[e.itemId] ?? 0) + 1;
    }
  }

  return {
    totalViews,
    totalSearches,
    recentEvents: events.slice(0, 20), // last 20
    itemViews,
  };
}

/**
 * Reset events.
 */
export function resetEvents(): void {
  writeEvents([]);
}
