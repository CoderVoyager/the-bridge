import fs from 'fs';
import path from 'path';
import { Item, Buyer, LedgerEntry, Seller } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

function readJSON<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJSON<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// --- Items ---

export function getItems(): Item[] {
  return readJSON<Item[]>('items.json');
}

export function getItemById(id: string): Item | undefined {
  const items = getItems();
  return items.find((item) => item.id === id);
}

export function updateItem(id: string, updates: Partial<Item>): Item | undefined {
  const items = getItems();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...updates };
  writeJSON('items.json', items);
  return items[index];
}

export function addItem(item: Item): void {
  const items = getItems();
  items.push(item);
  writeJSON('items.json', items);
}

// --- Buyers ---

export function getBuyers(): Buyer[] {
  return readJSON<Buyer[]>('buyers.json');
}

export function getBuyerById(id: string): Buyer | undefined {
  const buyers = getBuyers();
  return buyers.find((buyer) => buyer.id === id);
}

// --- Ledger ---

export function getLedger(): LedgerEntry[] {
  return readJSON<LedgerEntry[]>('ledger.json');
}

export function addLedgerEntry(entry: LedgerEntry): void {
  const ledger = getLedger();
  ledger.push(entry);
  writeJSON('ledger.json', ledger);
}

// --- Sellers ---

export function getSellers(): Seller[] {
  return readJSON<Seller[]>('sellers.json');
}

export function getSellerById(id: string): Seller | undefined {
  const sellers = getSellers();
  return sellers.find((s) => s.id === id);
}
