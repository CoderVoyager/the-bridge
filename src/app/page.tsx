import Link from "next/link";
import { getItems } from "@/lib/store";
import { getTrustRecord } from "@/lib/trust";
import { getUserGreenCredits } from "@/lib/green";
import { estimateResaleValue, isFastDepreciating, monthlyValueDrop } from "@/lib/value";
import { Condition } from "@/lib/types";
import HomeRedirect from "@/components/HomeRedirect";
import SellerHome from "@/components/SellerHome";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const items = getItems();
  const trust = getTrustRecord("user_self");
  const green = getUserGreenCredits("user_self");

  // Items owned by the default user (Amazon past orders)
  const myItems = items.filter((item) => item.ownerId === "user_self");

  return (
    <div>
      <HomeRedirect />
      <SellerHome
        allItems={JSON.parse(JSON.stringify(items))}
        myItems={JSON.parse(JSON.stringify(myItems))}
        trust={JSON.parse(JSON.stringify(trust))}
        green={{ totalCredits: green.totalCredits }}
      />
    </div>
  );
}
