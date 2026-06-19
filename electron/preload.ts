import { contextBridge, ipcRenderer } from "electron";
import { ApiCredentialsInput, ApiStatus, AppData, ExploreFilters, Favourite, Listing, Settings } from "./types";

const api = {
  getInitialData: (): Promise<AppData> => ipcRenderer.invoke("app:getInitialData"),
  getApiStatus: (): Promise<ApiStatus> => ipcRenderer.invoke("app:getApiStatus"),
  findRandoms: (filters: ExploreFilters): Promise<Listing[]> => ipcRenderer.invoke("explore:findRandoms", filters),
  rerollManualSearch: (filters: ExploreFilters): Promise<Listing> => ipcRenderer.invoke("explore:rerollManualSearch", filters),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke("shell:openExternal", url),
  readClipboardText: (): Promise<string> => ipcRenderer.invoke("clipboard:readText"),
  saveFavourite: (favourite: Favourite): Promise<Favourite[]> => ipcRenderer.invoke("favourites:save", favourite),
  updateFavourite: (favourite: Favourite): Promise<Favourite[]> => ipcRenderer.invoke("favourites:update", favourite),
  removeFavourite: (id: string): Promise<Favourite[]> => ipcRenderer.invoke("favourites:remove", id),
  replaceFavourites: (favourites: Favourite[]): Promise<Favourite[]> => ipcRenderer.invoke("favourites:replace", favourites),
  saveSettings: (settings: Settings): Promise<Settings> => ipcRenderer.invoke("settings:save", settings),
  saveApiConfig: (apiConfig: Settings["apiConfig"]): Promise<Settings> => ipcRenderer.invoke("settings:saveApiConfig", apiConfig),
  saveApiCredentials: (input: ApiCredentialsInput): Promise<AppData> => ipcRenderer.invoke("settings:saveApiCredentials", input)
};

contextBridge.exposeInMainWorld("auctionExplorer", api);

export type AuctionExplorerApi = typeof api;
