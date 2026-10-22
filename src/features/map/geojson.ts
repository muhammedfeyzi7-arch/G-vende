import type { AssemblyPoint } from '@/types/assembly';
import type { EarthquakeEvent } from '@/types/earthquake';
import type { UserReport } from '@/types/report';
import { circlePolygon } from '@/utils/geo';
import { CATEGORY_META, feltColor } from '../reports/categories';
import { magnitudeColor } from '../earthquakes/format';

/** Mesafe halkaları (km). Sarsıntı alanı değildir; yalnızca uzaklığı görselleştirir. */
export const DISTANCE_RINGS_KM = [8, 15, 25, 35, 50, 75] as const;

export function quakesToGeoJSON(events: EarthquakeEvent[], focusId: string | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events.map((e) => ({
      type: 'Feature',
      id: e.id,
      geometry: { type: 'Point', coordinates: [e.primary.longitude, e.primary.latitude] },
      properties: {
        kind: 'quake',
        id: e.id,
        mag: e.primary.magnitude ?? 0,
        color: magnitudeColor(e.primary.magnitude),
        focus: e.id === focusId,
      },
    })),
  };
}

export function ringsToGeoJSON(focus: EarthquakeEvent | null): GeoJSON.FeatureCollection {
  if (!focus) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: [...DISTANCE_RINGS_KM].reverse().map((km, i) => ({
      type: 'Feature',
      geometry: circlePolygon(focus.primary, km),
      properties: { km, order: i },
    })),
  };
}

export function reportsToGeoJSON(reports: UserReport[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: reports
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        type: 'Feature',
        id: r.id,
        geometry: { type: 'Point', coordinates: [r.longitude as number, r.latitude as number] },
        properties: {
          kind: 'report',
          id: r.id,
          color: r.category === 'shake' ? feltColor(r.feltIntensity) : CATEGORY_META[r.category].color,
        },
      })),
  };
}

export function assemblyToGeoJSON(points: AssemblyPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      id: p.id,
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      properties: { kind: 'assembly', id: p.id },
    })),
  };
}
