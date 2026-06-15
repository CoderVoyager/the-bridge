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

interface AssessmentResponse {
  success: boolean;
  grade: GradeData;
  price: number;
  recommendation: "list" | "donate" | "recycle" | "refurbish";
  interestedBuyersCount: number;
  riskFlags: string[];
  costComparison: {
    shipDirect: number;
    warehouseAlt: number;
    carbonKgSaved: number;
  };
  carbonKgSaved: number;
  routePath: string;
  routeReason: string;
  isReturnable: boolean;
  error?: string;
}

const CONDITION_COLORS: Record<string, string> = {
  like_new: "text-green-400 bg-green-500/10 border-green-500/30",
  good: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  fair: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  damaged: "text-red-400 bg-red-500/10 border-red-500/30",
};

const WAREHOUSE_CARBON = 600 * 0.12;

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(false);

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
        if (errMsg.includes("API_KEY") || errMsg.includes("GEMINI")) {
          setErrorHint("The Gemini API key may be missing or invalid. Check your .env file.");
        } else if (errMsg.includes("photos")) {
          setErrorHint("Go back and capture photos first.");
        }
      } else {
        setData(json);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleList = useCallback(async (action: "list" | "donate" | "recycle" = "list") => {
    setListing(true);
    try {
      const res = await fetch(`/api/items/${id}/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setListed(true);
      } else {
        setError("Failed to process item.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setListing(false);
    }
  }, [id]);

  useEffect(() => {
    runAssessment();
  }, [runAssessment]);

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-10 max-w-md">
          <div className="mb-4 text-5xl animate-bounce">🤖</div>
          <h1 className="text-xl font-bold">Analyzing your item…</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            AI is inspecting photos, grading condition, and computing a fair price.
          </p>
          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="animate-pulse text-amber-400">●</span> Grading with Gemini Vision…
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <span>○</span> Computing resale price
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <span>○</span> Checking buyer demand
            </div>
          </div>
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full w-1/2 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-amber-500/60" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error && !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-10 max-w-md">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="text-xl font-bold text-red-400">Assessment Failed</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>
          {errorHint && (
            <p className="mt-2 rounded-lg bg-neutral-800 p-2 text-xs text-amber-400">💡 {errorHint}</p>
          )}
          <div className="mt-5 flex gap-3 justify-center">
            <button onClick={runAssessment} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-400">
              🔄 Retry
            </button>
            <Link href={`/item/${id}/capture`} className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-[var(--text-secondary)]">
              📷 Retake
            </Link>
            <Link href="/" className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-[var(--text-secondary)]">
              ← Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Listed success ---
  if (listed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-10 max-w-md">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-xl font-bold text-green-400">Listed on Marketplace!</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your item is now live. Buyers can find it, and you&apos;ll see interest signals on your dashboard.
          </p>
          {data && (
            <div className="mt-4 rounded-xl bg-neutral-800/50 border border-neutral-700 p-3 text-left space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Listed price</span>
                <span className="font-medium text-amber-400">₹{data.price.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Interested buyers</span>
                <span className="font-medium text-green-400">{data.interestedBuyersCount} nearby</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">CO₂ saved vs warehouse</span>
                <span className="font-medium text-green-400">{data.carbonKgSaved.toFixed(1)} kg</span>
              </div>
            </div>
          )}
          <div className="mt-5 flex gap-3 justify-center">
            <Link href="/seller/dashboard" className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-amber-400">
              📊 View Dashboard
            </Link>
            <Link href="/" className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              ← Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Success: Assessment result ---
  const { grade, price, recommendation, interestedBuyersCount, riskFlags, costComparison, carbonKgSaved } = data!;
  const conditionStyle = CONDITION_COLORS[grade.condition] || "";
  const moneySaved = costComparison.warehouseAlt - costComparison.shipDirect;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Assessment</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Beyond return window — list for resale and earn money
          </p>
        </div>
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">← Home</Link>
      </div>

      <div className="space-y-4">

        {/* ===== COST COMPARISON — only for returnable items (within 30 days) ===== */}
        {recommendation === "list" && data!.isReturnable && (
          <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-lg shadow-amber-500/5">
            <h2 className="mb-1 text-center text-lg font-bold text-amber-400">
              💰 Why list on The Bridge?
            </h2>
            <p className="mb-5 text-center text-xs text-[var(--text-secondary)]">
              vs. returning to warehouse (traditional route)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-green-500/40 bg-green-500/5 p-5 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 bg-green-500 py-0.5 text-[10px] font-bold text-neutral-900 uppercase tracking-wider">
                  The Bridge
                </div>
                <div className="mt-4 text-3xl font-black text-green-400">
                  ₹{costComparison.shipDirect.toLocaleString("en-IN")}
                </div>
                <div className="mt-2 text-xs text-[var(--text-secondary)]">shipping cost</div>
                <div className="mt-2 rounded-lg bg-green-500/10 p-1.5">
                  <p className="text-xs font-bold text-green-300">{Math.max(0, WAREHOUSE_CARBON - carbonKgSaved).toFixed(1)} kg CO₂</p>
                </div>
              </div>
              <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-5 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 bg-neutral-700 py-0.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Warehouse Return
                </div>
                <div className="mt-4 text-3xl font-black text-[var(--text-secondary)]">
                  ₹{costComparison.warehouseAlt.toLocaleString("en-IN")}
                </div>
                <div className="mt-2 text-xs text-[var(--text-secondary)]">shipping cost</div>
                <div className="mt-2 rounded-lg bg-neutral-800 p-1.5">
                  <p className="text-xs font-bold text-neutral-400">{WAREHOUSE_CARBON.toFixed(1)} kg CO₂</p>
                </div>
              </div>
            </div>
            {moneySaved > 0 && (
              <div className="mt-4 rounded-xl border-2 border-amber-400/40 bg-amber-500/15 p-3 text-center">
                <p className="text-lg font-black text-amber-400">
                  Save ₹{moneySaved.toLocaleString("en-IN")} + {carbonKgSaved.toFixed(1)} kg CO₂
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===== EARNINGS CARD — for non-returnable (old) items ===== */}
        {recommendation === "list" && !data!.isReturnable && (
          <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-lg shadow-amber-500/5">
            <h2 className="mb-1 text-center text-lg font-bold text-amber-400">
              💰 List & Earn
            </h2>
            <p className="mb-4 text-center text-xs text-[var(--text-secondary)]">
              Give your item a second life and earn money
            </p>
            <div className="text-center">
              <div className="text-4xl font-black text-amber-400">
                ₹{price.toLocaleString("en-IN")}
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">estimated earnings</p>
            </div>
            {interestedBuyersCount > 0 && (
              <div className="mt-4 rounded-xl bg-green-500/10 border border-green-500/30 p-3 text-center">
                <p className="text-sm font-medium text-green-400">
                  🔥 {interestedBuyersCount} buyer{interestedBuyersCount !== 1 ? "s" : ""} nearby can afford this
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI Grade */}
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
                  <li key={i} className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Price + Demand */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-1">Suggested Price</p>
            <p className="text-2xl font-bold text-amber-400">₹{price.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-1">Buyer Demand</p>
            <p className="text-2xl font-bold text-green-400">{interestedBuyersCount}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">buyer{interestedBuyersCount !== 1 ? "s" : ""} nearby want this</p>
          </div>
        </div>

        {/* Risk Flags */}
        {riskFlags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {riskFlags.map((flag, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
                ⚠ {flag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Route reasoning */}
        {data!.routeReason && (
          <div className="rounded-xl border border-neutral-700 bg-neutral-800/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1">🧠 AI Routing Decision</p>
            <p className="text-xs text-[var(--text-secondary)]">{data!.routeReason}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {recommendation === "list" && (
            <button
              onClick={() => handleList("list")}
              disabled={listing}
              className="w-full rounded-xl bg-amber-500 px-6 py-4 text-base font-black text-neutral-900 transition-all hover:bg-amber-400 hover:scale-[1.01] disabled:opacity-50"
            >
              {listing ? "Listing…" : `🛒 List on Marketplace — earn ₹${price.toLocaleString("en-IN")}`}
            </button>
          )}
          {recommendation === "refurbish" && (
            <>
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                <p className="text-sm text-orange-400 font-medium text-center">
                  🔧 This item needs repair before resale
                </p>
                <p className="text-xs text-[var(--text-secondary)] text-center mt-1">
                  AI detected damage that requires warehouse refurbishment. After repair, Amazon will list it as &quot;Renewed&quot; at a higher price.
                </p>
              </div>
              <button
                onClick={() => handleList("list")}
                disabled={listing}
                className="w-full rounded-xl bg-orange-500 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-orange-400 disabled:opacity-50"
              >
                {listing ? "Processing…" : "🔧 Send to Warehouse for Refurbishment"}
              </button>
              <button
                onClick={() => handleList("list")}
                disabled={listing}
                className="w-full rounded-xl border border-neutral-700 px-6 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                List as-is at ₹{price.toLocaleString("en-IN")} (deep discount)
              </button>
            </>
          )}
          {recommendation === "donate" && (
            <>
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                <p className="text-sm text-purple-400 font-medium text-center">
                  🎁 Resale value too low for marketplace listing. Donation recommended.
                </p>
                <p className="text-xs text-[var(--text-secondary)] text-center mt-1">
                  Your item will go to a verified charity partner. You&apos;ll earn 50 Green Credits.
                </p>
              </div>
              <button
                onClick={() => handleList("donate")}
                disabled={listing}
                className="w-full rounded-xl bg-purple-500 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-purple-400 disabled:opacity-50"
              >
                {listing ? "Processing…" : "🎁 Donate & Earn 50 Green Credits"}
              </button>
            </>
          )}
          {recommendation === "recycle" && (
            <>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm text-red-400 font-medium text-center">
                  ♻️ This item is flagged as recalled/hazardous and cannot be resold.
                </p>
                <p className="text-xs text-[var(--text-secondary)] text-center mt-1">
                  We&apos;ll schedule a safe recycling pickup. Materials will be responsibly recovered.
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-xl bg-red-500/20 border border-red-500/30 px-6 py-4 text-base font-bold text-red-400 transition-colors hover:bg-red-500/30"
              >
                ♻️ Schedule Recycling Pickup
              </button>
            </>
          )}

          {/* Secondary action: go home */}
          {recommendation !== "recycle" && (
            <Link
              href="/"
              className="block w-full text-center rounded-xl border border-neutral-700 px-6 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ← Back to My Items
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
