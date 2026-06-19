import { ExploreFilters, Listing } from "./types";
import { pickSeedTerms, randomPage, randomSortOrder } from "./randomSeeds";

export function generateManualListings(filters: ExploreFilters): Listing[] {
  return pickSeedTerms(filters.categories).map((term, index) => buildManualListing(filters, term, index));
}

export function generateManualListing(filters: ExploreFilters): Listing {
  return buildManualListing(filters, pickSeedTerms(filters.categories, 1)[0], Math.floor(Math.random() * 10_000));
}

export function dismissListing(listings: Listing[], id: string): Listing[] {
  return listings.filter((listing) => listing.id !== id);
}

export function buildEbaySearchUrl(filters: ExploreFilters, term: string): string {
  const params = new URLSearchParams();
  const exclusions = filters.excludeTerms.split(",").map((value) => value.trim()).filter(Boolean);
  const query = [term, ...exclusions.map((value) => `-${value.includes(" ") ? `"${value}"` : value}`)].join(" ");
  params.set("_nkw", query);
  params.set("_sop", sortToEbayCode(randomSortOrder()));
  params.set("_ipg", "60");
  params.set("_pgn", String(randomPage()));
  if (filters.minPrice) params.set("_udlo", filters.minPrice);
  if (filters.maxPrice) params.set("_udhi", filters.maxPrice);
  if (filters.listingMode === "auction") params.set("LH_Auction", "1");
  if (filters.listingMode === "buyItNow") params.set("LH_BIN", "1");
  if (filters.condition === "used") params.set("LH_ItemCondition", "3000");
  if (filters.condition === "new") params.set("LH_ItemCondition", "1000");
  if (filters.condition === "forParts") params.set("LH_ItemCondition", "7000");
  if (filters.location === "uk") params.set("LH_PrefLoc", "1");
  return `https://www.ebay.co.uk/sch/i.html?${params.toString()}`;
}

function buildManualListing(filters: ExploreFilters, term: string, index: number): Listing {
  return {
    id: `manual-${Date.now()}-${index}-${term}`,
    title: `Search eBay for "${term}"`,
    price: filters.minPrice && filters.maxPrice ? `GBP ${filters.minPrice}-${filters.maxPrice}` : filters.minPrice ? `From GBP ${filters.minPrice}` : filters.maxPrice ? `Up to GBP ${filters.maxPrice}` : "Any price",
    postage: filters.location === "uk" ? "UK results preferred" : "Worldwide results",
    listingType: filters.listingMode === "both" ? "Auction or Buy It Now" : filters.listingMode === "auction" ? "Auction" : "Buy It Now",
    itemUrl: buildEbaySearchUrl(filters, term),
    searchTerm: term
  };
}

function sortToEbayCode(sort: string): string {
  if (sort === "StartTimeNewest") return "10";
  if (sort === "EndTimeSoonest") return "1";
  if (sort === "PricePlusShippingLowest") return "15";
  return "12";
}
