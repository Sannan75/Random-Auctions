import { ApiCredentials, ExploreFilters, Listing } from "../types";
import { normaliseEbayItemUrl } from "../utils/ebayUrls";
import { pickSeedTerms, randomSortOrder, shuffle } from "./randomSeeds";

type EbayTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type EbaySearchResponse = {
  itemSummaries?: EbayItemSummary[];
};

type EbayItemSummary = {
  itemId: string;
  title: string;
  image?: { imageUrl?: string };
  price?: { value?: string; currency?: string };
  shippingOptions?: Array<{ shippingCost?: { value?: string; currency?: string } }>;
  buyingOptions?: string[];
  itemWebUrl: string;
  itemEndDate?: string;
  seller?: { username?: string; feedbackPercentage?: string; feedbackScore?: number };
};

let tokenCache: { key: string; token: string; expiresAt: number } | undefined;

export function hasEbayCredentials(credentials?: ApiCredentials): boolean {
  return Boolean(credentials?.clientId && credentials.clientSecret);
}

export async function searchEbay(filters: ExploreFilters, credentials: ApiCredentials): Promise<Listing[]> {
  const token = await getAccessToken(credentials);
  const terms = pickSeedTerms(filters.categories, 4);
  const responses = await Promise.all(terms.map((term) => searchForTerm(token, credentials.marketplaceId, filters, term)));
  const allItems = responses.flat();
  const deduped = new Map<string, Listing>();

  for (const item of shuffle(allItems)) {
    deduped.set(item.id, item);
  }

  return [...deduped.values()].slice(0, 10);
}

async function getAccessToken(credentials: ApiCredentials): Promise<string> {
  const cacheKey = `${credentials.clientId}:${credentials.marketplaceId}`;
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  if (!hasEbayCredentials(credentials)) {
    throw new Error("Missing eBay API credentials.");
  }

  const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope"
    })
  });

  if (!response.ok) {
    throw new Error(`eBay token request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as EbayTokenResponse;
  if (!data.access_token) {
    throw new Error("eBay token response did not include an access token.");
  }

  tokenCache = {
    key: cacheKey,
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000
  };

  return tokenCache.token;
}

async function searchForTerm(token: string, marketplaceId: string, filters: ExploreFilters, term: string): Promise<Listing[]> {
  const params = new URLSearchParams();
  params.set("q", buildQuery(term, filters.excludeTerms));
  params.set("limit", "30");
  params.set("offset", String(Math.floor(Math.random() * 5) * 30));
  params.set("sort", toEbaySort(randomSortOrder()));

  const filterParts = buildFilters(filters);
  if (filterParts.length > 0) {
    params.set("filter", filterParts.join(","));
  }

  const response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplaceId
    }
  });

  if (!response.ok) {
    throw new Error(`eBay search failed with status ${response.status}.`);
  }

  const data = (await response.json()) as EbaySearchResponse;
  return (data.itemSummaries ?? []).map((item) => mapEbayItem(item, term));
}

function buildQuery(term: string, excludeTerms: string): string {
  const exclusions = excludeTerms
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => `-${quoteIfNeeded(value)}`);

  return [term, ...exclusions].join(" ");
}

function quoteIfNeeded(value: string): string {
  return value.includes(" ") ? `"${value}"` : value;
}

function buildFilters(filters: ExploreFilters): string[] {
  const parts: string[] = [];

  if (filters.minPrice || filters.maxPrice) {
    parts.push(`price:[${filters.minPrice || ""}..${filters.maxPrice || ""}]`);
    parts.push("priceCurrency:GBP");
  }

  if (filters.listingMode === "auction") {
    parts.push("buyingOptions:{AUCTION}");
  } else if (filters.listingMode === "buyItNow") {
    parts.push("buyingOptions:{FIXED_PRICE}");
  }

  if (filters.condition === "used") {
    parts.push("conditions:{USED}");
  } else if (filters.condition === "new") {
    parts.push("conditions:{NEW}");
  } else if (filters.condition === "forParts") {
    parts.push("conditions:{FOR_PARTS_OR_NOT_WORKING}");
  }

  if (filters.location === "uk") {
    parts.push("itemLocationCountry:GB");
  }

  return parts;
}

function mapEbayItem(item: EbayItemSummary, term: string): Listing {
  const shipping = item.shippingOptions?.[0]?.shippingCost;
  const seller = item.seller?.username
    ? `${item.seller.username}${item.seller.feedbackScore ? ` (${item.seller.feedbackScore})` : ""}`
    : undefined;

  return {
    id: item.itemId,
    title: item.title,
    imageUrl: item.image?.imageUrl,
    price: formatMoney(item.price),
    postage: shipping ? formatMoney(shipping) : undefined,
    listingType: item.buyingOptions?.join(", "),
    timeLeft: item.itemEndDate ? new Date(item.itemEndDate).toLocaleString() : undefined,
    seller,
    itemUrl: normaliseEbayItemUrl(item.itemWebUrl),
    foundViaSeed: term
  };
}

function formatMoney(value?: { value?: string; currency?: string }): string | undefined {
  if (!value?.value) return undefined;
  return `${value.currency ?? "GBP"} ${value.value}`;
}

function toEbaySort(sort: string): string {
  if (sort === "StartTimeNewest") return "newlyListed";
  if (sort === "EndTimeSoonest") return "endingSoonest";
  if (sort === "PricePlusShippingLowest") return "price";
  return "bestMatch";
}
