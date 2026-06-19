import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FavouritesView } from "./components/FavouritesView";
import { ListingCard } from "./components/ListingCard";
import { ManualSearchCard } from "./components/ManualSearchCard";
import { ApiConfig, ApiCredentialsInput, ApiStatus, ExploreFilters, Favourite, Listing } from "./types";
import { normaliseEbayItemUrl } from "./utils/ebayUrls";
import { mergeFavourites } from "../shared/favourites";
import { platform } from "./platform";
import { dismissListing } from "../shared/manualExplorer";

const defaultFilters: ExploreFilters = {
  listingMode: "both",
  minPrice: "",
  maxPrice: "",
  categories: ["All"],
  condition: "any",
  location: "uk",
  excludeTerms: "spares, broken, collection only, job lot only, empty box"
};

const defaultApiConfig: ApiConfig = {
  modePreference: platform.isElectron ? "api" : "manual",
  marketplaceId: "EBAY_GB"
};

type Tab = "explore" | "favourites" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("explore");
  const [filters, setFilters] = useState<ExploreFilters>(defaultFilters);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(defaultApiConfig);
  const [results, setResults] = useState<Listing[]>([]);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ hasCredentials: false, mode: "api", preferredMode: "api", marketplaceId: "EBAY_GB" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [settingsMessage, setSettingsMessage] = useState<string | undefined>();
  const [manualMessage, setManualMessage] = useState<string | undefined>();
  const [lastOpenedSearchSeed, setLastOpenedSearchSeed] = useState<string | undefined>();
  const [credentialsInput, setCredentialsInput] = useState<ApiCredentialsInput>({
    clientId: "",
    clientSecret: "",
    marketplaceId: "EBAY_GB"
  });
  const manualTitleRef = useRef<HTMLInputElement>(null);
  const [manualFavourite, setManualFavourite] = useState({
    itemUrl: "",
    title: "",
    price: "",
    imageUrl: "",
    note: "",
    tags: ""
  });

  const currentSearchUrl = useMemo(() => results[0]?.itemUrl, [results]);

  useEffect(() => {
    async function boot() {
      const [data, status] = await Promise.all([
        platform.getInitialData(),
        platform.getApiStatus()
      ]);
      setFilters({ ...data.settings.filters, categories: ["All"] });
      setApiConfig(data.settings.apiConfig);
      setCredentialsInput((current) => ({ ...current, marketplaceId: data.settings.apiConfig.marketplaceId }));
      setFavourites(data.favourites);
      setApiStatus(status);
      setIsLoading(false);
    }

    boot().catch((reason) => setError(readError(reason)));
  }, []);

  async function findRandoms() {
    setIsSearching(true);
    setError(undefined);
    try {
      const allCategoryFilters = { ...filters, categories: ["All"] };
      await platform.saveSettings({ filters: allCategoryFilters, apiConfig });
      const listings = await platform.findRandoms(allCategoryFilters);
      setResults(listings);
    } catch (reason) {
      setError(readError(reason));
    } finally {
      setIsSearching(false);
    }
  }

  async function rerollManualSearch(id: string) {
    setError(undefined);
    try {
      const allCategoryFilters = { ...filters, categories: ["All"] };
      const next = await platform.rerollManualSearch(allCategoryFilters);
      setResults((current) => current.map((item) => (item.id === id ? next : item)));
    } catch (reason) {
      setError(readError(reason));
    }
  }

  async function saveFavourite(listing: Listing, note = "", tags: string[] = []) {
    const favourite: Favourite = {
      ...listing,
      id: listing.id || crypto.randomUUID(),
      itemUrl: normaliseEbayItemUrl(listing.itemUrl),
      dateSaved: new Date().toISOString(),
      foundViaSeed: listing.foundViaSeed ?? listing.searchTerm,
      note,
      tags
    };
    setFavourites(await platform.saveFavourite(favourite));
  }

  async function updateFavourite(favourite: Favourite) {
    const next = await platform.updateFavourite(favourite);
    setFavourites(next);
  }

  async function removeFavourite(id: string) {
    const next = await platform.removeFavourite(id);
    setFavourites(next);
  }

  async function importFavourites(imported: Favourite[]) {
    setFavourites(await platform.replaceFavourites(mergeFavourites(imported, favourites)));
  }

  async function addManualFavourite(event: FormEvent) {
    event.preventDefault();
    setManualMessage(undefined);
    if (!manualFavourite.itemUrl || !manualFavourite.title) return;

    await saveFavourite(
      {
        id: crypto.randomUUID(),
        itemUrl: normaliseEbayItemUrl(manualFavourite.itemUrl),
        title: manualFavourite.title,
        price: manualFavourite.price,
        imageUrl: manualFavourite.imageUrl,
        foundViaSeed: lastOpenedSearchSeed
      },
      manualFavourite.note,
      manualFavourite.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    );

    setManualFavourite({ itemUrl: "", title: "", price: "", imageUrl: "", note: "", tags: "" });
    setManualMessage("Saved to favourites.");
  }

  async function pasteListingUrlFromClipboard() {
    setManualMessage(undefined);
    setError(undefined);
    try {
      const text = await platform.readClipboardText();
      const url = extractUrl(text);

      if (!url) {
        setManualMessage("Clipboard does not look like a URL.");
        return;
      }

      setManualFavourite((current) => ({ ...current, itemUrl: normaliseEbayItemUrl(url) }));
      setManualMessage(isLikelyEbayUrl(url) ? "Listing URL pasted. Add a title when you are ready." : "URL pasted. Double-check it is the listing you meant to save.");
      window.setTimeout(() => manualTitleRef.current?.focus(), 0);
    } catch (reason) {
      setError(readError(reason));
    }
  }

  function openManualSearch(search: Listing) {
    setLastOpenedSearchSeed(search.searchTerm);
    platform.openExternal(search.itemUrl);
  }

  async function refreshApiStatus() {
    const status = await platform.getApiStatus();
    setApiStatus(status);
    return status;
  }

  async function updateModePreference(modePreference: ApiConfig["modePreference"]) {
    const nextConfig = { ...apiConfig, modePreference };
    setApiConfig(nextConfig);
    const settings = await platform.saveApiConfig(nextConfig);
    setApiConfig(settings.apiConfig);
    await refreshApiStatus();
    setResults([]);
  }

  async function saveCredentials(event: FormEvent) {
    event.preventDefault();
    setSettingsMessage(undefined);
    setError(undefined);
    try {
      const data = await platform.saveApiCredentials(credentialsInput);
      setApiConfig(data.settings.apiConfig);
      setCredentialsInput({ clientId: "", clientSecret: "", marketplaceId: data.settings.apiConfig.marketplaceId });
      const status = await refreshApiStatus();
      setSettingsMessage(status.hasCredentials ? "API credentials saved locally." : "Add both a client ID and client secret to enable API calls.");
    } catch (reason) {
      setError(readError(reason));
    }
  }

  if (isLoading) {
    return <div className="boot-state">Opening the curiosity shelf...</div>;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Random Auction Explorer</p>
          <h1>A curiosity engine for objects with stories</h1>
        </div>
        <div className={`mode-pill ${apiStatus.mode}`}>
          {apiStatus.mode === "api" ? (apiStatus.hasCredentials ? "API mode" : "API mode setup") : "Manual mode"}
        </div>
      </header>

      <nav className="tabs" aria-label="Main tabs">
        <button className={tab === "explore" ? "active" : ""} onClick={() => setTab("explore")}>
          Explore
        </button>
        <button className={tab === "favourites" ? "active" : ""} onClick={() => setTab("favourites")}>
          Favourites <span>{favourites.length}</span>
        </button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          {platform.isElectron ? "Settings / API Status" : "Settings"}
        </button>
      </nav>

      {error ? <div className="error-banner">{error}</div> : null}

      {tab === "explore" ? (
        <main className="tab-panel explore-layout">
          <section className="filters-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Explore</p>
                <h2>Find 10 Randoms</h2>
              </div>
            </div>

            {apiStatus.mode === "api" && !apiStatus.hasCredentials ? (
              <div className="manual-note">
                API mode is the default. Add eBay API credentials in Settings, or switch to Manual mode to generate search links.
              </div>
            ) : null}

            {apiStatus.mode === "manual" ? (
              <div className="manual-note">Manual mode is active. Results below are search launchers, not saved listings. Open eBay, then paste a real auction listing into the manual form below.</div>
            ) : null}

            <div className="filter-grid">
              <label>
                Mode
                <select value={filters.listingMode} onChange={(event) => setFilters({ ...filters, listingMode: event.target.value as ExploreFilters["listingMode"] })}>
                  <option value="auction">Auction</option>
                  <option value="buyItNow">Buy It Now</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label>
                Min price
                <input value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} inputMode="decimal" />
              </label>
              <label>
                Max price
                <input value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} inputMode="decimal" />
              </label>
              <label>
                Condition
                <select value={filters.condition} onChange={(event) => setFilters({ ...filters, condition: event.target.value as ExploreFilters["condition"] })}>
                  <option value="any">Any</option>
                  <option value="used">Used</option>
                  <option value="new">New</option>
                  <option value="forParts">For parts / not working</option>
                </select>
              </label>
              <label>
                Location
                <select value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value as ExploreFilters["location"] })}>
                  <option value="uk">UK only</option>
                  <option value="worldwide">Worldwide</option>
                </select>
              </label>
              <label className="wide-field">
                Exclude terms
                <input value={filters.excludeTerms} onChange={(event) => setFilters({ ...filters, excludeTerms: event.target.value })} />
              </label>
            </div>

            <div className="button-row primary-actions">
              <button onClick={findRandoms} disabled={isSearching}>
                {isSearching ? "Finding..." : "Find 10 Randoms"}
              </button>
              <button className="secondary" onClick={() => setFilters(defaultFilters)}>
                Clear filters
              </button>
              <button className="secondary" disabled={apiStatus.mode !== "manual" || !currentSearchUrl} onClick={() => currentSearchUrl && platform.openExternal(currentSearchUrl)}>
                Open generated eBay search
              </button>
            </div>
          </section>

          <section className="results-panel">
            {results.length === 0 ? (
              <div className="empty-state">Pick a few filters and let the shelves wobble a little.</div>
            ) : (
              <div className="results-list">
                {results.map((listing) =>
                  apiStatus.mode === "manual" ? (
                    <ManualSearchCard
                      key={listing.id}
                      search={listing}
                      onOpen={() => openManualSearch(listing)}
                      onReroll={rerollManualSearch}
                      onDismiss={(id) => setResults((current) => dismissListing(current, id))}
                    />
                  ) : (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onOpen={(url) => platform.openExternal(url)}
                      onFavourite={saveFavourite}
                      onDismiss={(id) => setResults((current) => dismissListing(current, id))}
                    />
                  )
                )}
              </div>
            )}
          </section>

          {apiStatus.mode === "manual" ? (
            <section className="manual-form">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Manual add</p>
                  <h2>Add favourite manually</h2>
                </div>
                <button type="button" className="secondary" onClick={pasteListingUrlFromClipboard}>
                  Paste URL from clipboard
                </button>
              </div>
              {manualMessage ? <div className="success-banner">{manualMessage}</div> : null}
              <form className="filter-grid" onSubmit={addManualFavourite}>
                <label className="wide-field">
                  Listing URL
                  <input
                    required
                    value={manualFavourite.itemUrl}
                    onChange={(event) => setManualFavourite({ ...manualFavourite, itemUrl: normaliseEbayItemUrl(event.target.value) })}
                    placeholder="https://www.ebay.co.uk/itm/..."
                  />
                </label>
                <label className="wide-field">
                  Title
                  <input
                    ref={manualTitleRef}
                    required
                    value={manualFavourite.title}
                    onChange={(event) => setManualFavourite({ ...manualFavourite, title: event.target.value })}
                    placeholder="Paste or type the listing title"
                  />
                </label>
                <label>
                  Price
                  <input value={manualFavourite.price} onChange={(event) => setManualFavourite({ ...manualFavourite, price: event.target.value })} />
                </label>
                <label>
                  Image URL optional
                  <input value={manualFavourite.imageUrl} onChange={(event) => setManualFavourite({ ...manualFavourite, imageUrl: event.target.value })} />
                </label>
                <label className="wide-field">
                  Why did I save this?
                  <input value={manualFavourite.note} onChange={(event) => setManualFavourite({ ...manualFavourite, note: event.target.value })} placeholder="has lived a life" />
                </label>
                <label>
                  Tags
                  <input value={manualFavourite.tags} onChange={(event) => setManualFavourite({ ...manualFavourite, tags: event.target.value })} placeholder="odd, watch" />
                </label>
                <div className="form-footer">
                  <button type="submit">Save manual favourite</button>
                </div>
              </form>
            </section>
          ) : null}
        </main>
      ) : null}

      {tab === "favourites" ? (
        <FavouritesView
          favourites={favourites}
          onOpen={(url) => platform.openExternal(url)}
          onRemove={removeFavourite}
          onUpdate={updateFavourite}
          onImport={importFavourites}
        />
      ) : null}

      {tab === "settings" ? (
        <main className="tab-panel settings-panel">
          {!platform.isElectron ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Settings</p>
                  <h2>Manual mode is ready</h2>
                </div>
              </div>
              <div className="status-grid browser-status">
                <div><span>Mode</span><strong>Manual</strong></div>
                <div><span>Storage</span><strong>On this device</strong></div>
              </div>
              <p className="plain-copy">Your filters and curiosity shelf are stored locally in this browser. Export favourites as JSON whenever you want a portable backup.</p>
            </>
          ) : (
          <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Settings / API Status</p>
              <h2>{apiStatus.mode === "api" ? (apiStatus.hasCredentials ? "API mode is ready" : "API mode needs credentials") : "Manual mode is ready"}</h2>
            </div>
          </div>
          <div className="mode-switch" role="group" aria-label="Data mode">
            <button className={apiConfig.modePreference === "api" ? "active" : ""} onClick={() => updateModePreference("api")}>
              API mode
            </button>
            <button className={apiConfig.modePreference === "manual" ? "active" : ""} onClick={() => updateModePreference("manual")}>
              Manual mode
            </button>
          </div>
          <div className="status-grid">
            <div>
              <span>Credentials detected</span>
              <strong>{apiStatus.hasCredentials ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span>Current mode</span>
              <strong>{apiStatus.mode === "api" ? "API mode" : "Manual mode"}</strong>
            </div>
            <div>
              <span>Marketplace</span>
              <strong>{apiStatus.marketplaceId}</strong>
            </div>
          </div>
          <p className="plain-copy">
            API mode is the default and can display listing cards inside the app when credentials are available. Manual mode generates eBay searches and supports manual favourites.
            Secret values stay in your local environment and are not shown here.
          </p>
          {settingsMessage ? <div className="success-banner">{settingsMessage}</div> : null}
          <form className="credentials-form" onSubmit={saveCredentials}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">eBay API credentials</p>
                <h2>Set or replace credentials</h2>
              </div>
            </div>
            <div className="filter-grid">
              <label className="wide-field">
                Client ID
                <input
                  value={credentialsInput.clientId}
                  onChange={(event) => setCredentialsInput({ ...credentialsInput, clientId: event.target.value })}
                  placeholder={apiStatus.hasCredentials ? "Stored locally. Paste a new value to replace it." : "Paste eBay client ID"}
                />
              </label>
              <label className="wide-field">
                Client secret
                <input
                  type="password"
                  value={credentialsInput.clientSecret}
                  onChange={(event) => setCredentialsInput({ ...credentialsInput, clientSecret: event.target.value })}
                  placeholder={apiStatus.hasCredentials ? "Stored locally. Paste a new value to replace it." : "Paste eBay client secret"}
                />
              </label>
              <label>
                Marketplace
                <input
                  value={credentialsInput.marketplaceId}
                  onChange={(event) => setCredentialsInput({ ...credentialsInput, marketplaceId: event.target.value })}
                  placeholder="EBAY_GB"
                />
              </label>
              <div className="form-footer">
                <button type="submit">Save API settings</button>
              </div>
            </div>
          </form>
          </>
          )}
        </main>
      ) : null}
    </div>
  );
}

function readError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

function extractUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  return match?.[0];
}

function isLikelyEbayUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("ebay.");
  } catch {
    return false;
  }
}
