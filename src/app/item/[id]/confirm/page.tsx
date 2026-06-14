"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Seller-side confirm is no longer needed.
// Escrow happens only on buyer side at /shop/[id].
// Redirect sellers back home.
export default function ConfirmRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-[var(--text-secondary)]">Redirecting…</p>
    </div>
  );
}
