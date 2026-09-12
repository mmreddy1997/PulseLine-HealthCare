import { useId, useMemo, useState } from "react";
import {
  allHospitalSuggestions,
  buildSearchSuggestions,
  groupSuggestions,
  type CountyRef,
  type ExplorerHospital,
  type SearchSuggestion,
} from "../../../lib/explorer/index.ts";

export function AreaSearch({
  hospitals,
  counties,
  query,
  onQueryChange,
  onChoose,
  onClear,
}: {
  hospitals: ExplorerHospital[];
  counties: CountyRef[];
  query: string;
  onQueryChange: (value: string) => void;
  onChoose: (suggestion: SearchSuggestion) => void;
  onClear: () => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [listingAll, setListingAll] = useState(false);
  const suggestions = useMemo(
    () =>
      listingAll && !query.trim()
        ? allHospitalSuggestions(hospitals)
        : buildSearchSuggestions(hospitals, counties, query),
    [hospitals, counties, query, listingAll],
  );
  const groups = groupSuggestions(suggestions);

  return (
    <div className="area-search">
      <div className="area-search-controls">
        <label className="search-field search-field-lg">
          <span>Search Kentucky</span>
          <input
            type="search"
            role="combobox"
            aria-expanded={open && groups.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            placeholder="Hospital, city, county, or ZIP"
            onChange={(event) => {
              onQueryChange(event.target.value);
              setListingAll(false);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
              }
              if (event.key === "Enter" && suggestions[0]) {
                event.preventDefault();
                onChoose(suggestions[0]);
                setListingAll(false);
                setOpen(false);
              }
            }}
          />
        </label>
        {query ? (
          <button
            type="button"
            className="chip chip-quiet"
            onClick={() => {
              onClear();
              setListingAll(false);
              setOpen(false);
            }}
          >
            Clear search
          </button>
        ) : (
          <button
            type="button"
            className="chip chip-quiet"
            onClick={() => {
              onClear();
              setListingAll(true);
              setOpen(true);
            }}
          >
            Show all
          </button>
        )}
      </div>
      {open && groups.length > 0 ? (
        <div id={listId} className="search-suggestions" role="listbox" aria-label="Search suggestions">
          {groups.map((group) => (
            <div key={group.kind} className="suggestion-group">
              <p className="label">{group.label}</p>
              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  role="option"
                  className="suggestion-row"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChoose(item);
                    setListingAll(false);
                    setOpen(false);
                  }}
                >
                  <strong>{item.label}</strong>
                  <span className="tiny">{item.detail}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
