import { fireEvent, render, screen } from '@testing-library/react-native';
import type { UserReport } from '@/types/report';
import { LiveFeedTab } from '@/features/home/tabs';
import { DEFAULT_LAYERS, QuakeMap } from '@/features/map/QuakeMap';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/services/supabase', () => ({ requireSupabase: jest.fn(), friendlyError: (e: Error) => e.message }));

let mockFailAll = true;
let mockMountedStyles: unknown[] = [];
jest.mock('@maplibre/maplibre-react-native', () => {
  const { View } = require('react-native');
  const { forwardRef } = require('react');
  return {
    Map: ({
      onDidFailLoadingMap,
      mapStyle,
      children,
    }: {
      onDidFailLoadingMap: () => void;
      mapStyle: unknown;
      children: React.ReactNode;
    }) => {
      // mockFailAll iken her stil yüklemesi başarısız olur
      const { useEffect: ue } = require('react');
      ue(() => {
        mockMountedStyles.push(mapStyle);
        if (mockFailAll) onDidFailLoadingMap();
      }, []);
      return <View testID="maplibre-map">{children}</View>;
    },
    Camera: forwardRef(() => null),
    GeoJSONSource: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Layer: () => null,
    Marker: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe('QuakeMap', () => {
  it('önce yedek stili dener; hepsi başarısızsa hata ve tekrar dene gösterir', async () => {
    await render(
      <QuakeMap
        events={[]}
        focus={null}
        reports={[]}
        assemblyPoints={[]}
        user={null}
        userIsPrecise={false}
        layers={DEFAULT_LAYERS}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Harita yüklenemedi')).toBeTruthy();
    // Seçili stil ardından ağ kaynağı kullanmayan çevrimdışı altlık denendi
    expect(mockMountedStyles).toHaveLength(2);
    expect(typeof mockMountedStyles[0]).toBe('object');
    const offline = mockMountedStyles[1] as { sources: Record<string, { type: string }> };
    expect(Object.values(offline.sources).every((s) => s.type === 'geojson')).toBe(true);
    mockFailAll = false;
    await fireEvent.press(screen.getByText('Tekrar dene'));
    expect(screen.getByTestId('maplibre-map')).toBeTruthy();
    expect(screen.queryByText('Harita yüklenemedi')).toBeNull();
  });
});

/** Yalnızca test girdisi (uygulamaya dahil değil). */
const testReport = (id: string, category: UserReport['category'], description: string): UserReport => ({
  id,
  category,
  feltIntensity: null,
  description,
  latitude: 40.84,
  longitude: 31.16,
  areaLabel: 'Test bölgesi',
  earthquakeEventId: null,
  verification: 'unverified',
  helpfulCount: 0,
  confirmCount: 0,
  denyCount: 0,
  authorRole: null,
  authorOrg: null,
  createdAt: new Date().toISOString(),
  media: [],
});
const FILTER_REPORTS = [testReport('r1', 'road', 'Yolda geçiş engeli var.'), testReport('r2', 'safe', 'Güvendeyiz.')];

const feedProps = {
  filter: 'all' as const,
  onFilter: jest.fn(),
  status: 'ready',
  error: null,
  lastSyncedAt: null,
  pending: [],
  helpful: new Set<string>(),
  onHelpful: jest.fn(),
  onRetry: jest.fn(),
  online: true,
};

describe('LiveFeedTab', () => {
  it('backend yokken sahte kayıt göstermez', async () => {
    await render(<LiveFeedTab {...feedProps} status="not-configured" reports={[]} />);
    expect(screen.getByText('Canlı akış henüz bağlı değil')).toBeTruthy();
  });

  it('kategori filtresi uygulanır', async () => {
    await render(<LiveFeedTab {...feedProps} filter="road" reports={FILTER_REPORTS} />);
    expect(screen.getByText('Yolda geçiş engeli var.')).toBeTruthy();
    expect(screen.queryByText('Güvendeyiz.')).toBeNull();
  });

  it('bekleyen gönderiler yayınlanmış gibi gösterilmez', async () => {
    const pending = [
      {
        clientId: 'x',
        category: 'safe' as const,
        feltIntensity: null,
        description: '',
        location: null,
        areaLabel: null,
        earthquakeEventId: null,
        photos: [],
        device: null,
        createdAt: new Date().toISOString(),
        attempts: 1,
        lastError: 'Bağlantı yok',
        serverId: null,
      },
    ];
    await render(<LiveFeedTab {...feedProps} reports={[]} pending={pending} />);
    expect(screen.getByText('1 bildirim gönderilmeyi bekliyor (henüz yayınlanmadı).')).toBeTruthy();
    expect(screen.getByText('Bu kategoride bildirim yok')).toBeTruthy();
  });

  it('akış hatasında tekrar dene sunar', async () => {
    const onRetry = jest.fn();
    await render(<LiveFeedTab {...feedProps} status="error" error="Bağlantı kurulamadı." reports={[]} onRetry={onRetry} />);
    await fireEvent.press(screen.getByText('Tekrar dene'));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('Expo Go yedek haritası', () => {
  it('yerel modül olmadan çizilir; Mercator dönüşümü tutarlı', async () => {
    const { SvgQuakeMap } = require('@/features/map/SvgQuakeMap');
    const { View } = require('react-native');
    const onSelect = jest.fn();
    await render(
      <View style={{ width: 400, height: 300 }}>
        <SvgQuakeMap
          events={[]}
          focus={null}
          reports={[]}
          assemblyPoints={[{ id: 'a1', name: 'Örnek Park', latitude: 40.84, longitude: 31.16, distanceKm: 1, isUserSaved: true } as never]}
          user={null}
          userIsPrecise={false}
          layers={DEFAULT_LAYERS}
          onSelect={onSelect}
          initialCenter={{ latitude: 40.84, longitude: 31.16 }}
          initialZoom={8}
        />
      </View>,
    );
    expect(screen.getByLabelText('Deprem haritası (basit görünüm)')).toBeTruthy();
    expect(screen.getByLabelText('Yakınlaştır')).toBeTruthy();
    const { toWorld, fromWorld } = require('@/features/map/SvgQuakeMap');
    const back = fromWorld(...toWorld(31.16, 40.84));
    expect(back.latitude).toBeCloseTo(40.84, 6);
    expect(back.longitude).toBeCloseTo(31.16, 6);
  });
});
