"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface DashboardData {
  trust: {
    score: number;
    totalDeals: number;
    acceptedAsGraded: number;
    disputes: number;
  };
  green: {
    totalCredits: number;
    totalCarbonKg: number;
    entryCount: number;
  };
  bridgeReturns: {
    activeHolds: number;
    matchedReturns: number;
    totalWarehouseSaved: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const fetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleReset = async () => {
    if (!confirm("Reset all demo data? This will restore seed items and clear all scores/credits.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const json = await res.json();
      setResetMessage(json.message);
      await fetchDashboard();
    } catch {
      setResetMessage("Reset failed.");
    } finally {
      setResetting(false);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-pulse">Loading dashboard…</div>
      </div>
    );
  }

  const { trust, green } = data;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← Home
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Trust Score Card */}
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-6 text-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
            Trust Score
          </h2>
          <div className="relative mx-auto h-24 w-24 mb-4">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-800"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={
                  trust.score >= 80
                    ? "text-green-400"
                    : trust.score >= 60
                    ? "text-amber-400"
                    : "text-red-400"
                }
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={`${trust.score}, 100`}
                fill="none"
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
              {trust.score}
            </span>
          </div>
          <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
            <p>{trust.totalDeals} deals completed</p>
            <p>{trust.acceptedAsGraded} accepted as graded</p>
            <p>{trust.disputes} dispute{trust.disputes !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Green Credits Card */}
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-6 text-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
            Green Credits
          </h2>
          <div className="mb-2">
            <span className="text-4xl font-bold text-green-400">{green.totalCredits}</span>
            <p className="text-xs text-[var(--text-secondary)] mt-1">credits earned</p>
          </div>
          <div className="mt-4 space-y-2 rounded-xl bg-neutral-800/50 p-3">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">CO₂ avoided</span>
              <span className="font-medium text-green-400">{green.totalCarbonKg} kg</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">Actions</span>
              <span className="font-medium">{green.entryCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bridge Returns Card */}
      {data.bridgeReturns && (
        <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 text-center">
            🌉 Bridge Returns
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-400">{data.bridgeReturns.activeHolds}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Active holds</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{data.bridgeReturns.matchedReturns}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Matched</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">₹{data.bridgeReturns.totalWarehouseSaved.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Warehouse cost saved</p>
            </div>
          </div>
        </div>
      )}

      {/* Impact summary */}
      <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/5 p-5 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          🌍 You&apos;ve helped avoid{" "}
          <span className="font-bold text-green-400">{green.totalCarbonKg} kg CO₂</span> and completed{" "}
          <span className="font-bold text-[var(--text-primary)]">{trust.totalDeals} second-life transactions</span>.
        </p>
      </div>

      {/* Reset demo */}
      <div className="mt-8 border-t border-neutral-800 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Reset Demo</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Restore all seed data for a clean stage demo.
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
          >
            {resetting ? "Resetting…" : "🔄 Reset"}
          </button>
        </div>
        {resetMessage && (
          <p className="mt-2 text-xs text-green-400">{resetMessage}</p>
        )}
      </div>
    </div>
  );
}
