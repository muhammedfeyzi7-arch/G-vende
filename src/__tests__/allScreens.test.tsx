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
    <InboxProvider>
      <ReportsProvider>{ui}</ReportsProvider>
    </InboxProvider>
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

  it('Harita: deprem paneli sekmeleri, katman filtreleri ve Bildirim Ekle', async () => {
    const Map = require('@/app/(tabs)/harita').default;
    const { router } = require('expo-router');
    await open(<Map />);
    expect(screen.getByText(/Canlı akış henüz bağlı değil/)).toBeTruthy();
    // Bildirim Ekle düğmesi akışa kaydırınca görünür.
    expect(screen.queryByLabelText('Bildirim ekle')).toBeNull();
    await fireEvent.scroll(screen.getByTestId('harita-scroll'), { nativeEvent: { contentOffset: { y: 600 } } });
    expect(screen.getByLabelText('Bildirim ekle')).toBeTruthy();
    const checks: [string, RegExp][] = [
      ['Resmî Veriler', /Veri kaynakları/],
      ['Toplanma Alanları', /Size atanan alanı işaretleyin/],
      ['Yardım', /Hayati tehlike varsa 112/],
      ['Detaylar', /Seçili deprem yok/],
    ];
    for (const [tab, expected] of checks) {
      await fireEvent.press(screen.getByRole('tab', { name: tab }));
      expect(screen.getByText(expected)).toBeTruthy();
    }
    expect(screen.queryByLabelText('Bildirim ekle')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Katmanlar'));
    await fireEvent.press(screen.getByLabelText('Son 7 gün depremleri'));
    expect(screen.getByLabelText('Son 7 gün depremleri').props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByLabelText('Tam Ekran'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/harita-tam', params: {} });
  });

  it('Tam ekran harita: liste görünümü', async () => {
    const Screen = require('@/app/harita-tam').default;
    await open(<Screen />);
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

  it('Ailem: üye eklenir, listede durumuyla görünür ve Güvendeyim SMS’i (konumsuz) hazırlanır', async () => {
    const SMS = require('expo-sms');
    await require('@react-native-async-storage/async-storage').setItem(
      'guvende:v1:local-contacts',
      JSON.stringify([{ id: '1', name: 'Ayşe', phone: '+905321234567', relation: 'Annem', status: null }]),
    );
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'Güvendeyim gönder')?.onPress?.());
    const Ailem = require('@/app/(tabs)/ailem').default;
    await open(<Ailem />);
    expect(screen.getAllByText('Annem').length).toBeGreaterThan(0);
    expect(screen.getByText('Ailende 1 kişiden 0’si güvende')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ailende 1 kişiden 0’si güvende'));
    await flush();
    expect(SMS.sendSMSAsync).toHaveBeenCalledWith(['+905321234567'], expect.stringMatching(/^Ben güvendeyim\./));
    expect(SMS.sendSMSAsync.mock.calls[0][1]).not.toMatch(/Konumum/);
    expect(screen.getAllByText('Güvendesin').length).toBeGreaterThan(0);
    alert.mockRestore();
  });

  it('Ailem: davet bağlantısı sunucusuz kurulumda açıklama gösterir; Üye Ekle yönlendirir', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { router } = require('expo-router');
    const Ailem = require('@/app/(tabs)/ailem').default;
    await open(<Ailem />);
    expect(screen.getByText('Henüz aile üyesi eklemediniz')).toBeTruthy();
    await fireEvent.press(screen.getByText('Davet Linki Oluştur'));
    expect(alert).toHaveBeenCalledWith('Davet bağlantısı', expect.stringMatching(/sunucu yapılandırılmadı/), expect.any(Array));
    await fireEvent.press(screen.getByLabelText('Üye ekle'));
    expect(router.push).toHaveBeenCalledWith('/aile/ekle');
    await fireEvent.press(screen.getByRole('tab', { name: 'Aile listesi' }));
  });

  it('Üye ekle: kişiyi cihaza kaydeder', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { router } = require('expo-router');
    const Ekle = require('@/app/aile/ekle').default;
    await open(<Ekle />);
    await fireEvent.changeText(screen.getByLabelText('İsim'), 'Ayşe');
    await fireEvent.changeText(screen.getByLabelText('Telefon'), '0532 123 45 67');
    await fireEvent.changeText(screen.getByLabelText('Yakınlık'), 'Annem');
    await fireEvent.press(screen.getByText('Kaydet'));
    await flush();
    expect(router.back).toHaveBeenCalled();
    const saved = JSON.parse(await AsyncStorage.getItem('guvende:v1:local-contacts'));
    expect(saved[0]).toMatchObject({ name: 'Ayşe', phone: '+905321234567', relation: 'Annem' });
  });

  it('Üye ekle: geçersiz numara reddedilir', async () => {
    const spy = jest.spyOn(Alert, 'alert');
    const Ekle = require('@/app/aile/ekle').default;
    await open(<Ekle />);
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
    ['kimlik', /kimliğinizi bir kez doğrulamanız gerekir/],
    ['guven', /Yalnızca anlık kamera/],
    ['bildirimler', /Bildirim yok/],
    ['akis', /Canlı akış henüz bağlı değil/],
    ['depremler', /Kayıt yok/],
    ['acil-sms', /Hazır mesajlar/],
    ['arama', /Arıza hatları/],
    ['rapor/benim', /Henüz olay bildirmediniz/],
    ['duyurular', /Resmî deprem kayıtları/],
    ['canta', /Hazır olma durumunuz/],
    ['rehber/index', /Yangın/],
    ['saglik-bilgilerim', /Kan grubu/],
    ['acil-mod', /112’yi Ara/],
    ['aile/bulusma', /buluşacağınız yeri/],
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
    await fireEvent.press(screen.getAllByText('Koyu')[0]!);
    await flush();
    expect(JSON.parse(await AsyncStorage.getItem('guvende:v1:settings')).mapStyle).toBe('dark');
  });

  it('Tercihler: açık tema seçilir ve kaydedilir', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const Screen = require('@/app/tercihler').default;
    await open(<Screen />);
    await fireEvent.press(screen.getAllByText('Açık', { exact: true })[1]!);
    await flush();
    expect(JSON.parse(await AsyncStorage.getItem('guvende:v1:settings')).theme).toBe('light');
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

  it('Bildirim Ekle: yol bildiriminde 4 yayın kontrolü, galeriden yükleme yok', async () => {
    const Yeni = require('@/app/rapor/yeni').default;
    await open(<Yeni />);
    await fireEvent.press(screen.getByText('Yol kapanması veya engel'));
    expect(screen.getByText('Yayın kontrolleri')).toBeTruthy();
    expect(screen.getByText(/1\. Kimlik doğrulama/)).toBeTruthy();
    expect(screen.getByText(/Kanıt fotoğrafı gerekli/)).toBeTruthy();
    expect(screen.getByText(/Önce “Geçici Bilgi”/)).toBeTruthy();
    expect(screen.getByLabelText('Fotoğraf çek')).toBeTruthy();
    expect(screen.queryByLabelText('Galeriden seç')).toBeNull();
    expect(screen.getByText('Olay yeri konumu (zorunlu)')).toBeTruthy();
  });

  it('Kimlik doğrulama: geçersiz T.C. no uyarısı, onaysız gönderilemez', async () => {
    const Kimlik = require('@/app/kimlik').default;
    await open(<Kimlik />);
    await fireEvent.changeText(screen.getByLabelText('T.C. kimlik numarası'), '12345678901');
    expect(screen.getByText('Numara geçersiz görünüyor.')).toBeTruthy();
    expect(screen.getByText(/e-Devlet Kapısı ile giriş/)).toBeTruthy();
  });

  it('Hazır mesajlar: kendi mesajını ekler ve kaydeder', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const Screen = require('@/app/acil-sms').default;
    await open(<Screen />);
    await fireEvent.press(screen.getByText('Kendi mesajını ekle'));
    await fireEvent.changeText(screen.getByLabelText('Mesaj başlığı'), 'İşteyim');
    await fireEvent.changeText(screen.getByLabelText('Mesaj metni'), 'İşteyim, iyiyim. {konum}');
    await fireEvent.press(screen.getByText('Kaydet'));
    await flush();
    expect(JSON.parse(await AsyncStorage.getItem('guvende:v1:settings')).customMessages[0]).toMatchObject({ title: 'İşteyim' });
    expect(screen.getByText('İşteyim')).toBeTruthy();
  });

  it('Hazır mesajlar: şablon seçince alıcı paneli açılır', async () => {
    const Screen = require('@/app/acil-sms').default;
    await open(<Screen />);
    await fireEvent.press(screen.getByLabelText(/^Güvendeyim\./));
    expect(screen.getByText(/Alıcılar/)).toBeTruthy();
    expect(screen.getByText('SMS ile gönder')).toBeTruthy();
    expect(screen.getByText('Diğer uygulamalar')).toBeTruthy();
  });

  it('Acil arama: 112 ve arıza hatları aranır', async () => {
    const Screen = require('@/app/arama').default;
    await open(<Screen />);
    await fireEvent.press(screen.getByLabelText('112 Acil Çağrı Merkezi’ni ara'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:112');
    await fireEvent.press(screen.getByLabelText('Doğalgaz acil, 187 ara'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:187');
  });

  it('Bildirim merkezi: filtre sekmeleri', async () => {
    const Screen = require('@/app/bildirimler').default;
    await open(<Screen />);
    await fireEvent.press(screen.getByRole('tab', { name: /Depremler/ }));
    expect(screen.getByText('Bu filtrede bildirim yok')).toBeTruthy();
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
