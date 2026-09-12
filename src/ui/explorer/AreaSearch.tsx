import { useId, useMemo, useState } from "react";
import {
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
  const suggestions = useMemo(
    () => buildSearchSuggestions(hospitals, counties, query),
    [hospitals, counties, query],
  );
  const groups = groupSuggestions(suggestions);

  return (
    <div className="area-search">
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
              setOpen(false);
            }
          }}
        />
      </label>
      {query ? (
        <button type="button" className="chip chip-quiet" onClick={onClear}>
          Clear search
        </button>
      ) : (
        <button type="button" className="chip chip-quiet" onClick={onClear}>
          Show all
        </button>
      )}
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
