import { useEffect, useMemo, useState } from "react";
import {
  availableEventFilters,
  CONCERN_FILTERS,
  COVERAGE_FILTERS,
  DATASET_SCOPE_NOTE,
  defaultExplorerFilters,
  eventFilterLabel,
  EXPLORER_SORT_HELP,
  EXPLORER_SORTS,
  FILTER_LOCATION_HELP,
  filterExplorerHospitals,
  PENDING_FILTER,
  removeFilterChip,
  SCREENING_SORT_LIMIT,
  uniqueCounties,
  uniqueFiscalKeys,
  uniqueOwnerships,
  uniqueRuralStatuses,
  uniqueZips,
  UNKNOWN_FILTER,
  visibleSelectedHospitalId,
  type ConcernFilter,
  type CoverageFilter,
  type EventFilter,
  type ExplorerHospital,
  type ExplorerSort,
} from "../../../lib/explorer/index.ts";
import { StatusGlyph } from "../hospital-display.tsx";
import { statusClass } from "../format.ts";
import { KentuckyMap, KY_COUNTY_NAMES } from "../map/KentuckyMap.tsx";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export function HospitalExplorer({
  hospitals,
  onOpen,
}: {
  hospitals: ExplorerHospital[];
  onOpen: (hospitalId: string) => void;
}) {
  const [filters, setFilters] = useState(defaultExplorerFilters);
  const [draftQuery, setDraftQuery] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedQuery = useDebounced(draftQuery, 200);
  const wide = useWide();

  const activeFilters = useMemo(
    () => ({ ...filters, query: debouncedQuery }),
    [filters, debouncedQuery],
  );
  const result = useMemo(
    () => filterExplorerHospitals(hospitals, activeFilters, KY_COUNTY_NAMES),
    [hospitals, activeFilters],
  );
  const counties = uniqueCounties(hospitals);
  const zips = uniqueZips(hospitals);
  const fiscals = uniqueFiscalKeys(hospitals);
  const ownerships = uniqueOwnerships(hospitals);
  const ruralStatuses = uniqueRuralStatuses(hospitals);
  const eventTypes = availableEventFilters(hospitals);
  const visibleSelectedId = visibleSelectedHospitalId(result.items, selectedId);
  const selected = result.items.find((item) => item.hospitalId === visibleSelectedId) ?? null;
  const selectedCounty = filters.countyFips[0] ?? null;

  function selectHospital(id: string) {
    setSelectedId(id);
    if (wide) onOpen(id);
  }

  function resetFilters() {
    setDraftQuery("");
    setFilters(defaultExplorerFilters());
  }

  return (
    <section className="explorer" aria-labelledby="explorer-title">
      <div className="section-head">
        <h2 id="explorer-title">Map and filters</h2>
        <p>
          {result.datasetLabel} {DATASET_SCOPE_NOTE}
        </p>
        <p className="tiny">{SCREENING_SORT_LIMIT}</p>
      </div>

      <div className="explorer-controls">
        <label className="search-field">
          <span>Search</span>
          <input
            type="search"
            value={draftQuery}
            placeholder="Hospital, county, or ZIP"
            onChange={(event) => setDraftQuery(event.target.value)}
          />
        </label>
        <label>
          <span>County</span>
          <select
            value={selectedCounty ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                countyFips: event.target.value ? [event.target.value] : [],
              }))
            }
          >
            <option value="">All counties</option>
            {counties.map((county) => (
              <option key={county.fips} value={county.fips}>
                {county.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>ZIP</span>
          <select
            value={filters.zips[0] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({ ...current, zips: event.target.value ? [event.target.value] : [] }))
            }
          >
            <option value="">All ZIPs</option>
            {zips.map((zip) => (
              <option key={zip} value={zip}>
                {zip}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Financial concern</span>
          <select
            value={filters.concerns[0] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                concerns: event.target.value ? [event.target.value as ConcernFilter] : [],
              }))
            }
          >
            <option value="">All</option>
            {CONCERN_FILTERS.map((item) => (
              <option key={item} value={item}>
                {item === "pending" ? "Financial data pending" : item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Data coverage</span>
          <select
            value={filters.coverages[0] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                coverages: event.target.value ? [event.target.value as CoverageFilter] : [],
              }))
            }
          >
            <option value="">All</option>
            {COVERAGE_FILTERS.map((item) => (
              <option key={item} value={item}>
                {item === "pending" ? "Pending" : item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Latest fiscal period</span>
          <select
            value={filters.fiscalPeriods[0] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                fiscalPeriods: event.target.value ? [event.target.value] : [],
              }))
            }
          >
            <option value="">All periods</option>
            {fiscals.map((item) => (
              <option key={item} value={item}>
                {item === PENDING_FILTER ? "Pending / unknown" : `Fiscal end ${item}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Documented event type</span>
          <select
            value={filters.eventTypes[0] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                eventTypes: event.target.value ? [event.target.value as EventFilter] : [],
              }))
            }
          >
            <option value="">All event records</option>
            {eventTypes.map((item) => (
              <option key={item} value={item}>
                {eventFilterLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Ownership</span>
          <select
            value={filters.ownerships[0] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                ownerships: event.target.value ? [event.target.value] : [],
              }))
            }
          >
            <option value="">All ownership records</option>
            {ownerships.map((item) => (
              <option key={item} value={item}>
                {item === UNKNOWN_FILTER ? "Unknown" : item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Rural / CAH</span>
          <select
            value={filters.ruralStatuses[0] ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                ruralStatuses: event.target.value ? [event.target.value] : [],
              }))
            }
          >
            <option value="">All rural records</option>
            {ruralStatuses.map((item) => (
              <option key={item} value={item}>
                {item === "cah" ? "Sourced CAH" : "Unknown"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select
            value={filters.sort}
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as ExplorerSort }))}
          >
            {EXPLORER_SORTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="tiny">{EXPLORER_SORT_HELP[filters.sort]}</p>
      <details className="help-details">
        <summary>County and ZIP meaning</summary>
        <p className="tiny">{FILTER_LOCATION_HELP}</p>
      </details>

      <div className="chip-row">
        {result.chips.map((chip) => (
          <button
            type="button"
            key={chip.id}
            className="chip"
            onClick={() => {
              if (chip.key === "query") setDraftQuery("");
              setFilters((current) => removeFilterChip(current, chip));
            }}
          >
            {chip.label} ×
          </button>
        ))}
        <button type="button" className="chip chip-quiet" onClick={resetFilters}>
          Reset filters
        </button>
      </div>

      <p className="result-count">
        {result.matchCount} matching {result.matchCount === 1 ? "record" : "records"}
      </p>

      {!wide ? (
        <div className="view-toggle" role="group" aria-label="Explorer view">
          <button type="button" className={view === "list" ? "tab active" : "tab"} onClick={() => setView("list")}>
            List
          </button>
          <button type="button" className={view === "map" ? "tab active" : "tab"} onClick={() => setView("map")}>
            Map
          </button>
        </div>
      ) : null}

      <div className={`explorer-split ${!wide && view === "map" ? "map-first" : ""}`}>
        {(wide || view === "map") ? (
          <KentuckyMap
            hospitals={hospitals}
            selectedCountyFips={selectedCounty}
            selectedHospitalId={visibleSelectedId}
            onSelectCounty={(fips) =>
              setFilters((current) => ({
                ...current,
                countyFips: fips ? [fips] : [],
              }))
            }
          />
        ) : null}
        {(wide || view === "list") ? (
          <ul className="hospital-list">
            {result.emptyMessage ? (
              <li className="empty-copy">
                <p>{result.emptyMessage}</p>
                <p className="tiny">This is not a claim that no hospitals exist here.</p>
              </li>
            ) : (
              result.items.map((hospital) => (
                <li key={hospital.hospitalId}>
                  <button
                    type="button"
                    className={`hospital-row ${hospital.hospitalId === visibleSelectedId ? "is-selected" : ""} ${statusClass(hospital.financialStatus === "pending" ? "Insufficient data" : hospital.financialStatus)}`}
                    onClick={() => selectHospital(hospital.hospitalId)}
                  >
                    <div>
                      <strong>{hospital.name}</strong>
                      <p className="tiny">
                        {[hospital.city, hospital.county ? `${hospital.county} County` : null, hospital.zip]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="tiny">
                        Latest fiscal period: {hospital.latestFiscalPeriod ?? "Pending"}
                      </p>
                      <p className="tiny">
                        Coverage: {hospital.dataCoverage === "pending" ? "Pending" : hospital.dataCoverage}
                        {" · "}
                        {hospital.evidenceGap}
                      </p>
                      <p className="tiny open-brief">Open diligence brief</p>
                    </div>
                    <span className={`status-pill ${hospital.financialStatus === "pending" ? "status-pending" : statusClass(hospital.financialStatus)}`}>
                      <StatusGlyph status={hospital.financialStatus === "pending" ? "pending" : hospital.financialStatus} />
                      {hospital.score !== null ? `${hospital.score} · ` : ""}
                      {hospital.financialStatus === "pending" ? "Pending" : hospital.financialStatus}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {!wide && selected ? (
        <div className="hospital-preview" role="region" aria-label="Selected hospital">
          <div>
            <strong>{selected.name}</strong>
            <p className="tiny">{selected.evidenceGap}</p>
            <p className="tiny">{selected.locationNote}</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => onOpen(selected.hospitalId)}>
            Open diligence brief
          </button>
        </div>
      ) : null}
    </section>
  );
}

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 900px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return wide;
}
