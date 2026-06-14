"use client";

import { useState, useEffect, useCallback } from "react";
import { useRole } from "@/components/RoleContext";
import Link from "next/link";

interface InterestEvent {
  id: string;
  type: "view" | "search";
  itemId?: string;
  query?: string;
  buyerCity: string;
  distanceKm: number;
  timestamp: string;
}

interface SellerStats {
  totalViews: number;
  totalSearches: number;
  recentEvents: InterestEvent[];
  itemViews: Record<string, number>;
}

interface ItemInfo {
  id: string;
  title: string;
}

export default function SellerDashboardPage() {
  const { activeSeller, role } = useRole();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [items, setItems] = useState<ItemInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const sellerId = activeSeller?.id ?? "user_self";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch interest stats
      const statsRes = await fetch(`/api/events?sellerId=${sellerId}`);
      const statsJson = await statsRes.json();
      setStats(statsJson);

      // Fetch seller items for mapping names
      const itemsRes = await fetch(`/api/buyers/${sellerId}/items`);
      const itemsJson = await itemsRes.json();
      setItems(itemsJson.items ?? []);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds for real-time feel
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getItemTitle = (itemId: string) => {
    return items.find((i) => i.id === itemId)?.title ?? itemId;
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  if (role !== "seller") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="text-[var(--text-secondary)]">Switch to Seller mode to see the dashboard.</p>
        <Link href="/" className="mt-4 text-amber-400 hover:underline">← Home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📊 Seller Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Interest signals for {activeSeller?.name ?? "your"} items
          </p>
        </div>
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          ← Home
        </Link>
      </div>

      {loading && !stats && (
        <div className="animate-pulse text-center py-8 text-[var(--text-secondary)]">
          Loading dashboard…
        </div>
      )}

      {stats && (
        <div className="space-y-4">
          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5 text-center">
              <p className="text-3xl font-bold text-amber-400">{stats.totalViews}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Item Views</p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5 text-center">
              <p className="text-3xl font-bold text-blue-400">{stats.totalSearches}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Search Hits</p>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5 text-center">
              <p className="text-3xl font-bold text-green-400">{stats.totalViews + stats.totalSearches}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Total Interest</p>
            </div>
          </div>

          {/* Per-item view counts */}
          {Object.keys(stats.itemViews).length > 0 && (
            <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Views per Item
              </h2>
              <div className="space-y-2">
                {Object.entries(stats.itemViews)
                  .sort(([, a], [, b]) => b - a)
                  .map(([itemId, count]) => (
                    <div key={itemId} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[70%]">{getItemTitle(itemId)}</span>
                      <span className="text-sm font-bold text-amber-400">{count} view{count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Live interest feed */}
          <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Live Interest Feed
              </h2>
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            </div>

            {stats.recentEvents.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                No interest signals yet. Events appear here when buyers view or search for your items.
              </p>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`rounded-xl p-3 border ${
                    evt.type === "view"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-blue-500/20 bg-blue-500/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{evt.type === "view" ? "👀" : "🔍"}</span>
                      <div>
                        {evt.type === "view" ? (
                          <p className="text-sm">
                            <span className="text-[var(--text-secondary)]">Someone in</span>{" "}
                            <span className="font-medium">{evt.buyerCity}</span>{" "}
                            <span className="text-[var(--text-secondary)]">
                              ({evt.distanceKm} km) viewed
                            </span>{" "}
                            <span className="font-semibold text-amber-400">
                              {getItemTitle(evt.itemId ?? "")}
                            </span>
                          </p>
                        ) : (
                          <p className="text-sm">
                            <span className="text-[var(--text-secondary)]">Someone in</span>{" "}
                            <span className="font-medium">{evt.buyerCity}</span>{" "}
                            <span className="text-[var(--text-secondary)]">searched for</span>{" "}
                            <span className="font-semibold text-blue-400">&quot;{evt.query}&quot;</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                      {timeAgo(evt.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy note */}
          <div className="rounded-xl border border-neutral-700 bg-neutral-800/30 p-3 text-center">
            <p className="text-[11px] text-[var(--text-secondary)]">
              🔒 Buyer identities are anonymous until they complete a purchase.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
