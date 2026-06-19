import { ChangeEvent, useMemo, useState } from "react";
import { Favourite } from "../types";
import { exportFavouritesJson, importFavouritesJson } from "../../shared/favourites";

type Props = {
  favourites: Favourite[];
  onOpen: (url: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (favourite: Favourite) => void;
  onImport: (favourites: Favourite[]) => void;
};

export function FavouritesView({ favourites, onOpen, onRemove, onUpdate, onImport }: Props) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const tags = useMemo(() => [...new Set(favourites.flatMap((item) => item.tags ?? []))].sort(), [favourites]);
  const visible = favourites.filter((item) => {
    const search = `${item.title} ${item.itemUrl} ${item.foundViaSeed ?? ""} ${item.note ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
    return search.includes(query.toLowerCase()) && (tag === "all" || item.tags?.includes(tag));
  });

  function exportJson() {
    const blob = new Blob([exportFavouritesJson(favourites)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `random-auction-favourites-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    onImport(importFavouritesJson(text));
    event.target.value = "";
  }

  return (
    <section className="tab-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Favourites</p>
          <h2>Curiosity shelf</h2>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={exportJson} disabled={favourites.length === 0}>
            Export JSON
          </button>
          <label className="file-button">
            Import JSON
            <input type="file" accept="application/json" onChange={importJson} />
          </label>
        </div>
      </div>

      <div className="favourite-tools">
        <label>
          Search favourites
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="logo, project, nonsense" />
        </label>
        <label>
          Filter by tag
          <select value={tag} onChange={(event) => setTag(event.target.value)}>
            <option value="all">All tags</option>
            {tags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">Your curiosity shelf is empty. Go find something weird.</div>
      ) : (
        <div className="favourites-grid">
          {visible.map((item) => (
            <article className="favourite-card" key={item.id}>
              <div className="favourite-image">
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>No image</span>}
              </div>
              <div className="favourite-body">
                {item.itemUrl ? (
                  <button className="link-title" onClick={() => onOpen(item.itemUrl)}>
                    {item.title}
                  </button>
                ) : (
                  <h3>{item.title}</h3>
                )}
                <p className="muted">
                  {item.price || "Unknown price"} - saved {new Date(item.dateSaved).toLocaleDateString()}
                </p>
                {item.foundViaSeed ? (
                  <p className="found-via">Found via: {item.foundViaSeed}</p>
                ) : null}
                <label>
                  Original listing
                  <div className="url-row">
                    <input value={item.itemUrl || "No URL saved"} readOnly />
                    <button className="secondary" disabled={!item.itemUrl} onClick={() => navigator.clipboard.writeText(item.itemUrl)}>
                      Copy
                    </button>
                  </div>
                </label>
                <label>
                  Why did I save this?
                  <textarea
                    value={item.note ?? ""}
                    onChange={(event) => onUpdate({ ...item, note: event.target.value })}
                    placeholder="beautiful nonsense"
                  />
                </label>
                <label>
                  Tags
                  <input
                    value={(item.tags ?? []).join(", ")}
                    onChange={(event) =>
                      onUpdate({
                        ...item,
                        tags: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean)
                      })
                    }
                    placeholder="odd, keepsake"
                  />
                </label>
                <div className="button-row">
                  <button className="secondary" disabled={!item.itemUrl} onClick={() => onOpen(item.itemUrl)}>
                    Open
                  </button>
                  <button className="ghost danger" onClick={() => onRemove(item.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
