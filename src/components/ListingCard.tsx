import { FormEvent, useState } from "react";
import { Listing } from "../types";

type Props = {
  listing: Listing;
  onOpen: (url: string) => void;
  onFavourite: (listing: Listing, note: string, tags: string[]) => void;
  onDismiss?: (id: string) => void;
};

export function ListingCard({ listing, onOpen, onFavourite, onDismiss }: Props) {
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");

  function handleFavourite(event: FormEvent) {
    event.preventDefault();
    onFavourite(
      listing,
      note,
      tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    );
    setNote("");
    setTags("");
  }

  return (
    <article className="listing-card">
      <div className="listing-image">
        {listing.imageUrl ? <img src={listing.imageUrl} alt="" /> : <span>No image</span>}
      </div>
      <div className="listing-content">
        <div>
          <p className="eyebrow">{listing.searchTerm ? `Seed: ${listing.searchTerm}` : listing.listingType || "Listing"}</p>
          <h3>{listing.title}</h3>
        </div>
        <dl className="listing-facts">
          <div>
            <dt>Price</dt>
            <dd>{listing.price || "Unknown"}</dd>
          </div>
          <div>
            <dt>Postage</dt>
            <dd>{listing.postage || "Not shown"}</dd>
          </div>
          <div>
            <dt>Ends</dt>
            <dd>{listing.timeLeft || "Not shown"}</dd>
          </div>
          <div>
            <dt>Seller</dt>
            <dd>{listing.seller || "Not shown"}</dd>
          </div>
        </dl>
        <form className="save-form" onSubmit={handleFavourite}>
          <label>
            Why did I save this?
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
          </label>
          <label>
            Tags
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Optional tags, comma-separated" />
          </label>
          <div className="button-row">
            <button type="button" className="secondary" onClick={() => onOpen(listing.itemUrl)}>
              Open
            </button>
            <button type="submit">Favourite</button>
            {onDismiss ? (
              <button type="button" className="ghost" onClick={() => onDismiss(listing.id)}>
                Dismiss
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </article>
  );
}
