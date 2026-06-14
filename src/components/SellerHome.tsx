"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRole } from "./RoleContext";
import { estimateResaleValue, isFastDepreciating, monthlyValueDrop } from "@/lib/value";
import type { Condition } from "@/lib/types";

interface ItemDisplay {
  id: string;
  title: string;
  category: string;
  brand: string;
  originalPrice: number;
  ageMonths: number;
  ownerId: string;
  photos: string[];
  customListing?: boolean;
  assessment?: { grade?: { condition?: string }; price?: number };
  route?: { path: string };
}

interface Props {
  allItems: ItemDisplay[];
  myItems: ItemDisplay[];
  trust: { score: number; totalDeals: number };
  green: { totalCredits: number };
}

export default function SellerHome({ allItems, myItems, trust, green }: Props) {
  const { activeSeller } = useRole();
  const [sellerItems, setSellerItems] = useState<ItemDisplay[]>(myItems);

  useEffect(() => {
    const sellerId = activeSeller?.id ?? "user_self";
    if (sellerId === "user_self") {
      setSellerItems(myItems);
    } else {
      setSellerItems(allItems.filter((i) => i.ownerId === sellerId));
    }
  }, [activeSeller, allItems, myItems]);

  const sellerId = activeSeller?.id ?? "user_self";
  const isDefaultUser = sellerId === "user_self";

  return (
    <>
      {/* Header with stats */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isDefaultUser ? "My Items" : `${activeSeller?.name}'s Items`}
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {isDefaultUser
              ? "Your Amazon purchases + custom listings. Tap to give a second life."
              : "Tap an item to grade and list, or add a new product."}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 rounded-xl border border-neutral-800 bg-[var(--bg-card)] px-4 py-2 text-center hover:border-amber-500/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Trust</p>
              <p className={`text-lg font-bold ${trust.score >= 80 ? "text-green-400" : trust.score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                {trust.score}
              </p>
            </div>
            <div className="h-8 w-px bg-neutral-800" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Credits</p>
              <p className="text-lg font-bold text-green-400">{green.totalCredits}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* List a product button */}
      {/* Action buttons row */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Link
          href="/sell/new"
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-800/30 p-5 text-[var(--text-secondary)] transition-colors hover:border-amber-500/40 hover:text-amber-400"
        >
          <span className="text-2xl">➕</span>
          <span className="font-medium text-sm">List a product</span>
        </Link>
        <Link
          href="/seller/dashboard"
          className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-800/30 p-5 text-[var(--text-secondary)] transition-colors hover:border-blue-500/40 hover:text-blue-400"
        >
          <span className="text-2xl">📊</span>
          <span className="font-medium text-sm">Interest Signals</span>
        </Link>
      </div>

      {/* Items grid */}
      {sellerItems.length === 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-8 text-center">
          <p className="text-[var(--text-secondary)]">No items yet. List your first product above!</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sellerItems.map((item) => {
          const condition = item.assessment?.grade?.condition as Condition | undefined;
          const estimatedValue = estimateResaleValue(
            item.originalPrice,
            item.ageMonths,
            item.category,
            condition
          );
          const fastDep = isFastDepreciating(item.category);
          const monthlyDrop = monthlyValueDrop(item.originalPrice, item.category);
          const isListed = !!item.route && (item.route.path === "ship_direct" || item.route.path === "list_hold");
          const hasPhotos = item.photos.length > 0;

          return (
            <div
              key={item.id}
              className="group rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5 transition-colors hover:border-amber-500/40 hover:bg-[var(--bg-card-hover)]"
            >
              {/* Top badges */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                    {item.category.replace(/_/g, " ")}
                  </span>
                  {item.customListing && (
                    <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                      Custom
                    </span>
                  )}
                  {isListed && (
                    <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] font-medium text-green-400">
                      Live
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--text-secondary)]">
                  {item.ageMonths}mo old
                </span>
              </div>

              {/* Photo thumbnail if available */}
              {hasPhotos && (
                <div className="mb-3 h-24 w-full overflow-hidden rounded-xl border border-neutral-700">
                  <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover" />
                </div>
              )}

              <h2 className="text-lg font-semibold leading-tight">{item.title}</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.brand}</p>

              {/* Value tracker */}
              <div className="mt-3 rounded-lg bg-neutral-800/50 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Est. value</span>
                  <span className="text-sm font-bold text-amber-400">
                    ₹{estimatedValue.toLocaleString("en-IN")}
                  </span>
                </div>
                {fastDep && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="text-[10px] text-red-400 font-semibold animate-pulse">
                      ⚡ Act now
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      — losing ~₹{monthlyDrop}/mo
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                {item.customListing ? "Asking" : "Paid"}{" "}
                <span className="font-medium text-[var(--text-primary)]">
                  ₹{item.originalPrice.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Action button */}
              {isListed ? (
                <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-center text-sm font-medium text-green-400">
                  ✓ Listed on marketplace
                </div>
              ) : (
                <Link
                  href={`/item/${item.id}/capture`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-amber-400"
                >
                  <span>✨</span>
                  {hasPhotos ? "Re-grade & List" : "Give it a second life"}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Re-enrolled items from buyers (the loop demo) */}
      {allItems.filter((i) => i.ownerId !== "user_self" && !allItems.some((s) => s.id === i.id && sellerItems.includes(s))).length > 0 && isDefaultUser && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-2">♻️ Re-enrolled Items (Buyer Loop)</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Items that completed a second-life cycle and are pre-enrolled for new owners.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allItems
              .filter((i) => i.ownerId !== "user_self" && !sellerItems.some((s) => s.id === i.id))
              .slice(0, 6)
              .map((item) => (
                <div key={item.id} className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
                  <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">
                    ♻️ Pre-enrolled
                  </span>
                  <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{item.brand} • Owner: {item.ownerId}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
