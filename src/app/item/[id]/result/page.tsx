"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface GradeData {
  condition: string;
  defects: string[];
  summary: string;
  confidence: number;
}

interface AssessmentData {
  grade: GradeData;
  price: number;
  matchedBuyerId?: string;
  nearbyDemand: number;
  riskFlags: string[];
}

interface RouteData {
  path: string;
  matchedBuyerId?: string;
  cost: {
    shipDirect: number;
    warehouseAlt: number;
    carbonKgSaved: number;
  };
  reason: string;
}

interface AssessmentResponse {
  success: boolean;
  assessment: AssessmentData;
  route: RouteData;
  matchedBuyerName?: string;
  matchedBuyerCity?: string;
  buyerDistanceKm?: number;
  error?: string;
}

const CONDITION_COLORS: Record<string, string> = {
  like_new: "text-green-400 bg-green-500/10 border-green-500/30",
  good: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  fair: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  damaged: "text-red-400 bg-red-500/10 border-red-500/30",
};

const PATH_LABELS: Record<string, { label: string; icon: string; color: string; description: string }> = {
  ship_direct: { label: "Ship Direct", icon: "🚀", color: "text-green-400 bg-green-500/10 border-green-500/30", description: "Matched buyer nearby — fastest route to a second life." },
  refurbish: { label: "Refurbish", icon: "🔧", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", description: "Item needs some love. After refurbishment, it'll be as good as new." },
  repair: { label: "Repair", icon: "🛠️", color: "text-orange-400 bg-orange-500/10 border-orange-500/30", description: "A missing or broken part needs fixing before resale." },
  donate: { label: "Donate", icon: "🎁", color: "text-purple-400 bg-purple-500/10 border-purple-500/30", description: "Resale value is low, but this item can still help someone in need." },
  recycle: { label: "Recycle", icon: "♻️", color: "text-red-400 bg-red-500/10 border-red-500/30", description: "This item can't be safely resold, but its materials can be recovered." },
  list_hold: { label: "List & Hold", icon: "📋", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", description: "No buyer nearby yet. We'll list it and notify you when someone wants it." },
};

// Warehouse carbon constant
const WAREHOUSE_CARBON = 600 * 0.12;

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [quickMode, setQuickMode] = useState(false);

  const runAssessment = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorHint(null);
    try {
      const res = await fetch(`/api/items/${id}/assess`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        const errMsg = json.error || "Assessment failed";
        setError(errMsg);
        // Friendly hints for common issues
        if (errMsg.includes("API_KEY") || errMsg.includes("api key") || errMsg.includes("GEMINI")) {
          setErrorHint("The Gemini API key may be missing or invalid. Check your .env file has GEMINI_API_KEY set.");
        } else if (errMsg.includes("photos")) {
          setErrorHint("Go back and capture photos first — the AI needs images to grade your item.");
        } else if (errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("ECONNREFUSED")) {
          setErrorHint("Couldn't reach the grading service. Check your internet connection and try again.");
        }
      } else {
        setData(json);
      }
    } catch {
      setError("Network error. Please try again.");
      setErrorHint("Check your connection — the grading API couldn't be reached.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/items/${id}/confirm`, { method: "POST" });
      if (res.ok) {
        router.push(`/item/${id}/confirm`);
      } else {
        setError("Failed to confirm route.");
        setConfirming(false);
      }
    } catch {
      setError("Network error on confirm.");
      setConfirming(false);
    }
  }, [id, router]);

  // "Just take it away" — confirm immediately without further questions
  const handleQuickConfirm = useCallback(async () => {
    setQuickMode(true);
    setConfirming(true);
    try {
      const res = await fetch(`/api/items/${id}/confirm`, { method: "POST" });
      if (res.ok) {
        router.push(`/item/${id}/confirm`);
      } else {
        setError("Failed to confirm.");
        setConfirming(false);
        setQuickMode(false);
      }
    } catch {
      setError("Network error.");
      setConfirming(false);
      setQuickMode(false);
    }
  }, [id, router]);

  useEffect(() => {
    runAssessment();
  }, [runAssessment]);

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-10 max-w-md">
          <div className="mb-4 text-5xl animate-bounce">🤖</div>
          <h1 className="text-xl font-bold">Analyzing your item…</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            AI is inspecting photos, grading condition, computing a fair price, and finding the best route.
          </p>
          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="animate-pulse text-amber-400">●</span> Grading with Gemini Vision…
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <span>○</span> Computing price & matching buyers
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <span>○</span> Choosing optimal route
            </div>
          </div>
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full w-1/2 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-amber-500/60" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error && !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-10 max-w-md">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="text-xl font-bold text-red-400">Assessment Failed</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>
          {errorHint && (
            <p className="mt-2 rounded-lg bg-neutral-800 p-2 text-xs text-amber-400">
              💡 {errorHint}
            </p>
          )}
          <div className="mt-5 flex gap-3 justify-center">
            <button
              onClick={runAssessment}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
            >
              🔄 Retry
            </button>
            <Link
              href={`/item/${id}/capture`}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              📷 Retake Photos
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ← Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Success state ---
  const { assessment, route, matchedBuyerName, matchedBuyerCity } = data!;
  const { grade, price, nearbyDemand, riskFlags } = assessment;
  const conditionStyle = CONDITION_COLORS[grade.condition] || "";
  const pathInfo = PATH_LABELS[route.path] || { label: route.path, icon: "📦", color: "", description: "" };

  const moneySaved = route.cost.warehouseAlt - route.cost.shipDirect;
  const carbonSaved = route.cost.carbonKgSaved;
  const showComparison = route.path !== "recycle"; // recycle doesn't have a meaningful cost comparison

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assessment & Route</h1>
        <Link
          href="/"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← Back
        </Link>
      </div>

      <div className="space-y-4">

        {/* ============================================ */}
        {/* COMPARISON CARD — MOST PROMINENT ELEMENT     */}
        {/* ============================================ */}
        {showComparison && (
          <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-lg shadow-amber-500/5">
            <h2 className="mb-1 text-center text-lg font-bold text-amber-400">
              💰 Why The Bridge is better
            </h2>
            <p className="mb-5 text-center text-xs text-[var(--text-secondary)]">
              Side-by-side: our route vs. the traditional warehouse path
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Our route column */}
              <div className="rounded-xl border-2 border-green-500/40 bg-green-500/5 p-5 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 bg-green-500 py-0.5 text-[10px] font-bold text-neutral-900 uppercase tracking-wider">
                  The Bridge
                </div>
                <div className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-green-400">
                  {pathInfo.icon} {pathInfo.label}
                </div>
                <div className="text-3xl font-black text-green-400">
                  ₹{route.cost.shipDirect.toLocaleString("en-IN")}
                </div>
                <div className="mt-3 rounded-lg bg-green-500/10 p-2">
                  <p className="text-[11px] text-[var(--text-secondary)]">Carbon footprint</p>
                  <p className="text-sm font-bold text-green-300">
                    {Math.max(0, WAREHOUSE_CARBON - carbonSaved).toFixed(1)} kg CO₂
                  </p>
                </div>
              </div>

              {/* Warehouse column */}
              <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-5 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 bg-neutral-700 py-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Traditional
                </div>
                <div className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  🏭 Warehouse
                </div>
                <div className="text-3xl font-black text-[var(--text-secondary)]">
                  ₹{route.cost.warehouseAlt.toLocaleString("en-IN")}
                </div>
                <div className="mt-3 rounded-lg bg-neutral-800 p-2">
                  <p className="text-[11px] text-[var(--text-secondary)]">Carbon footprint</p>
                  <p className="text-sm font-bold text-neutral-400">
                    {WAREHOUSE_CARBON.toFixed(1)} kg CO₂
                  </p>
                </div>
              </div>
            </div>

            {/* Savings highlight — the punchline */}
            {moneySaved > 0 && (
              <div className="mt-5 rounded-xl border-2 border-amber-400/40 bg-amber-500/15 p-4 text-center">
                <p className="text-xl font-black text-amber-400">
                  Save ₹{moneySaved.toLocaleString("en-IN")} + {carbonSaved.toFixed(1)} kg CO₂
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  by skipping the warehouse entirely
                </p>
              </div>
            )}
            {moneySaved <= 0 && carbonSaved > 0 && (
              <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
                <p className="text-lg font-bold text-green-400">
                  🌍 {carbonSaved.toFixed(1)} kg CO₂ saved
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  This item gets a second life with less environmental impact
                </p>
              </div>
            )}
          </div>
        )}

        {/* Route Decision Badge (for paths without comparison) */}
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-4 py-1.5 text-sm font-bold ${pathInfo.color}`}>
              {pathInfo.icon} {pathInfo.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{pathInfo.description}</p>
          <p className="mt-1 text-xs text-neutral-500 italic">{route.reason}</p>
        </div>

        {/* Grade Card */}
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            AI Grade
          </h2>
          <div className="flex items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold capitalize ${conditionStyle}`}>
              {grade.condition.replace("_", " ")}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {(grade.confidence * 100).toFixed(0)}% confident
            </span>
          </div>
          <p className="mt-3 text-sm text-[var(--text-primary)]">{grade.summary}</p>
          {grade.defects.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Defects:</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {grade.defects.map((d, i) => (
                  <li key={i} className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Price + Buyer row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-1">Resale Price</p>
            <p className="text-2xl font-bold text-amber-400">₹{price.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-1">Buyer</p>
            {matchedBuyerName ? (
              <>
                <p className="text-sm font-semibold">{matchedBuyerName}</p>
                <p className="text-xs text-[var(--text-secondary)]">{matchedBuyerCity} • {nearbyDemand} interested</p>
              </>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No match yet</p>
            )}
          </div>
        </div>

        {/* Risk Flags (compact) */}
        {riskFlags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {riskFlags.map((flag, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
                ⚠ {flag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          {/* "Just take it away" — one-tap decision-fatigue mode */}
          <button
            onClick={handleQuickConfirm}
            disabled={confirming}
            className="w-full rounded-xl bg-amber-500 px-6 py-4 text-base font-black text-neutral-900 transition-all hover:bg-amber-400 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
          >
            {confirming && quickMode
              ? "Taking it away…"
              : `⚡ Just take it away — ${pathInfo.label}`}
          </button>

          {/* Detailed confirm */}
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full rounded-xl border border-neutral-700 px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-amber-500/30 hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {confirming && !quickMode ? "Confirming…" : "Review escrow details first →"}
          </button>
        </div>
      </div>
    </div>
  );
}
