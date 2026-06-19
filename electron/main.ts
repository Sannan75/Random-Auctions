import { app, BrowserWindow, clipboard, ipcMain, shell } from "electron";
import path from "node:path";
import dotenv from "dotenv";
import { ApiCredentialsInput, ApiStatus, ExploreFilters, Favourite, Settings } from "./types";
import { generateManualListing, generateManualListings } from "./services/manualFallbackService";
import { hasEbayCredentials, searchEbay } from "./services/ebayApiService";
import {
  loadApiCredentials,
  loadData,
  removeFavourite,
  replaceFavourites,
  saveApiConfig,
  saveApiCredentials,
  saveFavourite,
  saveSettings,
  updateFavourite
} from "./persistence";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const isDev = process.env.VITE_DEV_SERVER_URL || !app.isPackaged;

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    title: "Random Auction Explorer",
    backgroundColor: "#fbf7ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    await win.loadURL("http://127.0.0.1:5173");
  } else {
    await win.loadFile(path.join(__dirname, "../../dist-renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  registerIpc();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIpc(): void {
  ipcMain.handle("app:getInitialData", () => loadData());
  ipcMain.handle("app:getApiStatus", async (): Promise<ApiStatus> => {
    const [data, credentials] = await Promise.all([loadData(), loadApiCredentials()]);
    const hasCredentials = hasEbayCredentials(credentials);
    const preferredMode = data.settings.apiConfig.modePreference;

    return {
      hasCredentials,
      mode: preferredMode,
      preferredMode,
      marketplaceId: credentials?.marketplaceId || data.settings.apiConfig.marketplaceId
    };
  });

  ipcMain.handle("explore:findRandoms", async (_event, filters: ExploreFilters) => {
    const data = await loadData();
    if (data.settings.apiConfig.modePreference === "manual") {
      return generateManualListings(filters);
    }

    const credentials = await loadApiCredentials();
    if (!credentials) {
      throw new Error("API mode is selected, but eBay API credentials are missing. Add them in Settings or switch to Manual mode.");
    }

    return searchEbay(filters, credentials);
  });

  ipcMain.handle("explore:rerollManualSearch", (_event, filters: ExploreFilters) => generateManualListing(filters));

  ipcMain.handle("shell:openExternal", (_event, url: string) => shell.openExternal(url));
  ipcMain.handle("clipboard:readText", () => clipboard.readText().trim());
  ipcMain.handle("favourites:save", (_event, favourite: Favourite) => saveFavourite(favourite));
  ipcMain.handle("favourites:update", (_event, favourite: Favourite) => updateFavourite(favourite));
  ipcMain.handle("favourites:remove", (_event, id: string) => removeFavourite(id));
  ipcMain.handle("favourites:replace", (_event, favourites: Favourite[]) => replaceFavourites(favourites));
  ipcMain.handle("settings:save", (_event, settings: Settings) => saveSettings(settings));
  ipcMain.handle("settings:saveApiConfig", (_event, apiConfig: Settings["apiConfig"]) => saveApiConfig(apiConfig));
  ipcMain.handle("settings:saveApiCredentials", async (_event, input: ApiCredentialsInput) => {
    await saveApiCredentials(input);
    return loadData();
  });
}
