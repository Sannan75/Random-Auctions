import { generateManualListing, generateManualListings } from "../shared/manualExplorer";
import { mergeFavourites, normaliseFavourite } from "../shared/favourites";
import { ApiConfig, ApiCredentialsInput, ApiStatus, AppData, ExploreFilters, Favourite, Listing, Settings } from "./types";

export type PlatformApi = {
  isElectron: boolean;
  getInitialData(): Promise<AppData>;
  getApiStatus(): Promise<ApiStatus>;
  findRandoms(filters: ExploreFilters): Promise<Listing[]>;
  rerollManualSearch(filters: ExploreFilters): Promise<Listing>;
  openExternal(url: string): Promise<void>;
  readClipboardText(): Promise<string>;
  saveFavourite(favourite: Favourite): Promise<Favourite[]>;
  updateFavourite(favourite: Favourite): Promise<Favourite[]>;
  removeFavourite(id: string): Promise<Favourite[]>;
  replaceFavourites(favourites: Favourite[]): Promise<Favourite[]>;
  saveSettings(settings: Settings): Promise<Settings>;
  saveApiConfig(apiConfig: ApiConfig): Promise<Settings>;
  saveApiCredentials(input: ApiCredentialsInput): Promise<AppData>;
};

const defaultFilters: ExploreFilters = {
  listingMode: "both", minPrice: "", maxPrice: "", categories: ["All"], condition: "any", location: "uk",
  excludeTerms: "spares, broken, collection only, job lot only, empty box"
};
const manualConfig: ApiConfig = { modePreference: "manual", marketplaceId: "EBAY_GB" };
const dataKey = "random-auction-explorer:data:v1";

function readBrowserData(): AppData {
  try {
    const parsed = JSON.parse(localStorage.getItem(dataKey) ?? "{}") as Partial<AppData>;
    return {
      favourites: mergeFavourites(parsed.favourites ?? []),
      settings: {
        filters: { ...defaultFilters, ...(parsed.settings?.filters ?? {}), categories: ["All"] },
        apiConfig: manualConfig
      }
    };
  } catch {
    return { favourites: [], settings: { filters: defaultFilters, apiConfig: manualConfig } };
  }
}

function writeBrowserData(data: AppData): void {
  localStorage.setItem(dataKey, JSON.stringify(data));
}

const browserApi: PlatformApi = {
  isElectron: false,
  async getInitialData() { return readBrowserData(); },
  async getApiStatus() { return { hasCredentials: false, mode: "manual", preferredMode: "manual", marketplaceId: "EBAY_GB" }; },
  async findRandoms(filters) { return generateManualListings(filters); },
  async rerollManualSearch(filters) { return generateManualListing(filters); },
  async openExternal(url) { window.open(url, "_blank", "noopener,noreferrer"); },
  async readClipboardText() {
    if (!navigator.clipboard?.readText) throw new Error("Clipboard access is unavailable here. Paste the URL into the field instead.");
    return navigator.clipboard.readText();
  },
  async saveFavourite(favourite) {
    const data = readBrowserData();
    data.favourites = mergeFavourites([normaliseFavourite(favourite)], data.favourites);
    writeBrowserData(data);
    return data.favourites;
  },
  async updateFavourite(favourite) {
    const data = readBrowserData();
    data.favourites = data.favourites.map((item) => item.id === favourite.id ? normaliseFavourite(favourite) : item);
    writeBrowserData(data);
    return data.favourites;
  },
  async removeFavourite(id) {
    const data = readBrowserData();
    data.favourites = data.favourites.filter((item) => item.id !== id);
    writeBrowserData(data);
    return data.favourites;
  },
  async replaceFavourites(favourites) {
    const data = readBrowserData();
    data.favourites = mergeFavourites(favourites);
    writeBrowserData(data);
    return data.favourites;
  },
  async saveSettings(settings) {
    const data = readBrowserData();
    data.settings = { filters: { ...settings.filters, categories: ["All"] }, apiConfig: manualConfig };
    writeBrowserData(data);
    return data.settings;
  },
  async saveApiConfig() { return readBrowserData().settings; },
  async saveApiCredentials() { throw new Error("eBay API mode is available in the Electron app only."); }
};

const electronApi = window.auctionExplorer;
export const platform: PlatformApi = electronApi ? { isElectron: true, ...electronApi } : browserApi;
