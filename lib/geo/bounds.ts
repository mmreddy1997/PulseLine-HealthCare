import { KY_BOUNDS, projectKentucky } from "./project.ts";

export interface LonLatBounds {
  west: number;
  east: number;
  south: number;
  north: number;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FULL_VIEW: ViewBox = { x: 0, y: 0, width: 800, height: 480 };

function collectRings(geometry: { type: string; coordinates: unknown }): number[][] {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as number[][][]).flat();
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).flat(2);
  }
  return [];
}

export function geometryBounds(geometry: { type: string; coordinates: unknown }): LonLatBounds | null {
  const rings = collectRings(geometry);
  let west = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  for (const coord of rings) {
    const lon = coord[0];
    const lat = coord[1];
    if (lon == null || lat == null || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  if (!Number.isFinite(west) || west > east || south > north) return null;
  return { west, east, south, north };
}

export function projectedBounds(
  geometry: { type: string; coordinates: unknown },
  width: number,
  height: number,
): ViewBox | null {
  const rings = collectRings(geometry);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const coord of rings) {
    const lon = coord[0];
    const lat = coord[1];
    if (lon == null || lat == null) continue;
    const point = projectKentucky(lon, lat, width, height);
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  if (!Number.isFinite(minX) || minX > maxX || minY > maxY) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function padViewBox(box: ViewBox, padding: number, maxWidth = 800, maxHeight = 480): ViewBox {
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(maxWidth, box.x + box.width + padding);
  const bottom = Math.min(maxHeight, box.y + box.height + padding);
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}

export function kentuckyViewBox(): ViewBox {
  return { ...FULL_VIEW };
}

export function viewBoxString(box: ViewBox): string {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

export function fitsKentucky(bounds: LonLatBounds | null): boolean {
  if (!bounds) return false;
  return (
    bounds.west >= KY_BOUNDS.west - 0.4 &&
    bounds.east <= KY_BOUNDS.east + 0.4 &&
    bounds.south >= KY_BOUNDS.south - 0.4 &&
    bounds.north <= KY_BOUNDS.north + 0.4
  );
}
