"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Role = "seller" | "buyer";

interface PersonaInfo {
  id: string;
  name: string;
  city: string;
  avatar?: string;
}

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  activeBuyer: PersonaInfo | null;
  setActiveBuyer: (buyer: PersonaInfo | null) => void;
  activeSeller: PersonaInfo | null;
  setActiveSeller: (seller: PersonaInfo | null) => void;
  buyers: PersonaInfo[];
  sellers: PersonaInfo[];
}

const RoleContext = createContext<RoleContextValue>({
  role: "seller",
  setRole: () => {},
  activeBuyer: null,
  setActiveBuyer: () => {},
  activeSeller: null,
  setActiveSeller: () => {},
  buyers: [],
  sellers: [],
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("seller");
  const [activeBuyer, setActiveBuyer] = useState<PersonaInfo | null>(null);
  const [activeSeller, setActiveSeller] = useState<PersonaInfo | null>(null);
  const [buyers, setBuyers] = useState<PersonaInfo[]>([]);
  const [sellers, setSellers] = useState<PersonaInfo[]>([]);

  useEffect(() => {
    // Fetch buyers
    fetch("/api/buyers")
      .then((res) => res.json())
      .then((data) => setBuyers(data.buyers))
      .catch(() => {});

    // Fetch sellers
    fetch("/api/sellers")
      .then((res) => res.json())
      .then((data) => {
        setSellers(data.sellers);
        // Default seller is "user_self" (Amazon past orders)
        const defaultSeller = { id: "user_self", name: "You (My Orders)", city: "Mumbai" };
        setActiveSeller(defaultSeller);
      })
      .catch(() => {});
  }, []);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        activeBuyer,
        setActiveBuyer,
        activeSeller,
        setActiveSeller,
        buyers,
        sellers,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
