"use client";

import { useRole } from "./RoleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomeRedirect() {
  const { role } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (role === "buyer") {
      router.push("/shop");
    }
  }, [role, router]);

  return null;
}
