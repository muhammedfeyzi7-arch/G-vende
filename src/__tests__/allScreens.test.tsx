/**
 * Duman testleri: her sekme ve alt ekran gerçek sağlayıcılarla (AppProvider + ReportsProvider)
 * çökmeden açılıyor mu, temel etkileşimler çalışıyor mu. Yerel modüller taklit edilir.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert, Linking } from 'react-native';
import { AppProvider } from '@/providers/AppProvider';
import { InboxProvider } from '@/providers/InboxProvider';
import { ReportsProvider } from '@/providers/ReportsProvider';

jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useFocusEffect: (cb: () => void | (() => void)) => React.useEffect(cb, [cb]),
    useLocalSearchParams: () => mockParams,
    Stack: { Screen: () => null },
  };
});
let mockParams: Record<string, string> = {};
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
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
}));
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));
jest.mock('expo-device', () => ({ modelName: 'Test Phone', osName: 'iOS', osVersion: '19.0' }));
jest.mock('expo-file-system', () => ({ Directory: jest.fn(), File: jest.fn(), Paths: {} }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
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
    <ReportsProvider>
      <InboxProvider>{ui}</InboxProvider>
    </ReportsProvider>
  </AppProvider>
);
const flush = () => act(async () => new Promise((r) => setTimeout(r, 30)));

async function open(ui: ReactNode) {
  const r = await render(wrap(ui));
  await flush();
  return r;
}

let openURL: jest.SpyInstance;
beforeEach(async () => {
  jest.clearAllMocks();
  await require('@react-native-async-storage/async-storage').clear();
  mockParams = {};
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

describe('alt sekmeler', () => {
  it('Ana Sayfa: başlık, kartlar, hızlı kutular ve bölümler', async () => {
    const { HomeScreen } = require('@/features/home/HomeScreen');
    const { router } = require('expo-router');
    await open(<HomeScreen />);
    expect(screen.getByLabelText('GÜVENDE, Afet Anında Yanınızda')).toBeTruthy();
    expect(screen.getByText('Deprem verisi alınamadı')).toBeTruthy();
    expect(screen.getByText('Ailem Güvende mi?')).toBeTruthy();
    expect(screen.getByText('Son Bildirimler')).toBeTruthy();
    expect(screen.getByText(/Topluluk bildirimleri sunucu bağlantısı gerektirir/)).toBeTruthy();
    expect(screen.getByText('Son Depremler')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('112, Acil Çağrı'));
    expect(openURL).toHaveBeenCalledWith('tel:112');
    await fireEvent.press(screen.getByLabelText('Acil Durum Çantası'));
    expect(router.push).toHaveBeenCalledWith('/canta');
    await fireEvent.press(screen.getByLabelText('Deprem Rehberi'));
    expect(router.push).toHaveBeenCalledWith('/rehber');
    await fireEvent.press(screen.getByLabelText('Bildirimler'));
    expect(router.push).toHaveBeenCalledWith('/bildirimler');
  });

  it('Harita: dönem/büyüklük filtresi ve liste görünümü', async () => {
    const Map = require('@/app/(tabs)/harita').default;
    await open(<Map />);
    await fireEvent.press(screen.getByLabelText('Son 7 gün depremleri'));
    expect(screen.getByLabelText('Son 7 gün depremleri').props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByLabelText('Büyüklük 4 ve üzeri'));
    await fireEvent.press(screen.getByRole('tab', { name: 'Liste' }));
    expect(screen.getByText('Kayıt yok')).toBeTruthy();
  });

  it('Acil Durum: 112, hızlı eylemler, çanta ve rehber', async () => {
    const Acil = require('@/app/(tabs)/acil').default;
    const { router } = require('expo-router');
    const alert = jest.spyOn(Alert, 'alert');
    await open(<Acil />);
    await fireEvent.press(screen.getByLabelText('Hemen ara'));
    expect(openURL).toHaveBeenCalledWith('tel:112');
    await fireEvent.press(screen.getByLabelText('Acil SMS. Hazır mesaj gönder'));
    expect(router.push).toHaveBeenCalledWith('/acil-sms');
    await fireEvent.press(screen.getByLabelText('Aileye Bildir. Herkese durum sor'));
    expect(alert).toHaveBeenCalledWith('Acil durum kişisi yok', expect.any(String), expect.any(Array));
    expect(screen.getByText('ÇÖK')).toBeTruthy();
    expect(screen.getByText('0/15')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('checkbox')[0]!);
    expect(screen.getByText('1/15')).toBeTruthy();
    await fireEvent.press(screen.getByText('Acil Durum Modu'));
    expect(router.push).toHaveBeenCalledWith('/acil-mod');
  });

  it('Ailem: sunucu olmadan kişi eklenir ve Güvendeyim SMS’i (konumsuz) hazırlanır', async () => {
    const SMS = require('expo-sms');
    const Ailem = require('@/app/(tabs)/ailem').default;
    await open(<Ailem />);
    await fireEvent.press(screen.getByText('Elle ekle'));
    await fireEvent.changeText(screen.getByLabelText('İsim'), 'Ayşe');
    await fireEvent.changeText(screen.getByLabelText('Telefon'), '0532 123 45 67');
    await fireEvent.changeText(screen.getByLabelText('Yakınlık'), 'Annem');
    await fireEvent.press(screen.getByText('Kaydet'));
    expect(screen.getByText('Ayşe')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Güvendeyim mesajı gönder'));
    await flush();
    expect(SMS.sendSMSAsync).toHaveBeenCalledWith(['+905321234567'], expect.stringMatching(/^Ben güvendeyim\./));
    expect(SMS.sendSMSAsync.mock.calls[0][1]).not.toMatch(/Konumum/);
    expect(screen.getAllByText(/Güvendeyim/).length).toBeGreaterThan(0);
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

  it('Ayarlar: profil kartı, hızlı kartlar, bildirim tercihleri kalıcı', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const Ayarlar = require('@/app/(tabs)/ayarlar').default;
    const { router } = require('expo-router');
    await open(<Ayarlar />);
    expect(screen.getByText('Profilinizi oluşturun')).toBeTruthy();
    expect(screen.getByLabelText('Konum Paylaşımı: Kapalı')).toBeTruthy();
    const sw = screen.getByLabelText('Topluluk bildirimleri');
    expect(sw.props.value).toBe(false);
    await fireEvent(sw, 'valueChange', true);
    await flush();
    const saved = JSON.parse(await AsyncStorage.getItem('guvende:v1:settings'));
    expect(saved.communityNotifications).toBe(true);
    await fireEvent.press(screen.getByText('Yardım Merkezi'));
    expect(router.push).toHaveBeenCalledWith('/yardim');
  });

  it('Ayarlar: biyometrik desteklenmiyorsa açıklama gösterir, açmaz', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const Ayarlar = require('@/app/(tabs)/ayarlar').default;
    await open(<Ayarlar />);
    await fireEvent(screen.getByLabelText('Biyometrik giriş'), 'valueChange', true);
    await flush();
    expect(alert).toHaveBeenCalledWith('Biyometrik giriş kullanılamıyor', expect.stringMatching(/donanımı yok/));
    expect(screen.getByLabelText('Biyometrik giriş').props.value).toBe(false);
  });
});

describe('alt ekranlar', () => {
  it.each([
    ['toplanma/index', /Size atanan toplanma alanı/],
    ['konum', /veya ilinizi seçin/],
    ['giris', /Bu kurulumda hesap gerekmiyor/],
    ['rapor/bekleyen', /Bekleyen gönderi yok/],
    ['rapor/yeni', /Ne bildirmek istiyorsunuz/],
    ['profil', /Profilde konumumu göster/],
    ['hesap', /Misafir kullanım/],
    ['gizlilik/index', /Konumumu ailemle paylaş/],
    ['gizlilik/gizle', /Kişi yok/],
    ['guvenlik', /Şifre kullanılmıyor/],
    ['tercihler', /Harita görünümü/],
    ['bildirim-ayarlari', /erken uyarı sistemi değildir/],
    ['yardim', /Sık sorulan sorular/],
    ['geri-bildirim', /Hata, öneri/],
    ['hakkinda', /Veri kaynakları/],
    ['bildirimler', /Bildirim yok/],
    ['akis', /Canlı akış henüz bağlı değil/],
    ['depremler', /Kayıt yok/],
    ['acil-sms', /Hazır mesajlar/],
    ['duyurular', /Resmî deprem kayıtları/],
    ['canta', /Hazır olma durumunuz/],
    ['rehber/index', /Yangın/],
    ['saglik-bilgilerim', /Kan grubu/],
    ['acil-mod', /112’yi Ara/],
  ])('%s açılır', async (route, expected) => {
    const Screen = require(`@/app/${route}`).default;
    await open(<Screen />);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });

  it('rehber detayı açılır', async () => {
    mockParams = { id: 'fire' };
    const Screen = require('@/app/rehber/[id]').default;
    await open(<Screen />);
    expect(screen.getByText(/Yangını fark ederseniz/)).toBeTruthy();
  });

  it('Tercihler: harita görünümü seçilir ve kaydedilir', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const Screen = require('@/app/tercihler').default;
    await open(<Screen />);
    await fireEvent.press(screen.getByText('Uydu'));
    await flush();
    expect(JSON.parse(await AsyncStorage.getItem('guvende:v1:settings')).mapStyle).toBe('satellite');
  });

  it('Gizlilik: konum paylaşımı onayla açılır ve durdurulur', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'Aç')?.onPress?.());
    const Screen = require('@/app/gizlilik/index').default;
    await open(<Screen />);
    await fireEvent(screen.getByLabelText('Konumumu ailemle paylaş'), 'valueChange', true);
    expect(screen.getByText('Konum paylaşımını durdur')).toBeTruthy();
    await fireEvent.press(screen.getByText('Konum paylaşımını durdur'));
    expect(screen.queryByText('Konum paylaşımını durdur')).toBeNull();
    alert.mockRestore();
  });

  it('Acil Durum Modu: düdük çalar ve durur', async () => {
    const Screen = require('@/app/acil-mod').default;
    await open(<Screen />);
    await fireEvent.press(screen.getByLabelText('Düdük. Yerini duyur'));
    expect(mockPlayer.play).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Düdüğü durdur. Yerini duyur'));
    expect(mockPlayer.pause).toHaveBeenCalled();
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
