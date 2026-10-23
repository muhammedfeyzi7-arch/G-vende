// OTOMATİK KOPYA — düzenlemeyin. Kaynak: src/utils/geo.ts (scripts/sync-function-shared.mjs)
export type LatLng = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (d: number) => (d * Math.PI) / 180;

/** İki nokta arasındaki büyük daire mesafesi (km). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidCoordinate(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

/** Merkez etrafında yaklaşık dairesel bir GeoJSON poligonu üretir (mesafe halkaları için). */
export function circlePolygon(center: LatLng, radiusKm: number, steps = 64): { type: 'Polygon'; coordinates: [number, number][][] } {
  const coords: [number, number][] = [];
  const latR = toRad(center.latitude);
  const lonR = toRad(center.longitude);
  const d = radiusKm / EARTH_RADIUS_KM;
  for (let i = 0; i <= steps; i++) {
    const brng = (2 * Math.PI * i) / steps;
    const lat = Math.asin(Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(brng));
    const lon = lonR + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(latR), Math.cos(d) - Math.sin(latR) * Math.sin(lat));
    coords.push([(lon * 180) / Math.PI, (lat * 180) / Math.PI]);
  }
  return { type: 'Polygon', coordinates: [coords] };
}

/**
 * Konumu yaklaşık ızgaraya yuvarlar. Herkese açık raporlarda kesin konum yerine
 * kullanılır (0.01° ≈ 1.1 km).
 */
export function coarsen(point: LatLng, step = 0.01): LatLng {
  const r = (v: number) => Math.round(v / step) * step;
  return { latitude: Number(r(point.latitude).toFixed(4)), longitude: Number(r(point.longitude).toFixed(4)) };
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return 'Bilinmiyor';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}
