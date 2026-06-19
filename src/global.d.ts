import { ApiCredentialsInput, ApiStatus, AppData, ExploreFilters, Favourite, Listing, Settings } from "./types";

export {};

declare global {
  interface Window {
    auctionExplorer?: {
      getInitialData: () => Promise<AppData>;
      getApiStatus: () => Promise<ApiStatus>;
      findRandoms: (filters: ExploreFilters) => Promise<Listing[]>;
      rerollManualSearch: (filters: ExploreFilters) => Promise<Listing>;
      openExternal: (url: string) => Promise<void>;
      readClipboardText: () => Promise<string>;
      saveFavourite: (favourite: Favourite) => Promise<Favourite[]>;
      updateFavourite: (favourite: Favourite) => Promise<Favourite[]>;
      removeFavourite: (id: string) => Promise<Favourite[]>;
      replaceFavourites: (favourites: Favourite[]) => Promise<Favourite[]>;
      saveSettings: (settings: Settings) => Promise<Settings>;
      saveApiConfig: (apiConfig: Settings["apiConfig"]) => Promise<Settings>;
      saveApiCredentials: (input: ApiCredentialsInput) => Promise<AppData>;
    };
  }
}
