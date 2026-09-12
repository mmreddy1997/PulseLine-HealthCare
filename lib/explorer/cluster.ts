export interface GeoPoint {
  id: string;
  latitude: number;
  longitude: number;
}

export interface PointCluster {
  id: string;
  latitude: number;
  longitude: number;
  pointIds: string[];
}

/** Grid cluster for overlapping verified coordinates. Not used for pending locations. */
export function clusterPoints(points: GeoPoint[], cellDegrees = 0.08): PointCluster[] {
  const buckets = new Map<string, GeoPoint[]>();
  for (const point of points) {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue;
    const key = `${Math.round(point.latitude / cellDegrees)}:${Math.round(point.longitude / cellDegrees)}`;
    const list = buckets.get(key) ?? [];
    list.push(point);
    buckets.set(key, list);
  }
  return [...buckets.entries()].map(([key, group]) => ({
    id: `cluster:${key}`,
    latitude: group.reduce((sum, point) => sum + point.latitude, 0) / group.length,
    longitude: group.reduce((sum, point) => sum + point.longitude, 0) / group.length,
    pointIds: group.map((point) => point.id),
  }));
}
