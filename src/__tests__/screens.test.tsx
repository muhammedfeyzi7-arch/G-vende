import { fireEvent, render, screen } from '@testing-library/react-native';
import { LiveFeedTab } from '@/features/home/tabs';
import { DEFAULT_LAYERS, QuakeMap } from '@/features/map/QuakeMap';
import { buildSampleReports } from '@/features/reports/sampleReports';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/services/supabase', () => ({ requireSupabase: jest.fn(), friendlyError: (e: Error) => e.message }));

let mockFailNext = true;
jest.mock('@maplibre/maplibre-react-native', () => {
  const { View } = require('react-native');
  const { forwardRef } = require('react');
  return {
    Map: ({ onDidFailLoadingMap, children }: { onDidFailLoadingMap: () => void; children: React.ReactNode }) => {
      // İlk yüklemede hata simülasyonu, tekrar denemede başarı
      const { useEffect: ue } = require('react');
      ue(() => {
        if (mockFailNext) {
          mockFailNext = false;
          onDidFailLoadingMap();
        }
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
  it('harita yüklenemezse hata ve tekrar dene gösterir; tekrar denemede haritayı yeniden kurar', async () => {
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
    await fireEvent.press(screen.getByText('Tekrar dene'));
    expect(screen.getByTestId('maplibre-map')).toBeTruthy();
    expect(screen.queryByText('Harita yüklenemedi')).toBeNull();
  });
});

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

  it('geliştirme örnek verisi açıkça etiketlenir', async () => {
    await render(<LiveFeedTab {...feedProps} status="not-configured" reports={buildSampleReports()} />);
    expect(screen.getAllByText('ÖRNEK VERİ').length).toBeGreaterThan(0);
    expect(screen.getByText(/ÖRNEK VERİDİR/)).toBeTruthy();
  });

  it('kategori filtresi uygulanır', async () => {
    await render(<LiveFeedTab {...feedProps} filter="road" reports={buildSampleReports().map((r) => ({ ...r, isSample: false }))} />);
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
