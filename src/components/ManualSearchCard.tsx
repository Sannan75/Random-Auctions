import { Listing } from "../types";

type Props = {
  search: Listing;
  onOpen: (url: string) => void;
  onReroll: (id: string) => void;
  onDismiss: (id: string) => void;
};

export function ManualSearchCard({ search, onOpen, onReroll, onDismiss }: Props) {
  return (
    <article className="search-card">
      <div className="search-card-main">
        <div>
          <p className="eyebrow">Generated search</p>
          <h3>{search.searchTerm ? search.searchTerm : search.title}</h3>
        </div>
        <p className="muted">
          Opens eBay search results using your current filters. Save a real listing from eBay with the manual form below.
        </p>
        <dl className="search-facts">
          <div>
            <dt>Price</dt>
            <dd>{search.price || "Any price"}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{search.listingType || "Any listing type"}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{search.postage || "Any location"}</dd>
          </div>
        </dl>
      </div>
      <div className="search-card-actions">
        <button onClick={() => onOpen(search.itemUrl)}>Open search</button>
        <button className="secondary" onClick={() => onReroll(search.id)}>
          Reroll
        </button>
        <button className="ghost" onClick={() => onDismiss(search.id)}>
          Dismiss
        </button>
      </div>
    </article>
  );
}
