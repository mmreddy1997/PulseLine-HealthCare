import { useMemo } from "react";
import kyCounties from "../../../data/geo/ky-counties.json";
import type { AreaSelection } from "../../../lib/explorer/search.ts";
import { matchingCountyFips, pluralHospitals, type ExplorerHospital } from "../../../lib/explorer/index.ts";
import { padViewBox, projectedBounds, viewBoxString } from "../../../lib/geo/bounds.ts";
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

export const KY_COUNTIES = features.map((feature) => ({ fips: feature.id, name: feature.properties.name }));

export function KentuckyMap({
  hospitals,
  area,
  mapFocus,
  selectedHospitalId,
  onSelectCounty,
  onSelectHospital,
  onShowAll,
  onBackToArea,
}: {
  hospitals: ExplorerHospital[];
  area: AreaSelection;
  mapFocus: "kentucky" | "area" | "hospital";
  selectedHospitalId: string | null;
  onSelectCounty: (fips: string, name: string) => void;
  onSelectHospital?: (hospitalId: string) => void;
  onShowAll: () => void;
  onBackToArea: () => void;
}) {
  const selectedHospital = hospitals.find((item) => item.hospitalId === selectedHospitalId) ?? null;
  const matchFips = useMemo(() => new Set(matchingCountyFips(hospitals, area)), [hospitals, area]);
  const focusFips =
    mapFocus === "hospital"
      ? selectedHospital?.countyFips ?? area.countyFips
      : area.outline === "county"
        ? area.countyFips
        : null;
  const viewBox = useMemo(() => {
    if (mapFocus === "kentucky" || !focusFips) return viewBoxString({ x: 0, y: 0, width: WIDTH, height: HEIGHT });
    const feature = features.find((item) => item.id === focusFips);
    if (!feature) return viewBoxString({ x: 0, y: 0, width: WIDTH, height: HEIGHT });
    const box = projectedBounds(feature.geometry, WIDTH, HEIGHT);
    if (!box) return viewBoxString({ x: 0, y: 0, width: WIDTH, height: HEIGHT });
    return viewBoxString(padViewBox(box, mapFocus === "hospital" ? 18 : 28));
  }, [focusFips, mapFocus]);
  const markers = hospitals.filter((hospital) => hospital.latitude != null && hospital.longitude != null);

  return (
    <figure className="ky-map">
      <div className="map-toolbar">
        <button type="button" className="chip" onClick={onBackToArea} disabled={area.kind === "all" && mapFocus === "kentucky"}>
          Back to selected area
        </button>
        <button type="button" className="chip chip-quiet" onClick={onShowAll}>
          Show all Kentucky
        </button>
      </div>
      <svg viewBox={viewBox} role="img" aria-label="Kentucky counties. Shading is hospital count in the current dataset, not a risk score.">
        <title>Kentucky hospital explorer map</title>
        {features.map((feature) => {
          const inArea = matchFips.has(feature.id) || feature.id === area.countyFips;
          const selected = feature.id === focusFips && area.outline === "county";
          const className = [
            "ky-county",
            inArea ? "has-hospitals" : "",
            inArea && area.kind !== "all" ? "is-match" : "",
            selected ? "is-selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const count = hospitals.filter((hospital) => hospital.countyFips === feature.id).length;
          return (
            <path
              key={feature.id}
              className={className}
              d={geometryToPath(feature.geometry, WIDTH, HEIGHT)}
              tabIndex={0}
              role="button"
              aria-pressed={selected}
              aria-label={`${feature.properties.name} County. ${count} ${pluralHospitals(count)} in the current dataset.`}
              onClick={() => onSelectCounty(feature.id, feature.properties.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectCounty(feature.id, feature.properties.name);
                }
              }}
            />
          );
        })}
        {markers.map((hospital) => {
          const point = projectKentucky(hospital.longitude as number, hospital.latitude as number, WIDTH, HEIGHT);
          const selected = hospital.hospitalId === selectedHospitalId;
          return (
            <circle
              key={hospital.hospitalId}
              className={selected ? "ky-marker is-selected" : "ky-marker"}
              cx={point.x}
              cy={point.y}
              r={selected ? 7 : 5}
              tabIndex={0}
              role="button"
              aria-label={hospital.name}
              onClick={(event) => {
                event.stopPropagation();
                onSelectHospital?.(hospital.hospitalId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectHospital?.(hospital.hospitalId);
                }
              }}
            />
          );
        })}
        {focusFips
          ? features
              .filter((feature) => feature.id === focusFips)
              .map((feature) => {
                const centroid = geometryCentroid(feature.geometry);
                if (!centroid) return null;
                const point = projectKentucky(centroid.lon, centroid.lat, WIDTH, HEIGHT);
                return (
                  <text key={`${feature.id}-label`} className="ky-count on-selected" x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle">
                    {feature.properties.name}
                  </text>
                );
              })
          : null}
      </svg>
      <figcaption className="tiny">
        {area.outlineNote ??
          "County shading is dataset hospital presence, not risk. Boundaries: U.S. Census Bureau cartographic county polygons, public domain. No commercial basemap and no runtime geocoding."}
        {markers.length === 0
          ? " Hospital street markers are omitted because sourced latitude and longitude are not verified."
          : " Markers appear only for hospitals with sourced coordinates."}
      </figcaption>
    </figure>
  );
}
