import { useMemo, useState } from "react";
import type { ExplorerHospital } from "../../../lib/explorer/types.ts";

export function HospitalSelector({
  hospitals,
  selectedId,
  onSelect,
  label = "Hospital",
}: {
  hospitals: ExplorerHospital[];
  selectedId: string | null;
  onSelect: (hospitalId: string) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return hospitals.filter((hospital) => {
      if (!needle) return true;
      return [hospital.name, hospital.city, hospital.county, hospital.zip]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [hospitals, query]);

  return (
    <div className="hospital-selector">
      <label className="search-field">
        <span>{label}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, city, county, or ZIP"
          aria-label="Search hospitals"
        />
      </label>
      <p className="tiny">
        {matches.length} of {hospitals.length} in the current dataset. PulseLine does not include every hospital.
      </p>
      <ul className="selector-list">
        {matches.map((hospital) => (
          <li key={hospital.hospitalId}>
            <button
              type="button"
              className={hospital.hospitalId === selectedId ? "selector-row is-selected" : "selector-row"}
              onClick={() => onSelect(hospital.hospitalId)}
            >
              <span>
                <strong>{hospital.name}</strong>
                <span className="tiny">
                  {[hospital.city, hospital.county ? `${hospital.county} County` : null, hospital.zip]
                    .filter(Boolean)
                    .join(" · ") || "Location pending"}
                </span>
              </span>
              <span className="tiny">
                {hospital.financialStatus === "pending"
                  ? "Financial data pending"
                  : hospital.latestFiscalPeriod ?? "Period unknown"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
