import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

const SEED_ITEMS = [
  {
    id: "item_01",
    title: "Nike Air Max 270",
    category: "footwear",
    brand: "Nike",
    originalPrice: 12995,
    ageMonths: 8,
    location: { lat: 19.076, lng: 72.8777, city: "Mumbai" },
    ownerId: "user_self",
    photos: [],
  },
  {
    id: "item_02",
    title: "Philips Avent Baby Monitor",
    category: "baby_gear",
    brand: "Philips",
    originalPrice: 7499,
    ageMonths: 14,
    location: { lat: 19.076, lng: 72.8777, city: "Mumbai" },
    ownerId: "user_self",
    photos: [],
  },
  {
    id: "item_03",
    title: "Samsung Galaxy S23",
    category: "electronics",
    brand: "Samsung",
    originalPrice: 74999,
    ageMonths: 11,
    location: { lat: 19.076, lng: 72.8777, city: "Mumbai" },
    ownerId: "user_self",
    photos: [],
  },
  {
    id: "item_04",
    title: "Woodland Winter Parka",
    category: "winter_wear",
    brand: "Woodland",
    originalPrice: 5999,
    ageMonths: 18,
    location: { lat: 19.076, lng: 72.8777, city: "Mumbai" },
    ownerId: "user_self",
    photos: [],
  },
  {
    id: "item_05",
    title: "Prestige Iris 750W Mixer Grinder",
    category: "kitchen_appliances",
    brand: "Prestige",
    originalPrice: 4299,
    ageMonths: 6,
    location: { lat: 19.076, lng: 72.8777, city: "Mumbai" },
    ownerId: "user_self",
    photos: [],
  },
];

const SEED_TRUST = {
  user_self: {
    sellerId: "user_self",
    score: 72,
    totalDeals: 3,
    acceptedAsGraded: 3,
    disputes: 0,
  },
};

export async function POST() {
  // Reset items
  fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(SEED_ITEMS, null, 2), 'utf-8');
  // Reset trust
  fs.writeFileSync(path.join(DATA_DIR, 'trust.json'), JSON.stringify(SEED_TRUST, null, 2), 'utf-8');
  // Reset green credits
  fs.writeFileSync(path.join(DATA_DIR, 'green.json'), '[]', 'utf-8');
  // Reset ledger
  fs.writeFileSync(path.join(DATA_DIR, 'ledger.json'), '[]', 'utf-8');

  return NextResponse.json({ success: true, message: 'Demo reset complete. All data restored to seed state.' });
}
