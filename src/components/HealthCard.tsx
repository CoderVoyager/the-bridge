"use client";

interface HealthCardProps {
  title: string;
  brand: string;
  category: string;
  originalPrice: number;
  ageMonths: number;
  condition: string;
  defects: string[];
  summary: string;
  confidence: number;
  riskFlags: string[];
  trustScore: number;
}

const CONDITION_COLORS: Record<string, string> = {
  like_new: "text-green-400 border-green-500/30 bg-green-500/10",
  good: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  fair: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  damaged: "text-red-400 border-red-500/30 bg-red-500/10",
};

export default function HealthCard({
  title,
  brand,
  category,
  originalPrice,
  ageMonths,
  condition,
  defects,
  summary,
  confidence,
  riskFlags,
  trustScore,
}: HealthCardProps) {
  const inWarranty = ageMonths < 12;
  const purchaseDate = new Date();
  purchaseDate.setMonth(purchaseDate.getMonth() - ageMonths);
  const purchaseDateStr = purchaseDate.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });

  const conditionStyle = CONDITION_COLORS[condition] || "";

  // Determine which safety badges to show as completed
  const hasDataWipe = riskFlags.includes("needs_data_wipe");
  const hasSanitization = riskFlags.includes("needs_sanitization");

  return (
    <div className="rounded-2xl border border-neutral-700 bg-gradient-to-b from-neutral-800/80 to-neutral-900/80 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {brand} • {category.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {trustScore >= 80 && (
            <span className="rounded-full bg-green-500/10 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold text-green-400">
              ✓ Trusted Seller
            </span>
          )}
          <span className="text-xs text-[var(--text-secondary)]">
            Score: <span className="font-semibold text-[var(--text-primary)]">{trustScore}</span>/100
          </span>
        </div>
      </div>

      {/* Condition */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${conditionStyle}`}>
            {condition.replace("_", " ")}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {(confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{summary}</p>
        {defects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {defects.map((d, i) => (
              <span key={i} className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="grid grid-cols-3 gap-3 mb-4 rounded-xl bg-neutral-800/50 p-3">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Purchased</p>
          <p className="text-sm font-medium">{purchaseDateStr}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Original</p>
          <p className="text-sm font-medium">₹{originalPrice.toLocaleString("en-IN")}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Warranty</p>
          <p className={`text-sm font-medium ${inWarranty ? "text-green-400" : "text-[var(--text-secondary)]"}`}>
            {inWarranty ? "Active" : "Expired"}
          </p>
        </div>
      </div>

      {/* Safety Badges */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">
          Safety Verification
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-400">
            ✓ Recall-checked
          </span>
          {hasDataWipe && (
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-400">
              ✓ Data wiped
            </span>
          )}
          {hasSanitization && (
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-400">
              ✓ Sanitized
            </span>
          )}
          {!hasDataWipe && !hasSanitization && (
            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-400">
              ✓ No extra steps needed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
