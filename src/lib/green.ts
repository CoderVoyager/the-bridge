import fs from 'fs';
import path from 'path';

const GREEN_FILE = path.join(process.cwd(), 'data', 'green.json');

export type GreenAction =
  | 'prevent_a_return'
  | 'resell'
  | 'buy_refurbished'
  | 'donate'
  | 'recycle';

export interface GreenCredit {
  id: string;
  userId: string;
  itemId: string;
  action: GreenAction;
  credits: number;
  carbonKgSaved: number;
  description: string;
  timestamp: string;
}

/** Credits awarded per action type */
export const GREEN_CREDIT_TABLE: Record<GreenAction, number> = {
  prevent_a_return: 100,
  resell: 75,
  buy_refurbished: 70,
  donate: 50,
  recycle: 40,
};

/** CO₂ weight multiplier per action (kg saved base) */
export const CO2_WEIGHTS: Record<GreenAction, number> = {
  prevent_a_return: 2.5,
  resell: 1.0,
  buy_refurbished: 1.0,
  donate: 0.6,
  recycle: 0.4,
};

function readGreenLedger(): GreenCredit[] {
  const raw = fs.readFileSync(GREEN_FILE, 'utf-8');
  return JSON.parse(raw) as GreenCredit[];
}

function writeGreenLedger(data: GreenCredit[]): void {
  fs.writeFileSync(GREEN_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Award green credits for a completed action.
 */
export function awardGreenCredits(
  userId: string,
  itemId: string,
  action: GreenAction,
  carbonKgSaved: number,
  description: string
): GreenCredit {
  const ledger = readGreenLedger();
  const entry: GreenCredit = {
    id: `gc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    itemId,
    action,
    credits: GREEN_CREDIT_TABLE[action],
    carbonKgSaved,
    description,
    timestamp: new Date().toISOString(),
  };
  ledger.push(entry);
  writeGreenLedger(ledger);
  return entry;
}

/**
 * Get total green credits for a user.
 */
export function getUserGreenCredits(userId: string): { totalCredits: number; totalCarbonKg: number; entries: GreenCredit[] } {
  const ledger = readGreenLedger();
  const entries = ledger.filter((e) => e.userId === userId);
  const totalCredits = entries.reduce((sum, e) => sum + e.credits, 0);
  const totalCarbonKg = entries.reduce((sum, e) => sum + e.carbonKgSaved, 0);
  return { totalCredits, totalCarbonKg, entries };
}

/**
 * Get all green credits (for dashboard).
 */
export function getAllGreenCredits(): GreenCredit[] {
  return readGreenLedger();
}

/**
 * Reset the green ledger.
 */
export function resetGreenLedger(): void {
  writeGreenLedger([]);
}
