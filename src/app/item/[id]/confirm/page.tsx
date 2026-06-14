"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import HealthCard from "@/components/HealthCard";

interface ItemData {
  id: string;
  title: string;
  brand: string;
  category: string;
  originalPrice: number;
  ageMonths: number;
  ownerId: string;
  assessment?: {
    grade: {
      condition: string;
      defects: string[];
      summary: string;
      confidence: number;
    };
    price: number;
    riskFlags: string[];
    nearbyDemand: number;
  };
  route?: {
    path: string;
    reason: string;
    matchedBuyerId?: string;
    cost: { shipDirect: number; warehouseAlt: number; carbonKgSaved: number };
  };
}

interface TrustRecord {
  sellerId: string;
  score: number;
  totalDeals: number;
  acceptedAsGraded: number;
  disputes: number;
}

interface GreenCreditEntry {
  credits: number;
  action: string;
  carbonKgSaved: number;
}

const ESCROW_STEPS_FULL = [
  { title: "Buyer Pays into Escrow", description: "Funds held securely by platform until delivery is confirmed.", icon: "💳" },
  { title: "Delivery Agent Picks Up", description: "Same-trip pickup scheduled from seller's location.", icon: "📦" },
  { title: "Handoff to Buyer", description: "Item delivered and inspected by buyer.", icon: "🤝" },
  { title: "Buyer Accepts or Disputes", description: "Buyer verifies item matches the Health Card grade.", icon: "✅" },
];

const DONATE_STEPS = [
  { title: "Pickup Scheduled", description: "A volunteer will collect the item from your location.", icon: "📦" },
  { title: "Item Donated", description: "Your item reaches someone who needs it.", icon: "🎁" },
];

const REFURBISH_STEPS = [
  { title: "Pickup Scheduled", description: "Courier picks up the item for refurbishment.", icon: "📦" },
  { title: "Refurbishment Complete", description: "Item restored and listed for a new buyer.", icon: "🔧" },
  { title: "Sold to Buyer", description: "A buyer receives the refurbished item.", icon: "🤝" },
];

const RECYCLE_STEPS = [
  { title: "Pickup Scheduled", description: "Recycling partner collects the item.", icon: "📦" },
  { title: "Materials Recovered", description: "Item responsibly recycled — materials given a new life.", icon: "♻️" },
];

function getStepsForRoute(routePath: string) {
  switch (routePath) {
    case "donate": return DONATE_STEPS;
    case "refurbish":
    case "repair": return REFURBISH_STEPS;
    case "recycle": return RECYCLE_STEPS;
    default: return ESCROW_STEPS_FULL;
  }
}

function routeHasDispute(routePath: string) {
  return routePath === "ship_direct" || routePath === "list_hold";
}

export default function ConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ItemData | null>(null);
  const [trustRecord, setTrustRecord] = useState<TrustRecord | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState<"accepted" | "disputed" | null>(null);
  const [outcomeMessage, setOutcomeMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [greenCredits, setGreenCredits] = useState<GreenCreditEntry | null>(null);
  const [carbonSaved, setCarbonSaved] = useState(0);
  const [buyerCity, setBuyerCity] = useState("");
  const [loopCreated, setLoopCreated] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/items/${id}/escrow`);
      const json = await res.json();
      setItem(json.item);
      setTrustRecord(json.trustRecord);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const routePath = item?.route?.path ?? "ship_direct";
  const steps = getStepsForRoute(routePath);
  const hasDispute = routeHasDispute(routePath);
  const isLastStep = currentStep === steps.length - 1;

  const advanceStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/items/${id}/escrow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const json = await res.json();
      setOutcome("accepted");
      setOutcomeMessage(json.message);
      setTrustRecord(json.trustRecord);
      setGreenCredits(json.greenCredits);
      setCarbonSaved(json.carbonKgSaved ?? 0);
      setBuyerCity(json.buyerCity ?? "");
      setLoopCreated(json.loopItemCreated ?? false);
    } catch {
      setOutcomeMessage("Error processing.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDispute = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/items/${id}/escrow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute" }),
      });
      const json = await res.json();
      setOutcome("disputed");
      setOutcomeMessage(json.message);
      setTrustRecord(json.trustRecord);
    } catch {
      setOutcomeMessage("Error processing dispute.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-pulse text-xl">Loading…</div>
      </div>
    );
  }

  if (!item || !item.assessment) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="text-[var(--text-secondary)]">Item or assessment not found.</p>
        <Link href="/" className="mt-4 text-amber-400 hover:underline">← Home</Link>
      </div>
    );
  }

  const { assessment } = item;

  // Contextual titles
  const pageTitle = routePath === "donate" ? "Donation Flow" :
    routePath === "recycle" ? "Recycling Flow" :
    (routePath === "refurbish" || routePath === "repair") ? "Refurbishment Flow" :
    "Escrow & Handoff";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Home</Link>
      </div>

      {/* Outcome screen */}
      {outcome && (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-6 text-center ${
            outcome === "accepted" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
          }`}>
            <div className="text-5xl mb-3">{outcome === "accepted" ? "🎉" : "🛡️"}</div>
            <h2 className="text-xl font-bold">
              {outcome === "accepted"
                ? (routePath === "donate" ? "Donation Complete!" :
                   routePath === "recycle" ? "Recycling Complete!" :
                   "Transaction Complete!")
                : "Dispute Filed"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{outcomeMessage}</p>
          </div>

          {/* Proof of Impact */}
          {outcome === "accepted" && greenCredits && (
            <div className="rounded-2xl border-2 border-green-500/30 bg-gradient-to-b from-green-500/5 to-transparent p-6 text-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-green-400 mb-3">
                🌍 Proof of Impact
              </h3>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {routePath === "donate"
                  ? <>This item found a new home and avoided <span className="text-green-400">~{carbonSaved.toFixed(1)} kg CO₂</span> of waste</>
                  : routePath === "recycle"
                  ? <>Materials recovered — <span className="text-green-400">{carbonSaved.toFixed(1)} kg CO₂</span> saved from landfill</>
                  : <>This item avoided ~<span className="text-green-400">{carbonSaved.toFixed(1)} kg CO₂</span></>
                }
              </p>
              {buyerCity && routePath !== "donate" && routePath !== "recycle" && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  and went to <span className="text-[var(--text-primary)] font-medium">{buyerCity}</span>
                </p>
              )}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/30 px-4 py-2">
                <span className="text-lg">🌱</span>
                <span className="font-bold text-green-400">+{greenCredits.credits} Green Credits</span>
              </div>
              {loopCreated && (
                <p className="mt-3 text-xs text-[var(--text-secondary)] bg-neutral-800 rounded-lg p-2">
                  ♻️ This item is now pre-enrolled for the buyer — they can re-sell it in one tap!
                </p>
              )}
            </div>
          )}

          {/* Updated trust score */}
          {trustRecord && (
            <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
              <h3 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Seller Trust Score
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-neutral-800" stroke="currentColor" strokeWidth="3" fill="none"
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path
                      className={trustRecord.score >= 80 ? "text-green-400" : trustRecord.score >= 60 ? "text-amber-400" : "text-red-400"}
                      stroke="currentColor" strokeWidth="3" strokeDasharray={`${trustRecord.score}, 100`} fill="none"
                      d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{trustRecord.score}</span>
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  <p>{trustRecord.totalDeals} total deals</p>
                  <p>{trustRecord.acceptedAsGraded} accepted as graded</p>
                  <p>{trustRecord.disputes} dispute{trustRecord.disputes !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
          )}

          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-neutral-900 hover:bg-amber-400"
          >
            View Dashboard →
          </Link>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl border border-neutral-700 px-6 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ← Back to My Items
          </Link>
        </div>
      )}

      {/* Stepper (pre-outcome) */}
      {!outcome && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
            <div className="space-y-3">
              {steps.map((step, i) => {
                const isActive = i === currentStep;
                const isComplete = i < currentStep;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isComplete ? "bg-green-500/20 text-green-400 border border-green-500/40" :
                      isActive ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" :
                      "bg-neutral-800 text-neutral-500 border border-neutral-700"
                    }`}>
                      {isComplete ? "✓" : step.icon}
                    </div>
                    <div className={isActive ? "" : "opacity-50"}>
                      <p className={`text-sm font-semibold ${isActive ? "text-[var(--text-primary)]" : ""}`}>{step.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-neutral-800 pt-4">
              {!isLastStep && (
                <button
                  onClick={advanceStep}
                  className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
                >
                  Simulate: {steps[currentStep + 1]?.title || "Next"} →
                </button>
              )}
              {isLastStep && hasDispute && (
                <div className="flex gap-3">
                  <button onClick={handleAccept} disabled={processing}
                    className="flex-1 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-bold text-neutral-900 hover:bg-green-400 disabled:opacity-50">
                    {processing ? "Processing…" : "✓ Accept — Release Funds"}
                  </button>
                  <button onClick={handleDispute} disabled={processing}
                    className="flex-1 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50">
                    {processing ? "Processing…" : "✕ Dispute"}
                  </button>
                </div>
              )}
              {isLastStep && !hasDispute && (
                <button onClick={handleAccept} disabled={processing}
                  className="w-full rounded-xl bg-green-500 px-4 py-2.5 text-sm font-bold text-neutral-900 hover:bg-green-400 disabled:opacity-50">
                  {processing ? "Processing…" : "✓ Complete"}
                </button>
              )}
            </div>
          </div>

          {/* Health Card — shown during escrow for ship_direct/list_hold */}
          {(routePath === "ship_direct" || routePath === "list_hold") && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                Buyer sees this Health Card
              </p>
              <HealthCard
                title={item.title}
                brand={item.brand}
                category={item.category}
                originalPrice={item.originalPrice}
                ageMonths={item.ageMonths}
                condition={assessment.grade.condition}
                defects={assessment.grade.defects}
                summary={assessment.grade.summary}
                confidence={assessment.grade.confidence}
                riskFlags={assessment.riskFlags}
                trustScore={trustRecord?.score ?? 60}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
