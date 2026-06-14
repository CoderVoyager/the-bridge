"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/components/RoleContext";
import Link from "next/link";

const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "footwear", label: "Footwear" },
  { value: "baby_gear", label: "Baby Gear" },
  { value: "kitchen_appliances", label: "Kitchen Appliances" },
  { value: "winter_wear", label: "Winter Wear" },
  { value: "apparel", label: "Apparel" },
  { value: "audio", label: "Audio / Headphones" },
  { value: "gaming", label: "Gaming" },
  { value: "fitness", label: "Fitness" },
  { value: "books", label: "Books" },
  { value: "other", label: "Other" },
];

export default function ListProductPage() {
  const { activeSeller } = useRole();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("electronics");
  const [brand, setBrand] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [ageMonths, setAgeMonths] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !brand || !askingPrice) {
      setError("Please fill in all required fields.");
      return;
    }

    const sellerId = activeSeller?.id ?? "user_self";
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/items/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          brand,
          askingPrice: Number(askingPrice),
          ageMonths: Number(ageMonths) || 0,
          sellerId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Navigate to capture flow for this new item
        router.push(`/item/${json.item.id}/capture`);
      } else {
        setError(json.error || "Failed to create listing.");
        setSubmitting(false);
      }
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">List a Product</h1>
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          ← Back
        </Link>
      </div>

      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        List any item you want to sell — it doesn&apos;t need to be from Amazon.
        After filling in details, you&apos;ll take photos for AI grading and your item will be live on the marketplace.
      </p>

      {activeSeller && (
        <div className="mb-4 rounded-lg bg-neutral-800 px-3 py-2 text-xs text-[var(--text-secondary)]">
          Listing as: <span className="font-medium text-[var(--text-primary)]">{activeSeller.name}</span> ({activeSeller.city})
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Product Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sony WH-1000XM4 Headphones"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-neutral-500 outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-amber-500/50"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium mb-1">Brand *</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Sony"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-neutral-500 outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Price + Age row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Asking Price (₹) *</label>
            <input
              type="number"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-neutral-500 outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Age (months)</label>
            <input
              type="number"
              value={ageMonths}
              onChange={(e) => setAgeMonths(e.target.value)}
              placeholder="e.g. 6"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-neutral-500 outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-amber-500 px-6 py-3.5 text-base font-bold text-neutral-900 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Next: Take Photos for AI Grading →"}
        </button>

        <p className="text-center text-xs text-[var(--text-secondary)]">
          After this, you&apos;ll capture 3 photos. AI will grade your item and it&apos;ll go live instantly.
        </p>
      </form>
    </div>
  );
}
