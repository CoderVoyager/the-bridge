"use client";

import { useRole } from "./RoleContext";
import { useRouter, usePathname } from "next/navigation";

export default function RoleSwitcher() {
  const { role, setRole, activeBuyer, setActiveBuyer, activeSeller, setActiveSeller, buyers, sellers } = useRole();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      {/* Role toggle */}
      <div className="flex rounded-lg border border-neutral-700 overflow-hidden text-xs">
        <button
          onClick={() => {
            setRole("seller");
            if (!activeSeller) {
              setActiveSeller({ id: "user_self", name: "You (My Orders)", city: "Mumbai" });
            }
            // Navigate to seller home if currently on buyer pages
            if (pathname.startsWith("/shop")) {
              router.push("/");
            }
          }}
          className={`px-3 py-1.5 font-medium transition-colors ${
            role === "seller"
              ? "bg-amber-500 text-neutral-900"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Seller
        </button>
        <button
          onClick={() => {
            setRole("buyer");
            if (!activeBuyer && buyers.length > 0) {
              setActiveBuyer(buyers[0]);
            }
            // Navigate to shop if currently on seller pages
            if (pathname === "/" || pathname.startsWith("/sell") || pathname.startsWith("/seller")) {
              router.push("/shop");
            }
          }}
          className={`px-3 py-1.5 font-medium transition-colors ${
            role === "buyer"
              ? "bg-amber-500 text-neutral-900"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Buyer
        </button>
      </div>

      {/* Seller selector */}
      {role === "seller" && (
        <select
          value={activeSeller?.id ?? "user_self"}
          onChange={(e) => {
            const id = e.target.value;
            if (id === "user_self") {
              setActiveSeller({ id: "user_self", name: "You (My Orders)", city: "Mumbai" });
            } else {
              const s = sellers.find((x) => x.id === id);
              if (s) setActiveSeller(s);
            }
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500/50"
        >
          <option value="user_self">You (My Orders)</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.avatar ?? ""} {s.name} ({s.city})
            </option>
          ))}
        </select>
      )}

      {/* Buyer selector */}
      {role === "buyer" && (
        <select
          value={activeBuyer?.id ?? ""}
          onChange={(e) => {
            const b = buyers.find((x) => x.id === e.target.value);
            setActiveBuyer(b ?? null);
          }}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500/50"
        >
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.city})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
