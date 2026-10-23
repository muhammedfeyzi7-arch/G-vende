// Web (Expo web / önizleme): native ile aynı stil ve katman tanımlarını maplibre-gl ile çizer. Native derlemeler bu dosyayı kullanmaz.
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { assemblyToGeoJSON, quakesToGeoJSON, reportsToGeoJSON, ringsToGeoJSON } from './geojson';
import { faultsToGeoJSON, useFaultLines } from './faults';
import { ASSEMBLY_CLUSTER, ASSEMBLY_LAYERS, FAULT_LAYERS, QUAKE_LAYERS, REPORT_LAYERS, RING_LAYERS } from './layers';
import { isLightMap, styleFor } from './mapStyle';
import { currentScheme } from '@/theme';
import { visibleLabels } from './offline/base';
import { CATEGORY_META } from '@/features/reports/categories';

export const DEFAULT_LAYERS = { quakes: true, rings: true, reports: true, assembly: true, family: true, faults: false };
export type FamilyPin = any;
export type MapLayers = typeof DEFAULT_LAYERS;
export type MapSelection = { kind: 'quake' | 'report' | 'assembly'; id: string };
export type QuakeMapHandle = { flyTo: (p: { latitude: number; longitude: number }, z?: number) => void; getCenter: () => Promise<any> };

export const QuakeMap = forwardRef<QuakeMapHandle, any>(function Q(
  { mapStyle = 'dark', events, focus, reports, assemblyPoints, user, topInset = 0, onSelect, initialCenter, initialZoom, family = [], onViewportChange, onDetailUnavailable, layers },
  ref,
) {
  const host = useRef<any>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const pointsRef = useRef(assemblyPoints);
  const faults = useFaultLines(!!layers?.faults);
  const faultsRef = useRef(faults);
  const viewportRef = useRef(onViewportChange);
  viewportRef.current = onViewportChange;
  useImperativeHandle(ref, () => ({
    flyTo: (p, z = 10) => map.current?.flyTo({ center: [p.longitude, p.latitude], zoom: z }),
    getCenter: async () => {
      const c = map.current?.getCenter();
      return c ? { latitude: c.lat, longitude: c.lng } : null;
    },
  }));
  useEffect(() => {
    const el = host.current as HTMLElement;
    const center: [number, number] = initialCenter
      ? [initialCenter.longitude, initialCenter.latitude]
      : focus
        ? [focus.primary.longitude, focus.primary.latitude]
        : user
          ? [user.longitude, user.latitude]
          : [35.2, 39];
    const m = new maplibregl.Map({
      container: el,
      style: styleFor(mapStyle, currentScheme()) as any,
      center,
      zoom: initialZoom ?? (focus ? 5.9 : 4.8),
      attributionControl: false,
      padding: { top: topInset, bottom: 72, left: 0, right: 0 },
    } as any);
    map.current = m;
    // Karo/stil indirme hataları ("AJAXError: Failed to fetch") kullanıcıya gösterilmez; harita eldeki
    // katmanlarla çalışmaya devam eder (bağlantı uyarısı uygulama genelinde ayrıca gösterilir).
    let reported = false;
    m.on('error', (e: any) => {
      // Ayrıntı karoları (OpenFreeMap / uydu) gelmiyorsa ekran bunu kullanıcıya söyleyebilsin.
      if (!reported && (e?.sourceId === 'omt' || e?.sourceId === 's2')) {
        reported = true;
        onDetailUnavailable?.();
      }
    });
    const m0 = m;
    let lbl: any[] = [];
    const light = isLightMap(mapStyle, currentScheme());
    const drawLabels = () => {
      lbl.forEach((x) => x.remove());
      lbl = visibleLabels(m.getZoom(), user ? [user] : []).map((l) => {
        const d = document.createElement('div');
        const col = l.sea ? (light ? '#3F6E9E' : '#4C86C6') : light ? '#1F2D3D' : '#F2F6FA';
        const sz = l.sea ? 11 : l.rank === 1 ? 16 : l.rank === 2 ? 13 : 11;
        d.style.cssText = `pointer-events:none;font-family:Inter,sans-serif;font-size:${sz}px;font-weight:${l.rank === 1 ? 800 : 700};${l.sea ? 'font-style:italic;' : ''}color:${col};text-shadow:0 1px 3px ${light ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.95)'};white-space:nowrap;text-align:center`;
        d.innerHTML =
          (l.sea
            ? ''
            : `<div style="width:5px;height:5px;border-radius:3px;margin:0 auto 1px;background:${light ? '#1F2D3D' : '#F2F6FA'};border:1px solid ${light ? '#fff' : '#030B14'}"></div>`) +
          l.name;
        return new maplibregl.Marker({ element: d }).setLngLat([l.longitude, l.latitude]).addTo(m);
      });
    };
    m.on('zoomend', drawLabels);
    m.once('styledata', () => {
      drawLabels();
      const add = (id: string, data: any, defs: any[], extra: object = {}) => {
        m.addSource(id, { type: 'geojson', data, ...extra });
        defs.forEach((d) => m.addLayer({ ...d, source: id }));
        m.on('click', defs[defs.length - 1].id, (e: any) => {
          const p = e.features?.[0]?.properties;
          if (p?.kind && p?.id) onSelect?.({ kind: p.kind, id: p.id });
        });
      };
      add('faults', faultsToGeoJSON(faultsRef.current), FAULT_LAYERS);
      add('rings', ringsToGeoJSON(focus), RING_LAYERS);
      add('reports', reportsToGeoJSON(reports), REPORT_LAYERS);
      add('assembly', assemblyToGeoJSON(pointsRef.current ?? []), ASSEMBLY_LAYERS, ASSEMBLY_CLUSTER);
      m.on('click', 'assembly-cluster', async (e: any) => {
        const f = e.features?.[0];
        const src = m.getSource('assembly') as any;
        const z = await src.getClusterExpansionZoom(f.properties.cluster_id).catch(() => 14);
        m.easeTo({ center: f.geometry.coordinates, zoom: Math.min(16, z + 0.5) });
      });
      const report = () => {
        const b = m.getBounds();
        viewportRef.current?.({ bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: m.getZoom() });
      };
      m.on('moveend', report);
      report();
      add('quakes', quakesToGeoJSON(events, focus?.id ?? null), QUAKE_LAYERS);
      if (user) {
        const d = document.createElement('div');
        d.style.cssText =
          'width:64px;height:64px;border-radius:32px;background:rgba(22,131,255,.18);display:flex;align-items:center;justify-content:center';
        d.innerHTML =
          '<div style="width:40px;height:40px;border-radius:20px;border:2px solid rgba(22,131,255,.9);background:rgba(22,131,255,.22);box-shadow:0 0 16px rgba(22,131,255,.7);display:flex;align-items:center;justify-content:center"><div style="width:18px;height:18px;border-radius:9px;background:#1683FF;border:3px solid #fff;box-sizing:border-box"></div></div>';
        new maplibregl.Marker({ element: d }).setLngLat([user.longitude, user.latitude]).addTo(m);
      }
      family.forEach((f: any) => {
        if (f.id === 'me') {
          const d = document.createElement('div');
          d.style.cssText = 'display:flex;flex-direction:column;align-items:center;font-family:sans-serif';
          d.innerHTML = '<div style="width:52px;height:52px;border-radius:26px;background:rgba(22,131,255,.2);display:flex;align-items:center;justify-content:center"><div style="width:20px;height:20px;border-radius:10px;background:#1683FF;border:3px solid #fff;box-shadow:0 0 14px #1683FF"></div></div><div style="margin-top:-8px;background:#1683FF;color:#fff;font-size:11px;font-weight:700;padding:2px 9px;border-radius:10px">Sen</div>';
          new maplibregl.Marker({ element: d }).setLngLat([f.longitude, f.latitude]).addTo(m);
          return;
        }
        const c = f.status === 'safe' ? '#14D99A' : f.status === 'help' ? '#FF3548' : f.status === 'waiting' ? '#FF8A24' : '#8FA3B8';
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;flex-direction:column;align-items:center;font-family:sans-serif';
        d.innerHTML = `<div style="width:44px;height:44px;border-radius:22px;border:3px solid ${c};background:#0B1928;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center">${f.name[0]}</div><div style="margin-top:-6px;background:${c};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap">${f.label ?? f.name}</div>`;
        new maplibregl.Marker({ element: d }).setLngLat([f.longitude, f.latitude]).addTo(m);
      });
      (reports ?? []).filter((r: any) => r.category !== 'shake' && r.latitude != null).slice(0, 30).forEach((r: any) => {
        const m = CATEGORY_META[r.category as keyof typeof CATEGORY_META];
        const d = document.createElement('div');
        const ic: Record<string, string> = { damage: '🏚', road: '⚠', help: '!', safe: '✓', other: '…' };
        d.style.cssText = `width:30px;height:30px;border-radius:15px;background:${m.color};border:2px solid rgba(255,255,255,.85);box-shadow:0 0 14px ${m.color}AA;display:flex;align-items:center;justify-content:center;color:#fff;font:bold 14px sans-serif`;
        d.textContent = ic[r.category] ?? '•';
        new maplibregl.Marker({ element: d }).setLngLat([r.longitude, r.latitude]).addTo(m0);
      });
    });
    return () => m.remove();
  }, [mapStyle, focus?.id, reports.length, user?.latitude, family.length]);

  // Fay katmanı açılıp kapanınca yalnızca kaynak verisi değişir.
  useEffect(() => {
    faultsRef.current = faults;
    (map.current?.getSource('faults') as any)?.setData(faultsToGeoJSON(faults));
  }, [faults]);

  // Toplanma alanları değişince haritayı yeniden kurmadan yalnızca kaynağı güncelle (kaydırırken donmasın).
  useEffect(() => {
    pointsRef.current = assemblyPoints;
    const src = map.current?.getSource('assembly') as any;
    src?.setData(assemblyToGeoJSON(assemblyPoints ?? []));
  }, [assemblyPoints]);
  return <View ref={host} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />;
});
