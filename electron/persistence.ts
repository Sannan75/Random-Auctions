import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiConfig, ApiCredentials, ApiCredentialsInput, AppData, ExploreFilters, Favourite, Settings } from "./types";
import { normaliseEbayItemUrl } from "./utils/ebayUrls";
import { normaliseFavourite } from "../shared/favourites";

export const defaultFilters: ExploreFilters = {
  listingMode: "both",
  minPrice: "",
  maxPrice: "",
  categories: ["All"],
  condition: "any",
  location: "uk",
  excludeTerms: "spares, broken, collection only, job lot only, empty box"
};

const defaultApiConfig: ApiConfig = {
  modePreference: "api",
  marketplaceId: "EBAY_GB"
};

type PersistedSettings = Settings & {
  ebayClientId?: string;
  ebayClientSecret?: string;
};

type PersistedAppData = {
  favourites: Favourite[];
  settings: PersistedSettings;
};

const defaultData: PersistedAppData = {
  favourites: [],
  settings: {
    filters: defaultFilters,
    apiConfig: defaultApiConfig
  }
};

export async function loadData(): Promise<AppData> {
  const data = await loadPersistedData();

  return {
    favourites: data.favourites,
    settings: {
      filters: data.settings.filters,
      apiConfig: data.settings.apiConfig
    }
  };
}

async function loadPersistedData(): Promise<PersistedAppData> {
  try {
    const data = await readFile(dataPath(), "utf-8");
    type LegacyFilters = Partial<ExploreFilters> & { category?: string };
    const parsed = JSON.parse(data) as Partial<PersistedAppData> & {
      settings?: Partial<PersistedSettings> & { filters?: LegacyFilters };
    };
    const savedFilters: LegacyFilters = parsed.settings?.filters ?? {};
    return {
      favourites: (parsed.favourites ?? []).map(normaliseFavourite),
      settings: {
        filters: {
          ...defaultFilters,
          ...savedFilters,
          categories: ["All"]
        },
        apiConfig: {
          ...defaultApiConfig,
          ...(parsed.settings?.apiConfig ?? {})
        },
        ebayClientId: parsed.settings?.ebayClientId,
        ebayClientSecret: parsed.settings?.ebayClientSecret
      }
    };
  } catch {
    return defaultData;
  }
}

export async function saveFavourite(favourite: Favourite): Promise<Favourite[]> {
  const data = await loadPersistedData();
  const normalised = normaliseFavourite(favourite);
  const withoutExisting = data.favourites.filter((item) => normaliseEbayItemUrl(item.itemUrl) !== normalised.itemUrl);
  const favourites = [normalised, ...withoutExisting];
  await saveData({ ...data, favourites });
  return favourites;
}

export async function updateFavourite(favourite: Favourite): Promise<Favourite[]> {
  const data = await loadPersistedData();
  const normalised = normaliseFavourite(favourite);
  const favourites = data.favourites.map((item) => (item.id === favourite.id ? normalised : item));
  await saveData({ ...data, favourites });
  return favourites;
}

export async function removeFavourite(id: string): Promise<Favourite[]> {
  const data = await loadPersistedData();
  const favourites = data.favourites.filter((item) => item.id !== id);
  await saveData({ ...data, favourites });
  return favourites;
}

export async function replaceFavourites(favourites: Favourite[]): Promise<Favourite[]> {
  const data = await loadPersistedData();
  const normalised = favourites.map(normaliseFavourite);
  await saveData({ ...data, favourites: normalised });
  return normalised;
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const data = await loadPersistedData();
  const nextSettings = {
    ...data.settings,
    filters: settings.filters,
    apiConfig: settings.apiConfig
  };
  await saveData({ ...data, settings: nextSettings });

  return {
    filters: nextSettings.filters,
    apiConfig: nextSettings.apiConfig
  };
}

export async function saveApiConfig(apiConfig: ApiConfig): Promise<Settings> {
  const data = await loadPersistedData();
  const settings = {
    ...data.settings,
    apiConfig: {
      ...data.settings.apiConfig,
      ...apiConfig
    }
  };
  await saveData({ ...data, settings });

  return {
    filters: settings.filters,
    apiConfig: settings.apiConfig
  };
}

export async function saveApiCredentials(input: ApiCredentialsInput): Promise<void> {
  const data = await loadPersistedData();
  const settings: PersistedSettings = {
    ...data.settings,
    apiConfig: {
      ...data.settings.apiConfig,
      marketplaceId: input.marketplaceId?.trim() || data.settings.apiConfig.marketplaceId
    },
    ebayClientId: input.clientId?.trim() || data.settings.ebayClientId,
    ebayClientSecret: input.clientSecret?.trim() || data.settings.ebayClientSecret
  };
  await saveData({ ...data, settings });
}

export async function loadApiCredentials(): Promise<ApiCredentials | undefined> {
  const data = await loadPersistedData();
  const clientId = process.env.EBAY_CLIENT_ID || data.settings.ebayClientId;
  const clientSecret = process.env.EBAY_CLIENT_SECRET || data.settings.ebayClientSecret;

  if (!clientId || !clientSecret) {
    return undefined;
  }

  return {
    clientId,
    clientSecret,
    marketplaceId: process.env.EBAY_MARKETPLACE_ID || data.settings.apiConfig.marketplaceId
  };
}

async function saveData(data: PersistedAppData): Promise<void> {
  await mkdir(path.dirname(dataPath()), { recursive: true });
  await writeFile(dataPath(), JSON.stringify(data, null, 2), "utf-8");
}

function dataPath(): string {
  return path.join(app.getPath("userData"), "random-auction-explorer.json");
}
