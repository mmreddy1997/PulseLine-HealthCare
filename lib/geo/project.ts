export const KY_BOUNDS = {
  west: -89.58,
  east: -81.96,
  south: 36.49,
  north: 39.15,
};

export interface ProjectedPoint {
  x: number;
  y: number;
}

export function projectKentucky(lon: number, lat: number, width: number, height: number): ProjectedPoint {
  const x = ((lon - KY_BOUNDS.west) / (KY_BOUNDS.east - KY_BOUNDS.west)) * width;
  const y = ((KY_BOUNDS.north - lat) / (KY_BOUNDS.north - KY_BOUNDS.south)) * height;
  return { x, y };
}

type Ring = number[][];

function pathRing(ring: Ring, width: number, height: number): string {
  return ring
    .map((coord, index) => {
      const [lon, lat] = coord;
      if (lon == null || lat == null) return "";
      const point = projectKentucky(lon, lat, width, height);
      return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");
}

export function geometryToPath(
  geometry: { type: string; coordinates: unknown },
  width: number,
  height: number,
): string {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as Ring[]).map((ring) => `${pathRing(ring, width, height)} Z`).join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as Ring[][])
      .flatMap((polygon) => polygon.map((ring) => `${pathRing(ring, width, height)} Z`))
      .join(" ");
  }
  return "";
}

export function ringCentroid(ring: Ring): { lon: number; lat: number } | null {
  if (ring.length === 0) return null;
  let lon = 0;
  let lat = 0;
  let count = 0;
  for (const coord of ring) {
    if (coord[0] == null || coord[1] == null) continue;
    lon += coord[0];
    lat += coord[1];
    count += 1;
  }
  if (count === 0) return null;
  return { lon: lon / count, lat: lat / count };
}

export function geometryCentroid(geometry: { type: string; coordinates: unknown }): { lon: number; lat: number } | null {
  if (geometry.type === "Polygon") {
    return ringCentroid((geometry.coordinates as Ring[])[0] ?? []);
  }
  if (geometry.type === "MultiPolygon") {
    const first = (geometry.coordinates as Ring[][])[0]?.[0] ?? [];
    return ringCentroid(first);
  }
  return null;
}
