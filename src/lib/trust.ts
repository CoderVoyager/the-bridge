import fs from 'fs';
import path from 'path';

const TRUST_FILE = path.join(process.cwd(), 'data', 'trust.json');

export interface TrustRecord {
  sellerId: string;
  score: number;
  totalDeals: number;
  acceptedAsGraded: number;
  disputes: number;
}

type TrustStore = Record<string, TrustRecord>;

function readTrustStore(): TrustStore {
  const raw = fs.readFileSync(TRUST_FILE, 'utf-8');
  return JSON.parse(raw) as TrustStore;
}

function writeTrustStore(data: TrustStore): void {
  fs.writeFileSync(TRUST_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const BASELINE_SCORE = 60;

/**
 * Get trust record for a seller. Creates a baseline record if not found.
 */
export function getTrustRecord(sellerId: string): TrustRecord {
  const store = readTrustStore();
  if (!store[sellerId]) {
    store[sellerId] = {
      sellerId,
      score: BASELINE_SCORE,
      totalDeals: 0,
      acceptedAsGraded: 0,
      disputes: 0,
    };
    writeTrustStore(store);
  }
  return store[sellerId];
}

/**
 * Recalculate trust score from components.
 * Formula: base 60 + (acceptedAsGraded / totalDeals) * 30 + min(totalDeals, 10) - disputes * 10
 * Clamped 0–100.
 */
function computeScore(record: TrustRecord): number {
  if (record.totalDeals === 0) return BASELINE_SCORE;
  const accuracyBonus = (record.acceptedAsGraded / record.totalDeals) * 30;
  const volumeBonus = Math.min(record.totalDeals, 10);
  const disputePenalty = record.disputes * 10;
  const raw = BASELINE_SCORE + accuracyBonus + volumeBonus - disputePenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Record a successful deal (buyer accepted item as graded).
 */
export function recordSuccessfulDeal(sellerId: string): TrustRecord {
  const store = readTrustStore();
  if (!store[sellerId]) {
    store[sellerId] = { sellerId, score: BASELINE_SCORE, totalDeals: 0, acceptedAsGraded: 0, disputes: 0 };
  }
  store[sellerId].totalDeals += 1;
  store[sellerId].acceptedAsGraded += 1;
  store[sellerId].score = computeScore(store[sellerId]);
  writeTrustStore(store);
  return store[sellerId];
}

/**
 * Record a dispute (buyer rejected / requested refund).
 */
export function recordDispute(sellerId: string): TrustRecord {
  const store = readTrustStore();
  if (!store[sellerId]) {
    store[sellerId] = { sellerId, score: BASELINE_SCORE, totalDeals: 0, acceptedAsGraded: 0, disputes: 0 };
  }
  store[sellerId].totalDeals += 1;
  store[sellerId].disputes += 1;
  store[sellerId].score = computeScore(store[sellerId]);
  writeTrustStore(store);
  return store[sellerId];
}
