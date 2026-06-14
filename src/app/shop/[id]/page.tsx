"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRole } from "@/components/RoleContext";
import HealthCard from "@/components/HealthCard";
import Link from "next/link";

interface ItemData {
  id: string;
  title: string;
  brand: string;
  category: string;
  originalPrice: number;
  ageMonths: number;
  ownerId: string;
  photos: string[];
  assessment?: {
    grade: { condition: string; defects: string[]; summary: string; confidence: number };
    price: number;
    riskFlags: string[];
  };
  route?: { path: string; cost: { carbonKgSaved: number } };
}

interface TrustRecord {
  score: number;
  totalDeals: number;
  acceptedAsGraded: number;
  disputes: number;
}

interface BuyResult {
  outcome: string;
  message: string;
  sellerTrust: TrustRecord;
  buyerTrust: TrustRecord;
  greenCredits: { credits: number } | null;
  priceSaving: number;
  carbonKgSaved: number;
  loopItemId: string | null;
}

const BUY_STEPS = [
  { title: "Pay into Escrow", description: "Funds held securely — not released until you accept.", icon: "💳" },
  { title: "Delivery", description: "", icon: "🚚" },
  { title: "Inspect Item", description: "24-hour inspection window. Check against the Health Card.", icon: "🔍" },
  { title: "Accept or Dispute", description: "Happy? Release funds. Not as described? Full refund.", icon: "✅" },
];

export default function BuyerItemPage() {
  const { id } = useParams<{ id: string }>();
  const { activeBuyer } = useRole();
  const router = useRouter();

  const [item, setItem] = useState<ItemData | null>(null);
  const [sellerTrust, setSellerTrust] = useState<TrustRecord | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isNearby, setIsNearby] = useState(false);
  const [loading, setLoading] = useState(true);

  // Buy flow state
  const [buying, setBuying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<BuyResult | null>(null);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    const params = activeBuyer ? `?buyerId=${activeBuyer.id}` : "";
    try {
      const res = await fetch(`/api/shop/${id}${params}`);
      const json = await res.json();
      setItem(json.item);
      setSellerTrust(json.sellerTrust);
      setDistanceKm(json.distanceKm);
      setIsNearby(json.isNearby);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, [id, activeBuyer]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const startBuy = () => setBuying(true);
  const advanceStep = () => setCurrentStep((s) => Math.min(s + 1, BUY_STEPS.length - 1));

  const handleAction = async (action: "accept" | "dispute") => {
    if (!activeBuyer) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/shop/${id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: activeBuyer.id, action }),
      });
      const json = await res.json();
      setResult(json);
    } catch {
      setResult({ outcome: "error", message: "Something went wrong.", sellerTrust: sellerTrust!, buyerTrust: { score: 0, totalDeals: 0, acceptedAsGraded: 0, disputes: 0 }, greenCredits: null, priceSaving: 0, carbonKgSaved: 0, loopItemId: null });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-pulse text-[var(--text-secondary)]">Loading…</div>
      </div>
    );
  }

  if (!item || !item.assessment) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="text-[var(--text-secondary)]">Item not found or not yet graded.</p>
        <Link href="/shop" className="mt-4 text-amber-400 hover:underline">← Back to Shop</Link>
      </div>
    );
  }

  const { assessment } = item;
  const saving = item.originalPrice - assessment.price;
  const savingPct = Math.round((saving / item.originalPrice) * 100);
  const deliveryNote = isNearby ? "⚡ Same-day local delivery" : "📦 Standard delivery (2-3 days)";

  // Delivery step gets dynamic description
  const steps = BUY_STEPS.map((s, i) =>
    i === 1 ? { ...s, description: deliveryNote } : s
  );

  // === RESULT SCREEN ===
  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className={`rounded-2xl border p-6 text-center ${
          result.outcome === "accepted" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
        }`}>
          <div className="text-5xl mb-3">{result.outcome === "accepted" ? "🎉" : "🛡️"}</div>
          <h2 className="text-xl font-bold">
            {result.outcome === "accepted" ? "Purchase Complete!" : "Dispute Filed"}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{result.message}</p>
        </div>

        {/* Buyer green credits + savings */}
        {result.outcome === "accepted" && result.greenCredits && (
          <div className="rounded-2xl border-2 border-green-500/30 bg-gradient-to-b from-green-500/5 to-transparent p-6 text-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-green-400 mb-3">
              🌍 Your Impact
            </h3>
            <p className="text-lg font-semibold">
              You saved <span className="text-amber-400">₹{result.priceSaving.toLocaleString("en-IN")}</span> and{" "}
              <span className="text-green-400">~{result.carbonKgSaved.toFixed(1)} kg CO₂</span> versus buying new
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/30 px-4 py-2">
              <span className="text-lg">🌱</span>
              <span className="font-bold text-green-400">+{result.greenCredits.credits} Green Credits</span>
            </div>
            {result.loopItemId && (
              <p className="mt-3 text-xs text-[var(--text-secondary)] bg-neutral-800 rounded-lg p-2">
                ♻️ This item is now in your &quot;My Items&quot; — you can re-sell it in one tap when you&apos;re done with it!
              </p>
            )}
          </div>
        )}

        {/* Buyer trust */}
        {result.buyerTrust && result.outcome === "accepted" && (
          <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Your Buyer Trust Score
            </h3>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${result.buyerTrust.score >= 80 ? "text-green-400" : "text-amber-400"}`}>
                {result.buyerTrust.score}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {result.buyerTrust.totalDeals} deals • {result.buyerTrust.disputes} disputes
              </span>
              {result.buyerTrust.score >= 80 && (
                <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">
                  ⭐ Priority buyer
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/shop"
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-neutral-900 hover:bg-amber-400"
          >
            ← Back to Shop
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-neutral-700 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  // === BUYING FLOW ===
  if (buying) {
    const isLastStep = currentStep === steps.length - 1;

    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Purchase Flow</h1>
          <button onClick={() => setBuying(false)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ✕ Cancel
          </button>
        </div>

        {/* Stepper */}
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
              <button onClick={advanceStep}
                className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-amber-400">
                Simulate: {steps[currentStep + 1]?.title} →
              </button>
            )}
            {isLastStep && (
              <div className="flex gap-3">
                <button onClick={() => handleAction("accept")} disabled={processing}
                  className="flex-1 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-bold text-neutral-900 hover:bg-green-400 disabled:opacity-50">
                  {processing ? "Processing…" : "✓ Accept — Looks great!"}
                </button>
                <button onClick={() => handleAction("dispute")} disabled={processing}
                  className="flex-1 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50">
                  {processing ? "…" : "✕ Dispute"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Health Card during inspection */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Product Health Card
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
            trustScore={sellerTrust?.score ?? 60}
          />
        </div>
      </div>
    );
  }

  // === ITEM DETAIL + HEALTH CARD ===
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/shop" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← Back to Shop
      </Link>

      {/* Price hero */}
      <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-6">
        <h1 className="text-2xl font-bold">{item.title}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{item.brand} • {item.category.replace(/_/g, " ")}</p>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-black text-amber-400">
            ₹{assessment.price.toLocaleString("en-IN")}
          </span>
          <span className="text-lg text-[var(--text-secondary)] line-through">
            ₹{item.originalPrice.toLocaleString("en-IN")}
          </span>
          <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2.5 py-0.5 text-xs font-bold text-green-400">
            {savingPct}% off
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Save ₹{saving.toLocaleString("en-IN")} vs buying new
        </p>

        {distanceKm !== null && (
          <p className="mt-2 text-sm">
            {isNearby ? (
              <span className="text-green-400 font-medium">⚡ {distanceKm} km away — same-day delivery</span>
            ) : (
              <span className="text-[var(--text-secondary)]">📍 {distanceKm} km away</span>
            )}
          </p>
        )}
      </div>

      {/* Health Card */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          Product Health Card
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
          trustScore={sellerTrust?.score ?? 60}
        />
      </div>

      {/* Guarantee note */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">🛡️</span>
          <div>
            <p className="text-sm font-semibold text-blue-400">Amazon-backed Guarantee</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Full refund if item doesn&apos;t match the Health Card grade. 24-hour inspection window after delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Photos preview */}
      {item.photos.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Seller Photos ({item.photos.length})
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {item.photos.map((photo, i) => (
              <div key={i} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-700">
                <img src={photo} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buy button */}
      {activeBuyer ? (
        <button
          onClick={startBuy}
          className="w-full rounded-xl bg-amber-500 px-6 py-4 text-base font-black text-neutral-900 transition-all hover:bg-amber-400 hover:scale-[1.01]"
        >
          🛒 Buy for ₹{assessment.price.toLocaleString("en-IN")}
        </button>
      ) : (
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Switch to Buyer mode in the header to purchase.
        </p>
      )}
    </div>
  );
}
