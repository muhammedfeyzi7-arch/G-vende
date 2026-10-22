import { fireEvent, render, screen } from '@testing-library/react-native';
import { AlertCard } from '@/features/earthquakes/components/AlertCard';
import { CategoryChips } from '@/features/reports/components/CategoryChips';
import type { EarthquakeEvent } from '@/types/earthquake';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const event: EarthquakeEvent = (() => {
  const primary = {
    source: 'afad' as const,
    sourceEventId: '1',
    magnitude: 4.8,
    magnitudeType: 'ML',
    latitude: 40.77,
    longitude: 30.99,
    depthKm: 10,
    occurredAt: new Date(Date.now() - 4 * 60000).toISOString(),
    sourceUpdatedAt: null,
    fetchedAt: new Date().toISOString(),
    place: 'Gölyaka (Düzce)',
    url: null,
    reviewStatus: 'reviewed' as const,
  };
  return { id: 'afad:1', primary, readings: [primary] };
})();

describe('AlertCard', () => {
  it('olay yokken sakin durum gösterir, sahte alarm üretmez', async () => {
    await render(<AlertCard state={{ kind: 'none' }} loading={false} error={null} />);
    expect(screen.getByText('Son depremler ve bölgesel durum')).toBeTruthy();
    expect(screen.queryByText(/deprem oluyor/i)).toBeNull();
    expect(screen.queryByText('Büyüklük')).toBeNull();
  });

  it('önemli olayda kaynak ve büyüklük türüyle uyarı gösterir', async () => {
    await render(<AlertCard state={{ kind: 'recent-significant', event, distanceKm: 38, minutesAgo: 4 }} loading={false} error={null} />);
    expect(screen.getByText('Deprem kaydedildi')).toBeTruthy();
    expect(screen.getByText(/4 dk önce · Artçılar/)).toBeTruthy();
    expect(screen.getByText('4,8')).toBeTruthy();
    expect(screen.getByText('Büyüklük (ML)')).toBeTruthy();
    expect(screen.getByText('AFAD')).toBeTruthy();
    // Büyüklük, "şiddet" olarak etiketlenmez
    expect(screen.queryByText(/şiddet/i)).toBeNull();
  });

  it('kaynak hatasını gösterir', async () => {
    await render(<AlertCard state={{ kind: 'none' }} loading={false} error="Deprem kaynaklarına şu anda ulaşılamıyor." />);
    expect(screen.getByText('Deprem verisi alınamadı')).toBeTruthy();
  });
});

describe('CategoryChips', () => {
  it('filtre değişimini bildirir ve seçili durumu işaretler', async () => {
    const onChange = jest.fn();
    await render(<CategoryChips value="all" onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Hasar filtresi'));
    expect(onChange).toHaveBeenCalledWith('damage');
    expect(screen.getByLabelText('Tümü filtresi').props.accessibilityState).toMatchObject({ selected: true });
  });
});
