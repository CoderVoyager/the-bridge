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
  customListing?: boolean; // true if not an Amazon purchase
}

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  location: Location;
  trustScore: number;
  totalDeals: number;
}

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
