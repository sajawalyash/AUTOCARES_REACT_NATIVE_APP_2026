const EARTH_KM = 6371;

export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return distanceKm(lat1, lon1, lat2, lon2) * 1000;
}

/**
 * Format distance into readable format:
 * Examples: 350 m, 900 m, 1.2 km, 5.6 km
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

/** Check if coordinates are within a specified radius in meters */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number
): boolean {
  const dist = distanceMeters(centerLat, centerLng, targetLat, targetLng);
  return dist <= radiusMeters;
}

/** Rough ETA minutes assuming ~30 km/h urban average */
export function etaMinutesFromDistance(km: number): number {
  return Math.max(5, Math.round((km / 30) * 60));
}

export const SEARCH_RADII_METERS = [1000, 2000, 5000, 10000, 20000] as const;
export type SearchRadiusMeters = (typeof SEARCH_RADII_METERS)[number];
export const DEFAULT_SEARCH_RADIUS_METERS: SearchRadiusMeters = 5000;

export function radiusMetersToLabel(meters: number): string {
  if (meters >= 1000) {
    return `${meters / 1000} km`;
  }
  return `${meters} m`;
}
