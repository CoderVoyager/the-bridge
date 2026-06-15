"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRole } from "@/components/RoleContext";
import Link from "next/link";

interface ShopItem {
  id: string;
  title: string;
  brand: string;
  category: string;
  originalPrice: number;
  resalePrice: number;
  condition: string;
  summary: string;
  confidence: number;
  location: { lat: number; lng: number; city: string };
  distanceKm: number | null;
  hasPhotos: boolean;
  firstPhoto: string | null;
  routePath: string;
  ownerId: string;
  customListing: boolean;
  isOpenBox: boolean;
  openBoxDaysLeft: number | null;
  relevanceScore: number | null;
  reasons: string[];
}

interface ProactiveOffer {
  buyerId: string;
  buyerName: string;
  itemId: string;
  itemTitle: string;
  condition: string;
  price: number;
  originalPrice: number;
  distanceKm: number;
  category: string;
}

const CONDITION_BADGES: Record<string, { label: string; color: string }> = {
  like_new: { label: "Like New", color: "bg-green-100 text-green-800 border-green-200" },
  good: { label: "Good", color: "bg-blue-100 text-blue-800 border-blue-200" },
  fair: { label: "Fair", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  damaged: { label: "Damaged", color: "bg-red-100 text-red-800 border-red-200" },
};

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "electronics", label: "Electronics" },
  { value: "footwear", label: "Footwear" },
  { value: "baby_gear", label: "Baby Gear" },
  { value: "kitchen_appliances", label: "Kitchen" },
  { value: "winter_wear", label: "Winter Wear" },
  { value: "audio", label: "Audio" },
  { value: "apparel", label: "Apparel" },
];

const SORT_OPTIONS = [
  { value: "relevant", label: "Most Relevant" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "condition", label: "Best Condition" },
  { value: "nearest", label: "Nearest First" },
];

export default function ShopPage() {
  const { activeBuyer, role } = useRole();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [offers, setOffers] = useState<ProactiveOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [sortBy, setSortBy] = useState("relevant");
  const [noResults, setNoResults] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [notifyToast, setNotifyToast] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterPriceRange, setFilterPriceRange] = useState("");
  const [filterDistance, setFilterDistance] = useState("");
  const [filterItemType, setFilterItemType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeBuyer) params.set("buyerId", activeBuyer.id);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (activeCategory) params.set("category", activeCategory);
    if (sortBy) params.set("sort", sortBy);
    if (filterCondition) params.set("condition", filterCondition);
    if (filterPriceRange) {
      const [min, max] = filterPriceRange.split("-");
      if (min) params.set("priceMin", min);
      if (max) params.set("priceMax", max);
    }
    if (filterDistance) params.set("maxDistance", filterDistance);
    if (filterItemType) params.set("itemType", filterItemType);

    try {
      const res = await fetch(`/api/shop?${params.toString()}`);
      const json = await res.json();
      setItems(json.items ?? []);
      setOffers(json.offers ?? []);
      setNoResults(json.noResults ?? false);
      setTotalResults(json.totalResults ?? 0);
    } catch {
      setItems([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [activeBuyer, searchQuery, activeCategory, sortBy, filterCondition, filterPriceRange, filterDistance, filterItemType]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  // Log search event when query changes and buyer is active
  useEffect(() => {
    if (searchQuery.trim() && activeBuyer) {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "search",
          query: searchQuery.trim(),
          buyerCity: activeBuyer.city,
          distanceKm: 0,
          buyerId: activeBuyer.id,
        }),
      }).catch(() => {});
    }
  }, [searchQuery, activeBuyer]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // fetchShop runs via useEffect when searchQuery changes
  };

  // Log view event when buyer clicks an item
  const logViewEvent = (itemId: string, distKm: number | null) => {
    if (!activeBuyer) return;
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "view",
        itemId,
        buyerCity: activeBuyer.city,
        distanceKm: distKm ?? 0,
        buyerId: activeBuyer.id,
      }),
    }).catch(() => {});
  };

  const handleNotifyMe = async (category: string) => {
    if (!activeBuyer) return;
    await fetch(`/api/buyers/${activeBuyer.id}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", category: category || searchQuery.trim(), maxPrice: 99999 }),
    });
    setNotifyToast(`We'll notify you when "${searchQuery.trim() || category}" is available!`);
    setTimeout(() => setNotifyToast(""), 4000);
  };

  return (
    <div className="-mx-4 -mt-8">
      {/* Search header — Amazon-style */}
      <div className="bg-gradient-to-b from-neutral-900 to-[var(--bg-primary)] border-b border-neutral-800 px-4 pt-4 pb-5">
        <form onSubmit={handleSearch} className="mx-auto max-w-3xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search second-life products..."
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 pl-10 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-neutral-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">🔍</span>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-amber-400 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Category pills */}
        <div className="mx-auto max-w-3xl mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.value
                  ? "bg-amber-500 text-neutral-900"
                  : "bg-neutral-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-neutral-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs text-[var(--text-secondary)] hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          <span>🔽</span> {showFilters ? "Hide filters" : "Show filters"}
          {(filterCondition || filterPriceRange || filterDistance || filterItemType) && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-neutral-900">
              Active
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-2">
            {/* Condition filter */}
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500/50"
            >
              <option value="">Any condition</option>
              <option value="like_new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="like_new,good">Like New + Good</option>
            </select>

            {/* Price range */}
            <select
              value={filterPriceRange}
              onChange={(e) => setFilterPriceRange(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500/50"
            >
              <option value="">Any price</option>
              <option value="0-1000">Under ₹1,000</option>
              <option value="1000-5000">₹1,000 – ₹5,000</option>
              <option value="5000-20000">₹5,000 – ₹20,000</option>
              <option value="20000-50000">₹20,000 – ₹50,000</option>
              <option value="50000-">₹50,000+</option>
            </select>

            {/* Distance filter */}
            <select
              value={filterDistance}
              onChange={(e) => setFilterDistance(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500/50"
            >
              <option value="">Any distance</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="200">Within 200 km</option>
            </select>

            {/* Item type */}
            <select
              value={filterItemType}
              onChange={(e) => setFilterItemType(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500/50"
            >
              <option value="">All items</option>
              <option value="openbox">Open-box returns only</option>
              <option value="resale">Resale only</option>
            </select>

            {/* Clear filters */}
            {(filterCondition || filterPriceRange || filterDistance || filterItemType) && (
              <button
                onClick={() => {
                  setFilterCondition("");
                  setFilterPriceRange("");
                  setFilterDistance("");
                  setFilterItemType("");
                }}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
              >
                ✕ Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notify toast */}
      {notifyToast && (
        <div className="mx-4 mt-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center text-sm text-green-400 animate-in fade-in">
          🔔 {notifyToast}
        </div>
      )}

      {/* Proactive Offers */}
      {offers.length > 0 && (
        <div className="mx-4 mt-4 space-y-2">
          {offers.map((offer, i) => (
            <Link
              key={i}
              href={`/shop/${offer.itemId}`}
              className="block rounded-xl border-2 border-green-500/40 bg-gradient-to-r from-green-500/10 to-transparent p-3 hover:from-green-500/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔔</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-400">New match!</p>
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    <span className="capitalize">{offer.condition.replace("_", " ")}</span>{" "}
                    <span className="font-semibold">{offer.itemTitle}</span> • {offer.distanceKm} km away •{" "}
                    <span className="text-amber-400 font-bold">₹{offer.price.toLocaleString("en-IN")}</span>{" "}
                    <span className="text-[var(--text-secondary)]">(₹{(offer.originalPrice - offer.price).toLocaleString("en-IN")} off)</span>
                  </p>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Results bar */}
      <div className="mx-4 mt-4 flex items-center justify-between">
        <div className="text-sm text-[var(--text-secondary)]">
          {loading ? "Searching..." : (
            searchQuery
              ? <>{totalResults} result{totalResults !== 1 ? "s" : ""} for &quot;<span className="text-[var(--text-primary)] font-medium">{searchQuery}</span>&quot;</>
              : <>{totalResults} item{totalResults !== 1 ? "s" : ""} available</>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Buyer context */}
      {activeBuyer && (
        <div className="mx-4 mt-2 text-xs text-[var(--text-secondary)]">
          📍 Browsing from <span className="text-[var(--text-primary)]">{activeBuyer.city}</span> as{" "}
          <span className="text-amber-400">{activeBuyer.name}</span>
        </div>
      )}
      {role !== "buyer" && (
        <div className="mx-4 mt-2 text-xs text-amber-400">
          💡 Switch to Buyer in header for personalized results + distance
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-[var(--text-secondary)]">Loading...</div>
        </div>
      )}

      {/* No results */}
      {!loading && noResults && (
        <div className="mx-4 mt-8 rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-lg font-semibold">No matches for &quot;{searchQuery}&quot;</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This item isn&apos;t available yet — but we can notify you the moment someone lists one.
          </p>
          {activeBuyer && (
            <button
              onClick={() => handleNotifyMe("")}
              className="mt-4 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-amber-400"
            >
              🔔 Notify me when available
            </button>
          )}
        </div>
      )}

      {/* Empty state (no items at all) */}
      {!loading && !noResults && items.length === 0 && !searchQuery && (
        <div className="mx-4 mt-8 rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-8 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h2 className="text-lg font-semibold">No items on the marketplace yet</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Switch to Seller mode and list a product to see it here.
          </p>
        </div>
      )}

      {/* Product grid */}
      {!loading && items.length > 0 && (
        <div className="mx-4 mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const saving = item.originalPrice - item.resalePrice;
            const savingPct = Math.round((saving / item.originalPrice) * 100);
            const condBadge = CONDITION_BADGES[item.condition] || { label: item.condition, color: "bg-neutral-100 text-neutral-800" };

            return (
              <Link
                key={item.id}
                href={`/shop/${item.id}`}
                onClick={() => logViewEvent(item.id, item.distanceKm)}
                className="group rounded-2xl border border-neutral-800 bg-[var(--bg-card)] overflow-hidden transition-all hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
              >
                {/* Photo area */}
                <div className="h-40 bg-neutral-800 relative overflow-hidden">
                  {item.firstPhoto ? (
                    <img src={item.firstPhoto} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-4xl text-neutral-600">
                      📷
                    </div>
                  )}
                  {/* Condition badge overlay */}
                  <span className={`absolute top-2 left-2 rounded-full border px-2 py-0.5 text-[10px] font-bold ${condBadge.color}`}>
                    {condBadge.label}
                  </span>
                  {/* Open-box badge */}
                  {item.isOpenBox && (
                    <span className="absolute top-2 left-20 rounded-full bg-purple-600 border border-purple-400 px-2 py-0.5 text-[10px] font-bold text-white">
                      📦 Open-box • {item.openBoxDaysLeft}d left
                    </span>
                  )}
                  {/* Distance badge */}
                  {item.distanceKm !== null && (
                    <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white font-medium">
                      📍 {item.distanceKm} km
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Reason tags */}
                  {item.reasons.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {item.reasons.map((r, i) => (
                        <span key={i} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{item.brand}</p>

                  {/* Price */}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-amber-400">
                      ₹{item.resalePrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] line-through">
                      ₹{item.originalPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                      -{savingPct}%
                    </span>
                  </div>

                  {/* Bottom row */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                    <span>📍 {item.location.city}</span>
                    <span>{(item.confidence * 100).toFixed(0)}% verified</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Buyer's own items (loop) */}
      <BuyerOwnItems />
    </div>
  );
}

// Sub-component for buyer's own re-enrolled items
function BuyerOwnItems() {
  const { activeBuyer } = useRole();
  const [buyerItems, setBuyerItems] = useState<Array<{ id: string; title: string; brand: string; category: string; condition?: string }>>([]);

  useEffect(() => {
    if (!activeBuyer) { setBuyerItems([]); return; }
    fetch(`/api/buyers/${activeBuyer.id}/items`)
      .then((r) => r.json())
      .then((d) => setBuyerItems(d.items ?? []))
      .catch(() => setBuyerItems([]));
  }, [activeBuyer]);

  if (!activeBuyer || buyerItems.length === 0) return null;

  return (
    <div className="mx-4 mt-10 mb-8">
      <h2 className="text-lg font-bold mb-2">♻️ My Items (ready to re-sell)</h2>
      <p className="text-xs text-[var(--text-secondary)] mb-3">
        Items you&apos;ve bought through The Bridge — pre-enrolled for one-tap resale.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {buyerItems.map((bi) => (
          <div key={bi.id} className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">
              ♻️ Pre-enrolled
            </span>
            <h3 className="mt-2 text-sm font-semibold">{bi.title}</h3>
            <p className="text-xs text-[var(--text-secondary)]">{bi.brand}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
