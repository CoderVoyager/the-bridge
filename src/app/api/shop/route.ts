import { NextRequest, NextResponse } from 'next/server';
import { getItems, getBuyerById } from '@/lib/store';
import { distanceKm, scoreItemsForBuyer, findProactiveOffers } from '@/lib/buyer';
import { Item } from '@/lib/types';

function fuzzyMatch(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  // Exact substring match
  if (lower.includes(q)) return 1.0;

  // Word-level matching
  const queryWords = q.split(/\s+/);
  const matchedWords = queryWords.filter((w) => lower.includes(w));
  return matchedWords.length / queryWords.length;
}

function searchScore(item: Item, query: string): number {
  if (!query.trim()) return 0;
  const titleScore = fuzzyMatch(item.title, query) * 3;
  const brandScore = fuzzyMatch(item.brand, query) * 2;
  const categoryScore = fuzzyMatch(item.category.replace(/_/g, ' '), query) * 1.5;
  return titleScore + brandScore + categoryScore;
}

export async function GET(request: NextRequest) {
  const buyerId = request.nextUrl.searchParams.get('buyerId');
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const sortBy = request.nextUrl.searchParams.get('sort') ?? 'relevant';
  const filterCategory = request.nextUrl.searchParams.get('category') ?? '';
  const filterCondition = request.nextUrl.searchParams.get('condition') ?? '';
  const filterPriceMin = request.nextUrl.searchParams.get('priceMin');
  const filterPriceMax = request.nextUrl.searchParams.get('priceMax');
  const filterMaxDistance = request.nextUrl.searchParams.get('maxDistance');
  const filterItemType = request.nextUrl.searchParams.get('itemType') ?? '';
  const filterBrand = request.nextUrl.searchParams.get('brand') ?? '';
  const filterMinDiscount = request.nextUrl.searchParams.get('minDiscount');

  const items = getItems();
  const buyer = buyerId ? getBuyerById(buyerId) : null;

  // Filter to items available for resale (routed to ship_direct or list_hold, and have assessment)
  let available = items.filter(
    (item) =>
      item.assessment &&
      item.route &&
      (item.route.path === 'ship_direct' || item.route.path === 'list_hold')
  );

  // Apply search filter
  let searchScores: Map<string, number> | null = null;
  if (query.trim()) {
    searchScores = new Map();
    available = available.filter((item) => {
      const score = searchScore(item, query);
      if (score > 0) {
        searchScores!.set(item.id, score);
        return true;
      }
      return false;
    });
  }

  // Apply category filter
  if (filterCategory) {
    available = available.filter((item) => item.category === filterCategory);
  }

  // Apply condition filter (supports comma-separated: "like_new,good")
  if (filterCondition) {
    const conditions = filterCondition.split(',');
    available = available.filter((item) => conditions.includes(item.assessment!.grade.condition));
  }

  // Apply price range filter
  if (filterPriceMin) {
    const min = Number(filterPriceMin);
    available = available.filter((item) => item.assessment!.price >= min);
  }
  if (filterPriceMax) {
    const max = Number(filterPriceMax);
    available = available.filter((item) => item.assessment!.price <= max);
  }

  // Apply distance filter (requires buyer location)
  if (filterMaxDistance && buyer) {
    const maxDist = Number(filterMaxDistance);
    available = available.filter((item) => distanceKm(buyer.location, item.location) <= maxDist);
  }

  // Apply item type filter
  if (filterItemType === 'openbox') {
    available = available.filter((item) => item.returnHold?.status === 'holding');
  } else if (filterItemType === 'resale') {
    available = available.filter((item) => !item.returnHold);
  }

  // Apply brand filter
  if (filterBrand) {
    available = available.filter((item) => item.brand.toLowerCase() === filterBrand.toLowerCase());
  }

  // Apply minimum discount filter
  if (filterMinDiscount) {
    const minDisc = Number(filterMinDiscount) / 100;
    available = available.filter((item) => {
      const discount = (item.originalPrice - item.assessment!.price) / item.originalPrice;
      return discount >= minDisc;
    });
  }

  // Score for personalization
  const personalScores = buyer ? scoreItemsForBuyer(buyer, available) : null;
  const personalMap = personalScores
    ? new Map(personalScores.map((s) => [s.itemId, s]))
    : null;

  // Sort
  if (sortBy === 'price_low') {
    available.sort((a, b) => a.assessment!.price - b.assessment!.price);
  } else if (sortBy === 'price_high') {
    available.sort((a, b) => b.assessment!.price - a.assessment!.price);
  } else if (sortBy === 'condition') {
    const condOrder = { like_new: 0, good: 1, fair: 2, damaged: 3 };
    available.sort((a, b) => (condOrder[a.assessment!.grade.condition] ?? 9) - (condOrder[b.assessment!.grade.condition] ?? 9));
  } else if (sortBy === 'nearest' && buyer) {
    available.sort((a, b) => distanceKm(buyer.location, a.location) - distanceKm(buyer.location, b.location));
  } else if (sortBy === 'relevant') {
    // Combine search score + personal score
    available.sort((a, b) => {
      const aSearch = searchScores?.get(a.id) ?? 0;
      const bSearch = searchScores?.get(b.id) ?? 0;
      const aPersonal = personalMap?.get(a.id)?.totalScore ?? 0;
      const bPersonal = personalMap?.get(b.id)?.totalScore ?? 0;
      return (bSearch * 40 + bPersonal) - (aSearch * 40 + aPersonal);
    });
  }

  const results = available.map((item) => {
    const distance = buyer ? Math.round(distanceKm(buyer.location, item.location)) : null;
    const scoreInfo = personalMap?.get(item.id);

    return {
      id: item.id,
      title: item.title,
      brand: item.brand,
      category: item.category,
      originalPrice: item.originalPrice,
      resalePrice: item.assessment!.price,
      condition: item.assessment!.grade.condition,
      summary: item.assessment!.grade.summary,
      confidence: item.assessment!.grade.confidence,
      location: item.location,
      distanceKm: distance,
      hasPhotos: item.photos.length > 0,
      firstPhoto: item.photos[0] ?? null,
      routePath: item.route!.path,
      ownerId: item.ownerId,
      customListing: item.customListing ?? false,
      isOpenBox: !!item.returnHold && item.returnHold.status === 'holding',
      openBoxDaysLeft: item.returnHold?.status === 'holding'
        ? Math.max(0, Math.ceil((new Date(item.returnHold.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
      relevanceScore: scoreInfo?.totalScore ?? null,
      reasons: scoreInfo?.reasons ?? [],
    };
  });

  // Proactive offers
  const offers = buyer ? findProactiveOffers(buyer, items) : [];

  return NextResponse.json({
    items: results,
    buyerId: buyerId ?? null,
    query,
    totalResults: results.length,
    offers,
    noResults: query.trim().length > 0 && results.length === 0,
  });
}
