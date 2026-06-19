import { Favourite } from "./types";
import { normaliseEbayItemUrl } from "./ebayUrls";

export function normaliseFavourite(favourite: Favourite): Favourite {
  return {
    ...favourite,
    id: favourite.id || crypto.randomUUID(),
    itemUrl: normaliseEbayItemUrl(favourite.itemUrl),
    dateSaved: favourite.dateSaved || new Date().toISOString(),
    tags: favourite.tags ?? []
  };
}

export function mergeFavourites(imported: Favourite[], existing: Favourite[] = []): Favourite[] {
  const byUrl = new Map<string, Favourite>();
  for (const favourite of [...imported, ...existing]) {
    const normalised = normaliseFavourite(favourite);
    byUrl.set(normalised.itemUrl || normalised.id, normalised);
  }
  return [...byUrl.values()];
}

export function exportFavouritesJson(favourites: Favourite[]): string {
  return JSON.stringify(favourites.map(normaliseFavourite), null, 2);
}

export function importFavouritesJson(text: string): Favourite[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Import file must contain an array of favourites.");
  return mergeFavourites(parsed as Favourite[]);
}
