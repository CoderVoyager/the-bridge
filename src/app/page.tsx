import Link from "next/link";
import { getItems } from "@/lib/store";
import { getTrustRecord } from "@/lib/trust";
import { getUserGreenCredits } from "@/lib/green";
import { estimateResaleValue, isFastDepreciating, monthlyValueDrop } from "@/lib/value";
import { Condition } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const items = getItems();
  const trust = getTrustRecord("user_self");
  const green = getUserGreenCredits("user_self");

  // Only show items owned by current user
  const myItems = items.filter((item) => item.ownerId === "user_self");

  return (
    <div>
      {/* Header with stats */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Items</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Tap an item to give it a second life — someone out there needs it.
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {myItems.map((item) => {
          const condition = item.assessment?.grade?.condition as Condition | undefined;
          const estimatedValue = estimateResaleValue(
            item.originalPrice,
            item.ageMonths,
            item.category,
            condition
          );
          const fastDep = isFastDepreciating(item.category);
          const monthlyDrop = monthlyValueDrop(item.originalPrice, item.category);

          return (
            <div
              key={item.id}
              className="group rounded-2xl border border-neutral-800 bg-[var(--bg-card)] p-5 transition-colors hover:border-amber-500/40 hover:bg-[var(--bg-card-hover)]"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                  {item.category.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {item.ageMonths}mo old
                </span>
              </div>

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
                Paid{" "}
                <span className="font-medium text-[var(--text-primary)]">
                  ₹{item.originalPrice.toLocaleString("en-IN")}
                </span>
              </div>

              <Link
                href={`/item/${item.id}/capture`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-amber-400"
              >
                <span>✨</span>
                Give it a second life
              </Link>
            </div>
          );
        })}
      </div>

      {/* Buyer items (loop demonstration) */}
      {items.filter((i) => i.ownerId !== "user_self").length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-2">♻️ Re-enrolled Items (Buyer View)</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            These items completed a second-life cycle and are pre-enrolled for their new owners.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((i) => i.ownerId !== "user_self")
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">
                      ♻️ Pre-enrolled
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {item.brand} • Owner: {item.ownerId}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    📍 {item.location.city} • Can be re-sold in one tap
                  </p>
                  {item.assessment && (
                    <p className="mt-2 text-xs">
                      Pre-graded:{" "}
                      <span className="font-medium text-green-400 capitalize">
                        {item.assessment.grade.condition.replace("_", " ")}
                      </span>
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
