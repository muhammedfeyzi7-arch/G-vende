/**
 * Duman testleri: her sekme ve alt ekran gerçek sağlayıcılarla (AppProvider + ReportsProvider)
 * çökmeden açılıyor mu, temel etkileşimler çalışıyor mu. Yerel modüller taklit edilir.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { AppProvider } from '@/providers/AppProvider';
import { ReportsProvider } from '@/providers/ReportsProvider';

jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useFocusEffect: (cb: () => void | (() => void)) => React.useEffect(cb, [cb]),
    useLocalSearchParams: () => ({}),
    Stack: { Screen: () => null },
  };
});
jest.mock('expo-router/js-tabs', () => ({ useBottomTabBarHeight: () => 60 }));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', canAskAgain: true, granted: false })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied', canAskAgain: false, granted: false })),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(async () => []),
  Accuracy: { Balanced: 3 },
}));
jest.mock('expo-sms', () => ({ isAvailableAsync: jest.fn(async () => true), sendSMSAsync: jest.fn(async () => ({ result: 'sent' })) }));
jest.mock('expo-contacts/legacy', () => ({ presentContactPickerAsync: jest.fn(async () => null) }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 's', Warning: 'w' },
  ImpactFeedbackStyle: { Heavy: 'h' },
}));
const mockPlayer = { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), loop: false, volume: 0 };
jest.mock('expo-audio', () => ({ useAudioPlayer: () => mockPlayer, setAudioModeAsync: jest.fn(async () => {}) }));
jest.mock('expo-notifications', () => ({}));
jest.mock('expo-secure-store', () => ({}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-image-manipulator', () => ({}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid' }));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, style }: { children?: ReactNode; style?: object }) => <View style={style}>{children}</View> };
});
jest.mock('@maplibre/maplibre-react-native', () => {
  const { View } = require('react-native');
  const { forwardRef } = require('react');
  return {
    Map: forwardRef(({ children }: { children: ReactNode }, _ref: unknown) => <View testID="map">{children}</View>),
    Camera: forwardRef(() => null),
    GeoJSONSource: ({ children }: { children: ReactNode }) => <>{children}</>,
    Layer: () => null,
    Marker: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});
// Ağ yok: tüm kaynak istekleri başarısız olur (uygulama bunu "ulaşılamadı" olarak göstermeli).
global.fetch = jest.fn(async () => {
  throw new Error('Network request failed');
}) as unknown as typeof fetch;

const wrap = (ui: ReactNode) => (
  <AppProvider>
    <ReportsProvider>{ui}</ReportsProvider>
  </AppProvider>
);
const flush = () => act(async () => new Promise((r) => setTimeout(r, 30)));

async function open(ui: ReactNode) {
  const r = await render(wrap(ui));
  await flush();
  return r;
}

beforeEach(() => jest.clearAllMocks());

describe('alt sekmeler', () => {
  it('Ana Sayfa: beş üst sekme ve her birinin içeriği açılır', async () => {
    const { HomeScreen } = require('@/features/home/HomeScreen');
    await open(<HomeScreen />);
    expect(screen.getByText('Deprem verisi alınamadı')).toBeTruthy();
    const checks: [string, RegExp][] = [
      ['Resmî Veriler', /Veri kaynakları/],
      ['Toplanma Alanları', /Size atanan alanı işaretleyin/],
      ['Yardım', /Hayati tehlike varsa 112/],
      ['Detaylar', /Seçili deprem yok/],
      ['Canlı Akış', /Canlı akış henüz bağlı değil/],
    ];
    for (const [tab, expected] of checks) {
      await fireEvent.press(screen.getByRole('tab', { name: tab }));
      expect(screen.getByText(expected)).toBeTruthy();
    }
  });

  it('Ana Sayfa: Bildirim Ekle düğmesi yalnızca Canlı Akış’ta ve Yardım’da 112’yi kapatmaz', async () => {
    const { HomeScreen } = require('@/features/home/HomeScreen');
    await open(<HomeScreen />);
    expect(screen.getByLabelText('Bildirim ekle')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Yardım' }));
    expect(screen.queryByLabelText('Bildirim ekle')).toBeNull();
  });

  it('Harita sekmesi açılır, dönem filtresi değişir', async () => {
    const Map = require('@/app/(tabs)/harita').default;
    await open(<Map />);
    await fireEvent.press(screen.getByLabelText('Son 7 gün depremleri'));
    expect(screen.getByLabelText('Son 7 gün depremleri').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('Acil Durum: 112, düdük ve talimatlar çalışır', async () => {
    const Acil = require('@/app/(tabs)/acil').default;
    await open(<Acil />);
    expect(screen.getByText('112’yi ara')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Düdük'));
    expect(mockPlayer.play).toHaveBeenCalled();
    expect(mockPlayer.loop).toBe(true);
    await fireEvent.press(screen.getByLabelText('Düdüğü durdur'));
    expect(mockPlayer.pause).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Deprem sonrası'));
    expect(screen.getByText(/Gaz kokusu varsa/)).toBeTruthy();
  });

  it('Ailem: sunucu olmadan kişi eklenir ve Güvendeyim SMS’i hazırlanır', async () => {
    const SMS = require('expo-sms');
    const Ailem = require('@/app/(tabs)/ailem').default;
    await open(<Ailem />);
    expect(screen.getByText('Acil durum kişilerim')).toBeTruthy();
    await fireEvent.press(screen.getByText('Elle ekle'));
    await fireEvent.changeText(screen.getByLabelText('İsim'), 'Annem');
    await fireEvent.changeText(screen.getByLabelText('Telefon'), '0532 123 45 67');
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(screen.getByText('0532 123 45 67')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Güvendeyim mesajı gönder'));
    await flush();
    expect(SMS.sendSMSAsync).toHaveBeenCalledWith(['+905321234567'], expect.stringMatching(/^Ben güvendeyim\./));
  });

  it('Ailem: geçersiz numara reddedilir', async () => {
    const spy = jest.spyOn(Alert, 'alert');
    const Ailem = require('@/app/(tabs)/ailem').default;
    await open(<Ailem />);
    await fireEvent.press(screen.getByText('Elle ekle'));
    await fireEvent.changeText(screen.getByLabelText('İsim'), 'X');
    await fireEvent.changeText(screen.getByLabelText('Telefon'), '123');
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(spy).toHaveBeenCalledWith('Eklenemedi', 'Telefon numarası geçersiz.');
  });

  it('Ayarlar açılır ve ayar değişir', async () => {
    const Ayarlar = require('@/app/(tabs)/ayarlar').default;
    await open(<Ayarlar />);
    const sw = screen.getByLabelText('Aile bilgilerini çevrimdışı erişim için cihazda sakla');
    expect(sw.props.value).toBe(false);
    await fireEvent(sw, 'valueChange', true);
    expect(screen.getByLabelText('Aile bilgilerini çevrimdışı erişim için cihazda sakla').props.value).toBe(true);
  });
});

describe('alt ekranlar', () => {
  it.each([
    ['toplanma/index', /Size atanan toplanma alanı/],
    ['konum', /veya ilinizi seçin/],
    ['giris', /Bu kurulumda hesap gerekmiyor/],
    ['rapor/bekleyen', /Bekleyen gönderi yok/],
    ['rapor/yeni', /Ne bildirmek istiyorsunuz/],
  ])('%s açılır', async (route, expected) => {
    const Screen = require(`@/app/${route}`).default;
    await open(<Screen />);
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('Bildirim Ekle: Güvendeyim seçilince sunucusuz SMS seçeneği çıkar', async () => {
    const Yeni = require('@/app/rapor/yeni').default;
    await open(<Yeni />);
    await fireEvent.press(screen.getByText('Güvendeyim'));
    expect(screen.getByText(/Acil kişilerime SMS gönder/)).toBeTruthy();
    expect(screen.getByText(/Herkese açık yayın için sunucu bağlantısı gerekli/)).toBeTruthy();
  });

  it('İl seçimi konumu ayarlar', async () => {
    const Konum = require('@/app/konum').default;
    await open(<Konum />);
    await fireEvent.changeText(screen.getByLabelText('İl ara'), 'düz');
    await fireEvent.press(screen.getByText('Düzce'));
    const { router } = require('expo-router');
    expect(router.back).toHaveBeenCalled();
  });
});
