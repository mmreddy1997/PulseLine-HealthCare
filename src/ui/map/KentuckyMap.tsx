import { useMemo } from "react";
import kyCounties from "../../../data/geo/ky-counties.json";
import { countyHospitalCounts, pluralHospitals, type ExplorerHospital } from "../../../lib/explorer/index.ts";
import { geometryCentroid, geometryToPath, projectKentucky } from "../../../lib/geo/project.ts";

const WIDTH = 800;
const HEIGHT = 480;

type CountyFeature = {
  id: string;
  properties: { geoid: string; name: string };
  geometry: { type: string; coordinates: unknown };
};

const features = kyCounties.features as CountyFeature[];

export const KY_COUNTY_NAMES = Object.fromEntries(features.map((feature) => [feature.id, feature.properties.name]));

export function KentuckyMap({
  hospitals,
  selectedCountyFips,
  selectedHospitalId,
  onSelectCounty,
}: {
  hospitals: ExplorerHospital[];
  selectedCountyFips: string | null;
  selectedHospitalId: string | null;
  onSelectCounty: (fips: string | null) => void;
}) {
  const counts = useMemo(() => countyHospitalCounts(hospitals), [hospitals]);
  const selectedHospital = hospitals.find((item) => item.hospitalId === selectedHospitalId) ?? null;
  const focusFips = selectedCountyFips ?? selectedHospital?.countyFips ?? null;

  return (
    <figure className="ky-map">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Kentucky counties. Shading is hospital count in the current dataset, not a risk score."
      >
        <title>Kentucky hospital explorer map</title>
        {features.map((feature) => {
          const count = counts.get(feature.id) ?? 0;
          const selected = feature.id === focusFips;
          const className = [
            "ky-county",
            count > 0 ? "has-hospitals" : "",
            selected ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <path
              key={feature.id}
              className={className}
              d={geometryToPath(feature.geometry, WIDTH, HEIGHT)}
              tabIndex={0}
              role="button"
              aria-pressed={selected}
              aria-label={`${feature.properties.name} County. ${count} ${pluralHospitals(count)} in the current dataset.`}
              onClick={() => onSelectCounty(selected && selectedCountyFips === feature.id ? null : feature.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectCounty(selected && selectedCountyFips === feature.id ? null : feature.id);
                }
              }}
            />
          );
        })}
        {features.map((feature) => {
          const count = counts.get(feature.id) ?? 0;
          if (count === 0) return null;
          const centroid = geometryCentroid(feature.geometry);
          if (!centroid) return null;
          const point = projectKentucky(centroid.lon, centroid.lat, WIDTH, HEIGHT);
          return (
            <text
              key={`${feature.id}-count`}
              className={feature.id === focusFips ? "ky-count on-selected" : "ky-count"}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {count}
            </text>
          );
        })}
      </svg>
      <figcaption className="tiny">
        County numbers are dataset hospital counts, not risk. No commercial basemap. Boundaries: U.S. Census Bureau
        county cartographic polygons, public domain. ZIP codes are not drawn as polygons.
      </figcaption>
    </figure>
  );
}
