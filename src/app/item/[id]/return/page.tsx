"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ReturnInitResponse {
  success: boolean;
  interestedBuyersCount: number;
  nearestBuyerDistanceKm: number;
  warehouseSaving: number;
  carbonKgSaved: number;
  error?: string;
}

interface ReturnStatusResponse {
  item: { id: string; title: string; brand: string; originalPrice: number };
  returnHold: {
    status: string;
    initiatedAt: string;
    expiresAt: string;
    refundAmount: number;
    originalDeliveryCharge: number;
    deliveryCashback: number;
    daysWaited: number;
    viewCount: number;
    interestedCount: number;
  };
  daysWaited: number;
  daysLeft: number;
  deliveryCashback: number;
  totalRefund: number;
}

export default function ReturnPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [stage, setStage] = useState<"intro" | "capture" | "active" | "expired" | "matched">("intro");
  const [initiating, setInitiating] = useState(false);
  const [initData, setInitData] = useState<ReturnInitResponse | null>(null);
  const [statusData, setStatusData] = useState<ReturnStatusResponse | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState("");

  // Check if already in hold
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/items/${id}/return`);
      if (res.ok) {
        const json = await res.json();
        setStatusData(json);
        if (json.returnHold.status === "expired") {
          setStage("expired");
        } else if (json.returnHold.status === "matched" || json.returnHold.status === "completed") {
          setStage("matched");
        } else {
          setStage("active");
        }
      }
    } catch {
      // not in hold yet, show intro
    }
  }, [id]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Initiate Bridge Return
  const handleInitiate = async () => {
    setInitiating(true);
    setError("");
    try {
      // First go through capture (photos required for AI grading)
      // For the demo, we'll initiate the hold first, then redirect to capture
      const res = await fetch(`/api/items/${id}/return`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to initiate");
        setInitiating(false);
        return;
      }
      setInitData(json);
      // Now redirect to capture flow
      router.push(`/item/${id}/capture`);
    } catch {
      setError("Network error");
      setInitiating(false);
    }
  };

  // Advance day (demo)
  const handleAdvanceDay = async () => {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/items/${id}/return/advance`, { method: "POST" });
      const json = await res.json();
      if (json.expired) {
        setStage("expired");
      }
      await checkStatus();
    } catch {
      // ignore
    } finally {
      setAdvancing(false);
    }
  };

  // === MATCHED STATE (buyer purchased!) ===
  if (stage === "matched" && statusData) {
    const { returnHold } = statusData;
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-xl font-bold text-green-400">Buyer Found!</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            A nearby buyer purchased your item through The Bridge. No warehouse trip needed!
          </p>

          <div className="mt-5 rounded-xl bg-[var(--bg-card)] border border-neutral-800 p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Full refund</span>
              <span className="font-medium text-green-400">₹{returnHold.refundAmount.toLocaleString("en-IN")} ✓</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Delivery cashback ({returnHold.daysWaited} days waited)</span>
              <span className="font-medium text-amber-400">₹{returnHold.deliveryCashback}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Green Credits</span>
              <span className="font-medium text-green-400">+100 🌱</span>
            </div>
            <div className="flex justify-between text-sm border-t border-neutral-800 pt-2">
              <span className="font-bold">Total back to you</span>
              <span className="font-bold text-amber-400">
                ₹{(returnHold.refundAmount + returnHold.deliveryCashback).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-green-500/10 border border-green-500/30 p-3">
            <p className="text-xs text-green-400 font-medium">
              🌍 You saved ~72 kg CO₂ by skipping the warehouse. Amazon saved ₹1,278 in logistics.
            </p>
          </div>

          <div className="mt-5 flex gap-3 justify-center">
            <Link href="/dashboard" className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-400">
              📊 Dashboard
            </Link>
            <Link href="/" className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              ← Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // === EXPIRED STATE ===
  if (stage === "expired" && statusData) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <div className="text-5xl mb-3">⏱️</div>
          <h1 className="text-xl font-bold">Buffer Complete</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No local buyer found in 7 days. Proceeding with normal warehouse return.
          </p>

          <div className="mt-5 rounded-xl bg-[var(--bg-card)] border border-neutral-800 p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Full refund</span>
              <span className="font-medium text-green-400">₹{statusData.returnHold.refundAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Delivery cashback (7/7 days)</span>
              <span className="font-medium text-green-400">₹{statusData.returnHold.originalDeliveryCharge}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-neutral-800 pt-2">
              <span className="font-medium">Total back to you</span>
              <span className="font-bold text-amber-400">
                ₹{(statusData.returnHold.refundAmount + statusData.returnHold.originalDeliveryCharge).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            +50 Green Credits for trying Bridge Return 🌱
          </p>

          <Link
            href="/"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
          >
            ← Back to My Items
          </Link>
        </div>
      </div>
    );
  }

  // === ACTIVE HOLD STATE ===
  if (stage === "active" && statusData) {
    const { returnHold, daysWaited, daysLeft, deliveryCashback, totalRefund } = statusData;

    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Bridge Return Active</h1>
          <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Home</Link>
        </div>

        {/* Status card */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-400">
              🔍 Finding buyer...
            </span>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              ⏱️ {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
            </span>
          </div>

          <h2 className="text-lg font-semibold">{statusData.item.title}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{statusData.item.brand}</p>

          {/* Timer progress */}
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-neutral-800">
              <div
                className="h-2 rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${(daysWaited / 7) * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-[var(--text-secondary)]">
              <span>Day {daysWaited}</span>
              <span>Day 7</span>
            </div>
          </div>

          {/* Interest signals */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">👀</span>
              <span className="text-[var(--text-secondary)]">{returnHold.viewCount} views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🔔</span>
              <span className="text-[var(--text-secondary)]">{returnHold.interestedCount} interested</span>
            </div>
          </div>
        </div>

        {/* Earnings card */}
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
          <h3 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-3">
            💰 Your Earnings
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Full refund</span>
              <span className="font-medium text-green-400">₹{returnHold.refundAmount.toLocaleString("en-IN")} ✓</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Delivery cashback ({daysWaited}/7 days)</span>
              <span className="font-medium text-amber-400">₹{deliveryCashback} / ₹{returnHold.originalDeliveryCharge}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-800 mt-1">
              <div
                className="h-1.5 rounded-full bg-amber-400 transition-all"
                style={{ width: `${(deliveryCashback / Math.max(returnHold.originalDeliveryCharge, 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-sm border-t border-neutral-800 pt-2 mt-2">
              <span className="font-medium">Current total</span>
              <span className="font-bold text-amber-400">₹{totalRefund.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-800/30 p-4">
          <p className="text-xs text-[var(--text-secondary)]">
            📌 Your item is listed as an "Open-box deal" in The Bridge marketplace.
            If a buyer purchases it within {daysLeft} days, you get your refund instantly + cashback.
            If not, normal warehouse return proceeds and you get full delivery cashback for waiting.
          </p>
        </div>

        {/* Demo: advance day button */}
        <div className="border-t border-neutral-800 pt-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">Demo Controls</p>
          <button
            onClick={handleAdvanceDay}
            disabled={advancing}
            className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-amber-500/30 disabled:opacity-50"
          >
            {advancing ? "Advancing..." : "⏩ Simulate 1 day passing"}
          </button>
        </div>
      </div>
    );
  }

  // === INTRO STATE (not yet initiated) ===
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Return via Bridge</h1>
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Back</Link>
      </div>

      {/* Explanation */}
      <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6">
        <h2 className="text-lg font-bold text-green-400 mb-2">🌉 How Bridge Return Works</h2>
        <div className="space-y-3 text-sm text-[var(--text-secondary)]">
          <div className="flex gap-3">
            <span className="shrink-0 text-lg">📸</span>
            <p>Take 3 photos for AI grading (verifies condition)</p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 text-lg">⏱️</span>
            <p>We hold your item for <span className="text-[var(--text-primary)] font-medium">7 days</span> and search for a nearby buyer</p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 text-lg">💰</span>
            <p>You get your <span className="text-green-400 font-medium">full refund</span> + delivery cashback that grows each day</p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 text-lg">🌍</span>
            <p>Skip the warehouse, save CO₂, earn Green Credits</p>
          </div>
        </div>
      </div>

      {/* Cashback chart */}
      <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
        <h3 className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Progressive Delivery Cashback
        </h3>
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div key={day} className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)] w-10">Day {day}</span>
              <div className="flex-1 h-2 rounded-full bg-neutral-800">
                <div
                  className="h-2 rounded-full bg-amber-400"
                  style={{ width: `${(day / 7) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-amber-400 w-8 text-right">
                {Math.round((day / 7) * 100)}%
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Wait full 7 days = 100% of delivery charge refunded (even if no buyer found!)
        </p>
      </div>

      {/* Comparison */}
      <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-5">
        <h3 className="text-center text-sm font-bold text-amber-400 mb-3">Bridge vs Normal Return</h3>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-green-500/5 border border-green-500/30 p-3">
            <p className="text-[10px] uppercase text-green-400 font-bold mb-1">Bridge Return</p>
            <p className="text-sm text-[var(--text-secondary)]">Full refund ✓</p>
            <p className="text-sm text-amber-400 font-medium">+ delivery cashback</p>
            <p className="text-sm text-green-400 font-medium">+ Green Credits</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">~0 kg CO₂</p>
          </div>
          <div className="rounded-xl bg-neutral-800/50 border border-neutral-700 p-3">
            <p className="text-[10px] uppercase text-neutral-400 font-bold mb-1">Normal Return</p>
            <p className="text-sm text-[var(--text-secondary)]">Full refund ✓</p>
            <p className="text-sm text-neutral-500">No cashback</p>
            <p className="text-sm text-neutral-500">No credits</p>
            <p className="text-xs text-neutral-500 mt-1">~72 kg CO₂</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {/* Action buttons */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleInitiate}
          disabled={initiating}
          className="w-full rounded-xl bg-green-500 px-6 py-4 text-base font-black text-neutral-900 transition-all hover:bg-green-400 hover:scale-[1.01] disabled:opacity-50"
        >
          {initiating ? "Starting..." : "🌉 Start Bridge Return (7-day buffer)"}
        </button>
        <Link
          href="/"
          className="block w-full text-center rounded-xl border border-neutral-700 px-6 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          No thanks, normal return
        </Link>
      </div>
    </div>
  );
}
