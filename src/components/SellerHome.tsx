"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRole } from "./RoleContext";
import { estimateResaleValue, isFastDepreciating, monthlyValueDrop } from "@/lib/value";
import { isReturnable, computeDeliveryCashback } from "@/lib/types";
import type { Condition, Item } from "@/lib/types";

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
  purchaseDate?: string;
  deliveryCharge?: number;
  returnHold?: {
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

  // Split items into categories
  const returnableItems = sellerItems.filter((item) => {
    if (item.customListing) return false;
    if (!item.purchaseDate) return false;
    const daysSince = (Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  });

  const activeHoldItems = sellerItems.filter((item) => 
    item.returnHold?.status === "holding" && 
    (!item.route || (item.route.path !== "refurbish" && item.route.path !== "repair" && item.route.path !== "donate"))
  );

  const resaleItems = sellerItems.filter((item) => {
    if (item.customListing) return true; // custom items go here
    if (item.returnHold?.status === "holding") return false;
    if (!item.purchaseDate) return true;
    const daysSince = (Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 30;
  });

  // Items eligible for return that haven't been initiated yet
  const pendingReturnItems = returnableItems.filter(
    (item) => !item.returnHold && !item.route
  );

  // Items routed to warehouse or donated (after AI grading)
  const warehouseItems = sellerItems.filter((item) =>
    item.returnHold?.status === "holding" &&
    item.route && (item.route.path === "refurbish" || item.route.path === "repair")
  );

  const donatedReturnItems = sellerItems.filter((item) =>
    item.returnHold?.status === "holding" &&
    item.route && item.route.path === "donate"
  );

  return (
    <>
      {/* Header with stats */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isDefaultUser ? "My Items" : `${activeSeller?.name}'s Items`}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage returns, list for resale, or add new products.
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

      {/* ============================================ */}
      {/* SECTION 1: Active Bridge Returns (Hold Buffer) */}
      {/* ============================================ */}
      {activeHoldItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>🔄</span> Active Bridge Returns
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeHoldItems.map((item) => {
              const hold = item.returnHold!;
              const daysLeft = Math.max(0, Math.ceil(
                (new Date(hold.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              ));
              const daysWaited = 7 - daysLeft;
              const cashbackEarned = computeDeliveryCashback(daysWaited, hold.originalDeliveryCharge);

              return (
                <div key={item.id} className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
                      Finding buyer...
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      ⏱️ {daysLeft}d left
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{item.brand}</p>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-neutral-800">
                      <div
                        className="h-1.5 rounded-full bg-blue-400 transition-all"
                        style={{ width: `${((7 - daysLeft) / 7) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-[var(--text-secondary)]">
                      <span>Day {daysWaited}/7</span>
                      <span>💰 ₹{cashbackEarned}/₹{hold.originalDeliveryCharge} cashback</span>
                    </div>
                  </div>

                  {/* Interest signals */}
                  <div className="mt-3 flex gap-3 text-xs text-[var(--text-secondary)]">
                    <span>👀 {hold.viewCount} views</span>
                    <span>🔔 {hold.interestedCount} interested</span>
                  </div>

                  {/* Refund info */}
                  <div className="mt-3 rounded-lg bg-neutral-800/50 p-2 text-xs">
                    <span className="text-[var(--text-secondary)]">Refund: </span>
                    <span className="font-medium text-green-400">₹{hold.refundAmount.toLocaleString("en-IN")} guaranteed</span>
                  </div>

                  <Link
                    href={`/item/${item.id}/return`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20"
                  >
                    View details →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 1b: Warehouse/Donated Returns */}
      {/* ============================================ */}
      {(warehouseItems.length > 0 || donatedReturnItems.length > 0) && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>✅</span> Return Processed
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {warehouseItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 text-[10px] font-bold text-orange-400">
                    🔧 Warehouse Refurb
                  </span>
                </div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{item.brand}</p>
                <div className="mt-3 rounded-lg bg-neutral-800/50 p-2 text-xs">
                  <span className="text-[var(--text-secondary)]">Refund: </span>
                  <span className="font-medium text-green-400">₹{item.originalPrice.toLocaleString("en-IN")} processed ✓</span>
                </div>
                <Link
                  href={`/item/${item.id}/return`}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-400 hover:bg-orange-500/20"
                >
                  View details →
                </Link>
              </div>
            ))}
            {donatedReturnItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold text-purple-400">
                    🎁 Donated
                  </span>
                </div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{item.brand}</p>
                <div className="mt-3 rounded-lg bg-neutral-800/50 p-2 text-xs">
                  <span className="text-[var(--text-secondary)]">Refund: </span>
                  <span className="font-medium text-green-400">₹{item.originalPrice.toLocaleString("en-IN")} processed ✓</span>
                </div>
                <Link
                  href={`/item/${item.id}/return`}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-medium text-purple-400 hover:bg-purple-500/20"
                >
                  View details →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 2: Eligible for Bridge Return */}
      {/* ============================================ */}
      {pendingReturnItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <span>📦</span> Recent Orders — Eligible for Bridge Return
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Purchased within 30 days. Return via The Bridge to save the planet and earn cashback.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingReturnItems.map((item) => {
              const daysSincePurchase = Math.floor(
                (Date.now() - new Date(item.purchaseDate!).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div key={item.id} className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5 hover:border-green-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2.5 py-0.5 text-[10px] font-bold text-green-400">
                      Returnable
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Bought {daysSincePurchase}d ago
                    </span>
                  </div>

                  {item.photos.length > 0 && (
                    <div className="mb-3 h-20 w-full overflow-hidden rounded-xl border border-neutral-700">
                      <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                  )}

                  <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{item.brand}</p>

                  <div className="mt-2 text-xs text-[var(--text-secondary)]">
                    Paid <span className="font-medium text-[var(--text-primary)]">₹{item.originalPrice.toLocaleString("en-IN")}</span>
                    {item.deliveryCharge ? ` + ₹${item.deliveryCharge} delivery` : ""}
                  </div>

                  {/* Bridge return benefit */}
                  <div className="mt-3 rounded-lg bg-green-500/5 border border-green-500/20 p-2.5">
                    <p className="text-[11px] text-green-400 font-medium">
                      🌉 Bridge Return: full refund + up to ₹{item.deliveryCharge ?? 0} delivery cashback
                    </p>
                  </div>

                  <Link
                    href={`/item/${item.id}/return`}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-green-400"
                  >
                    🔄 Return via Bridge
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 3: Past Orders — Give a Second Life */}
      {/* ============================================ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>♻️</span> {resaleItems.length > 0 ? "Give a Second Life" : "Your Items"}
          </h2>
          <Link
            href="/seller/dashboard"
            className="text-xs text-[var(--text-secondary)] hover:text-blue-400 transition-colors"
          >
            📊 Interest Signals →
          </Link>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Older items or custom listings. Grade & list to earn money or donate.
        </p>

        {/* List a product button */}
        <Link
          href="/sell/new"
          className="mb-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-800/30 p-4 text-[var(--text-secondary)] transition-colors hover:border-amber-500/40 hover:text-amber-400"
        >
          <span className="text-xl">➕</span>
          <span className="font-medium text-sm">List a product (not from Amazon)</span>
        </Link>

        {resaleItems.length === 0 && (
          <div className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No older items. Use the button above to list something!</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resaleItems.map((item) => {
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
            const isSold = !!item.route && (item.route.path as string) === "sold";
            const hasPhotos = item.photos.length > 0;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5 transition-colors hover:border-amber-500/40 hover:bg-[var(--bg-card-hover)]"
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
                    {isSold && (
                      <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                        Sold ✓
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {item.ageMonths}mo old
                  </span>
                </div>

                {/* Photo */}
                {hasPhotos && (
                  <div className="mb-3 h-24 w-full overflow-hidden rounded-xl border border-neutral-700">
                    <img src={item.photos[0]} alt={item.title} className="h-full w-full object-cover" />
                  </div>
                )}

                <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{item.brand}</p>

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
                      <span className="text-[10px] text-red-400 font-semibold animate-pulse">⚡ Act now</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">— losing ~₹{monthlyDrop}/mo</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 text-xs text-[var(--text-secondary)]">
                  {item.customListing ? "Asking" : "Paid"}{" "}
                  <span className="font-medium text-[var(--text-primary)]">₹{item.originalPrice.toLocaleString("en-IN")}</span>
                </div>

                {/* Action button */}
                {isSold ? (
                  <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-center text-sm font-medium text-blue-400">
                    🎉 Sold — funds received
                  </div>
                ) : isListed ? (
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
      </div>
    </>
  );
}
