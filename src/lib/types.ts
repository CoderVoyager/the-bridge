// === Core Types for The Bridge ===

export type Condition = 'like_new' | 'good' | 'fair' | 'damaged';

export interface Grade {
  condition: Condition;
  defects: string[];
  summary: string;
  confidence: number; // 0-1
}

export interface Assessment {
  grade: Grade;
  price: number; // INR
  matchedBuyerId?: string;
  nearbyDemand: number;
  riskFlags: string[];
}

export interface RouteDecision {
  path: 'ship_direct' | 'refurbish' | 'repair' | 'donate' | 'recycle' | 'list_hold';
  matchedBuyerId?: string;
  cost: {
    shipDirect: number;
    warehouseAlt: number;
    carbonKgSaved: number;
  };
  reason: string;
}

export interface Location {
  lat: number;
  lng: number;
  city: string;
}

// === Return Hold (Bridge Return Buffer) ===

export type ReturnHoldStatus = 'holding' | 'matched' | 'expired' | 'completed';

export interface ReturnHold {
  status: ReturnHoldStatus;
  initiatedAt: string; // ISO timestamp
  expiresAt: string;   // 7 days from initiation
  refundAmount: number;
  originalDeliveryCharge: number;
  deliveryCashback: number;
  daysWaited: number;
  viewCount: number;
  interestedCount: number;
}

// === Item ===

export interface Item {
  id: string;
  title: string;
  category: string;
  brand: string;
  originalPrice: number; // INR
  ageMonths: number;
  location: Location;
  ownerId: string;
  photos: string[];
  assessment?: Assessment;
  route?: RouteDecision;
  customListing?: boolean;      // true if not an Amazon purchase
  purchaseDate?: string;        // ISO date — when the item was purchased
  deliveryCharge?: number;      // original delivery charge paid (INR)
  returnHold?: ReturnHold;      // Bridge return buffer state
  complementaryKeywords?: string[]; // AI-generated keywords for cross-selling
}

/**
 * Check if an item is within the return window (30 days from purchase).
 */
export function isReturnable(item: Item): boolean {
  if (item.customListing) return false;
  if (!item.purchaseDate) return false;
  const purchaseMs = new Date(item.purchaseDate).getTime();
  const daysSincePurchase = (Date.now() - purchaseMs) / (1000 * 60 * 60 * 24);
  return daysSincePurchase <= 30;
}

/**
 * Compute delivery cashback based on days waited.
 * Linear: (daysWaited / 7) * originalDeliveryCharge
 */
export function computeDeliveryCashback(daysWaited: number, originalDeliveryCharge: number): number {
  const ratio = Math.min(daysWaited / 7, 1);
  return Math.round(ratio * originalDeliveryCharge);
}

// === Seller ===

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  location: Location;
  trustScore: number;
  totalDeals: number;
}

// === Buyer ===

export type PriceSensitivity = 'deal' | 'mid' | 'premium';

export interface PurchaseHistoryEntry {
  category: string;
  brand: string;
}

export interface NotifyEntry {
  category: string;
  maxPrice: number;
}

export interface SizeProfile {
  shoeSize?: string;
  clothingSize?: string;
}

export interface Buyer {
  id: string;
  name: string;
  location: Location;
  wishlist: string[]; // categories
  trustScore: number;
  purchaseHistory: PurchaseHistoryEntry[];
  recentlyViewed: string[]; // categories
  sizeProfile: SizeProfile;
  priceSensitivity: PriceSensitivity;
  notifyList: NotifyEntry[];
}

// === Ledger ===

export interface LedgerEntry {
  id: string;
  itemId: string;
  sellerId: string;
  buyerId: string;
  price: number;
  route: RouteDecision['path'];
  carbonKgSaved: number;
  creditsEarned: number;
  timestamp: string; // ISO date
}
