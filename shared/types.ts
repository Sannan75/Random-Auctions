export type ListingMode = "auction" | "buyItNow" | "both";
export type ItemCondition = "any" | "used" | "new" | "forParts";
export type ItemLocation = "uk" | "worldwide";
export type AppModePreference = "api" | "manual";

export type ExploreFilters = {
  listingMode: ListingMode;
  minPrice: string;
  maxPrice: string;
  categories: string[];
  condition: ItemCondition;
  location: ItemLocation;
  excludeTerms: string;
};

export type Listing = {
  id: string;
  title: string;
  imageUrl?: string;
  price?: string;
  postage?: string;
  listingType?: string;
  timeLeft?: string;
  seller?: string;
  itemUrl: string;
  searchTerm?: string;
  foundViaSeed?: string;
};

export type Favourite = Listing & {
  dateSaved: string;
  note?: string;
  tags?: string[];
};

export type ApiConfig = { modePreference: AppModePreference; marketplaceId: string };
export type ApiCredentials = { clientId: string; clientSecret: string; marketplaceId: string };
export type ApiCredentialsInput = { clientId?: string; clientSecret?: string; marketplaceId?: string };
export type Settings = { filters: ExploreFilters; apiConfig: ApiConfig };
export type ApiStatus = {
  hasCredentials: boolean;
  mode: "api" | "manual";
  preferredMode: AppModePreference;
  marketplaceId: string;
};
export type AppData = { favourites: Favourite[]; settings: Settings };
