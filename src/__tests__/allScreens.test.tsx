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
  it('Ana Sayfa: referans düzeni, gerçek veri durumu ve yönlendirmeler', async () => {
    const { HomeScreen } = require('@/features/home/HomeScreen');
    const { router } = require('expo-router');
    await open(<HomeScreen />);
    expect(screen.getByLabelText('GÜVENDE, Afet Anında Yanınızda')).toBeTruthy();
    for (const t of ['Şu an deprem var mı?', 'Yakınımdaki risk durumu', 'Ailem', 'Acil durum çantam', 'Son gelişmeler'])
      expect(screen.getByText(t)).toBeTruthy();
    // Veri yokken kesin "deprem yok" denmez
    expect(screen.queryByText(/deprem kaydı yok/)).toBeNull();
    expect(screen.getByText(/Deprem verisi alınamadı|Deprem verileri yükleniyor|Veriler güncel olmayabilir/)).toBeTruthy();
    expect(screen.getByText('0/15 tamamlandı')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Acil Durum. Yardıma mı ihtiyacınız var?'));
    expect(router.push).toHaveBeenCalledWith('/acil');
    await fireEvent.press(screen.getByLabelText('112 Acil Çağrı'));
    expect(openURL).toHaveBeenCalledWith('tel:112');
    await fireEvent.press(screen.getByLabelText('Acil Araçlar. İtfaiye · Polis · Sağlık'));
    expect(router.push).toHaveBeenCalledWith('/acil-araclar');
    await fireEvent.press(screen.getByLabelText('Enkaz Altı Modu. Siren · Flaş · Rehber'));
    expect(router.push).toHaveBeenCalledWith('/enkaz');
    await fireEvent.press(screen.getByLabelText('Haritayı Aç'));
    expect(router.push).toHaveBeenCalledWith('/harita');
    await fireEvent.press(screen.getByLabelText('Ailem. Sevdiklerinizin durumunu takip edin.'));
    expect(router.push).toHaveBeenCalledWith('/ailem');
    await fireEvent.press(screen.getByLabelText('Acil durum çantam. 0/15 tamamlandı'));
    expect(router.push).toHaveBeenCalledWith('/canta');
    await fireEvent.press(screen.getByLabelText('Bildirimler'));
    expect(router.push).toHaveBeenCalledWith('/bildirimler');
  });

  it('Ana Sayfa: 112 açılamazsa kullanıcıya söylenir, başarı iddia edilmez', async () => {
    const { HomeScreen } = require('@/features/home/HomeScreen');
    const alert = jest.spyOn(Alert, 'alert');
    openURL.mockRejectedValueOnce(new Error('no tel'));
    await open(<HomeScreen />);
    await fireEvent.press(screen.getByLabelText('112 Acil Çağrı'));
    await flush();
    expect(alert).toHaveBeenCalledWith('Arama ekranı açılamadı', expect.stringMatching(/112/));
  });

  it('Harita: başlık, arama, katman çipleri, araçlar ve liste sekmeleri (gerçek veri yokken boş durumlar)', async () => {
    const Map = require('@/app/(tabs)/harita').default;
    const { router } = require('expo-router');
    const alert = jest.spyOn(Alert, 'alert');
    await open(<Map />);
    expect(screen.getByText('Harita')).toBeTruthy();
    expect(screen.getByText('Güvenli alanlara daha hızlı ulaşın.')).toBeTruthy();
    expect(screen.getByLabelText('Adres, mahalle veya ilçe ara')).toBeTruthy();
    // Konum yok: yakındakiler için uydurma alan yerine konum istenir
    expect(screen.getByText('Yakındaki alanlar için konum gerekli.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Konum seç'));
    expect(router.push).toHaveBeenCalledWith('/konum');
    // Kaynağı olmayan katmanlar uydurma işaret göstermez
    await fireEvent.press(screen.getByLabelText('Hastaneler: veri yok'));
    expect(alert).toHaveBeenCalledWith('Hastane verisi yok', expect.stringMatching(/Uydurma işaret gösterilmez/));
    // Toplanma alanları çipi katmanı kapatır/açar
    const chip = screen.getByLabelText('Toplanma Alanları');
    expect(chip.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(chip);
    expect(screen.getByLabelText('Toplanma Alanları').props.accessibilityState).toMatchObject({ checked: false });
    // Rota Çiz: hedef yokken rota hesaplandı izlenimi verilmez
    await fireEvent.press(screen.getByLabelText('Rota Çiz'));
    expect(alert).toHaveBeenCalledWith('Hedef alan yok', expect.any(String));
    // Filtrele paneli: zaman filtresi
    await fireEvent.press(screen.getByLabelText('Filtrele'));
    await fireEvent.press(screen.getByLabelText('Son 7 gün depremleri'));
    expect(screen.getByLabelText('Son 7 gün depremleri').props.accessibilityState).toMatchObject({ selected: true });
    // Liste sekmeleri
    await fireEvent.press(screen.getByRole('tab', { name: 'Favorilerim' }));
    expect(screen.getByText(/Favori alan yok/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Rota Geçmişi' }));
    expect(screen.getByText(/Henüz yol tarifi açmadınız/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Tümü' }));
    expect(screen.getByText(/yakınlaştırın/)).toBeTruthy();
    // Liste görünümü
    await fireEvent.press(screen.getByLabelText('Liste görünümü'));
    expect(screen.getByLabelText('Harita görünümü')).toBeTruthy();
    await fireEvent.press(screen.getByText('Olay bildirimleri'));
    expect(router.push).toHaveBeenCalledWith('/akis');
  });

  it('Tam ekran harita: liste görünümü', async () => {
    const Screen = require('@/app/harita-tam').default;
    await open(<Screen />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Liste' }));
    expect(screen.getByText('Kayıt yok')).toBeTruthy();
  });

  it('Acil Durum sekmesi: 112 önce, hizmet kartları 112’yi arar, araçlar ve rehber', async () => {
    const Acil = require('@/app/(tabs)/acil').default;
    const { router } = require('expo-router');
    await open(<Acil />);
    await fireEvent.press(screen.getByLabelText('112 Acil Çağrı. Hemen arayın. Polis, itfaiye, sağlık ve AFAD'));
    expect(openURL).toHaveBeenLastCalledWith('tel:112');
    // Hizmet kartları ayrı numara uydurmaz; hepsi 112
    for (const s of ['Polis', 'İtfaiye', 'Sağlık']) {
      openURL.mockClear();
      await fireEvent.press(screen.getByLabelText(`${s}: 112'yi ara`));
      expect(openURL).toHaveBeenCalledWith('tel:112');
    }
    await fireEvent.press(screen.getByLabelText("AFAD resmî internet sitesi. Acil yardım için 112'yi arayın"));
    expect(openURL).toHaveBeenLastCalledWith('https://www.afad.gov.tr');
    await fireEvent.press(screen.getByLabelText('Enkaz Altı Modu. İnternetsiz siren ve flaş'));
    expect(router.push).toHaveBeenCalledWith('/enkaz');
    await fireEvent.press(screen.getByLabelText('Fener. Cihazınızın fenerini açın'));
    expect(router.push).toHaveBeenCalledWith('/isik?led=1');
    await fireEvent.press(screen.getByLabelText('Acil SMS. Hazır mesajlarla yardım isteyin'));
    expect(router.push).toHaveBeenCalledWith('/acil-sms');
    await fireEvent.press(screen.getByLabelText('Toplanma Alanları. Yakınınızdaki güvenli alanlar'));
    expect(router.push).toHaveBeenCalledWith('/harita');
    await fireEvent.press(screen.getByLabelText('Deprem anında ne yapmalıyım?. Çök · Kapan · Tutun'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/rehber/[id]', params: { id: 'during-indoor' } });
    await fireEvent.press(screen.getByLabelText('Enkaz altında kaldım. Sakin kalın, yardım sinyali verin'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/rehber/[id]', params: { id: 'trapped' } });
    await fireEvent.press(screen.getByLabelText('Acil Durum Araçları: tümünü gör'));
    expect(router.push).toHaveBeenCalledWith('/acil-araclar');
    await fireEvent.press(screen.getByLabelText('Acil Durum Rehberi: tümünü gör'));
    expect(router.push).toHaveBeenCalledWith('/rehber');
  });

  it('Acil Durum: 112 açılamazsa kullanıcıya söylenir', async () => {
    const Acil = require('@/app/(tabs)/acil').default;
    const alert = jest.spyOn(Alert, 'alert');
    openURL.mockRejectedValueOnce(new Error('no tel'));
    await open(<Acil />);
    await fireEvent.press(screen.getByLabelText('112 Acil Çağrı. Hemen arayın. Polis, itfaiye, sağlık ve AFAD'));
    await flush();
    expect(alert).toHaveBeenCalledWith('Arama ekranı açılamadı', expect.stringMatching(/112/));
  });

  it('Acil Durum: konum paylaşımı kullanıcı başlatır; konum yoksa paylaşım yapılmaz', async () => {
    const Acil = require('@/app/(tabs)/acil').default;
    const alert = jest.spyOn(Alert, 'alert');
    await open(<Acil />);
    await fireEvent.press(screen.getByLabelText('Konum paylaş'));
    await flush();
    expect(alert).toHaveBeenCalledWith('Konum alınamadı', expect.any(String), expect.any(Array));
  });

  it('Rehber merkezi (/rehber) rehber ekranını açar', async () => {
    const Screen = require('@/app/rehber/index').default;
    await open(<Screen />);
    expect(screen.getByText('Acil Durum Rehberi')).toBeTruthy();
  });

  it('Acil araçlar: 112, hızlı eylemler, çanta', async () => {
    const Screen = require('@/app/acil-araclar').default;
    const { router } = require('expo-router');
    const alert = jest.spyOn(Alert, 'alert');
    await open(<Screen />);
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

  it('Rehber kategorisi: hazırlık ilerlemesi ve grup satırları', async () => {
    mockParams = { id: 'before' };
    const Screen = require('@/app/rehber/kategori/[id]').default;
    const { router } = require('expo-router');
    await open(<Screen />);
    expect(screen.getByText('Deprem öncesi hazırlık')).toBeTruthy();
    expect(screen.getByText('%0')).toBeTruthy();
    expect(screen.getByText(/adımın 0'ı tamamlandı\./)).toBeTruthy();
    for (const t of ['Ev güvenliği', 'Acil durum çantası', 'Aile iletişim ve buluşma planı', 'Eşya ve mobilya güvenliği', 'Özel ihtiyaçlar'])
      expect(screen.getByText(t)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/^Eşya ve mobilya güvenliği\. 0\/5/));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/rehber/hazirlik', params: { grup: 'furniture' } });
    await fireEvent.press(screen.getByLabelText('Devam et: Ev güvenliği'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/rehber/hazirlik', params: { grup: 'home' } });
    mockParams = {};
  });

  it('Rehber kategorisi: konu satırları konuya gider; bilinmeyen bölüm açılmaz', async () => {
    mockParams = { id: 'outside' };
    const Screen = require('@/app/rehber/kategori/[id]').default;
    const { router } = require('expo-router');
    await open(<Screen />);
    await fireEvent.press(screen.getByLabelText(/^Araçtaysanız\./));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/rehber/[id]', params: { id: 'during-vehicle' } });
    mockParams = { id: 'yok' };
    await open(<Screen />);
    expect(screen.getByText('Bölüm bulunamadı')).toBeTruthy();
    mockParams = {};
  });

  it('Ailem: uzun basınca hızlı işlemler; Güvende işaretlenir', async () => {
    await require('@react-native-async-storage/async-storage').setItem(
      'guvende:v1:local-contacts',
      JSON.stringify([{ id: '1', name: 'Ayşe', phone: '+905321234567', relation: 'Annem', status: null }]),
    );
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'Güvende işaretle')?.onPress?.());
    const Ailem = require('@/app/(tabs)/ailem').default;
    await open(<Ailem />);
    await fireEvent(screen.getByLabelText(/^Annem: (Bilinmiyor|Yanıtsız)/), 'longPress');
    await flush();
    expect(alert.mock.calls[0]?.[2]?.map((b) => b.text)).toEqual(['Ara', 'Durum sor (SMS)', 'Güvende işaretle', 'Evde işaretle', 'Vazgeç']);
    expect(screen.getByText('Ailende 1 kişiden 1’i güvende')).toBeTruthy();
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
    expect(screen.getAllByText('Güvendeyim').length).toBeGreaterThan(0);
    alert.mockRestore();
  });

  it('Ailem: boşken uydurma kişi yok; hızlı eylemler, buluşma noktası ve plan bağlantıları', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { router } = require('expo-router');
    const Ailem = require('@/app/(tabs)/ailem').default;
    await open(<Ailem />);
    expect(screen.getByText('Aile üyelerinizin durumunu takip edin')).toBeTruthy();
    expect(screen.getByText(/harita burada görünür/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Üye ekle'));
    expect(router.push).toHaveBeenCalledWith('/aile/ekle');
    await fireEvent.press(screen.getByLabelText('Konum İste. SMS ile konum sor'));
    expect(alert).toHaveBeenCalledWith('Acil durum kişisi yok', expect.any(String), expect.any(Array));
    await fireEvent.press(screen.getByLabelText('Arama Yap. Aile üyelerini ara'));
    expect(router.push).toHaveBeenCalledWith('/arama');
    await fireEvent.press(screen.getByLabelText('Buluşma noktasını belirle'));
    expect(router.push).toHaveBeenCalledWith('/aile/bulusma');
    await fireEvent.press(screen.getByLabelText('Aile Acil Durum Planı: Görüntüle'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/rehber/hazirlik', params: { grup: 'plan' } });
  });

  it('Ailem: kişi satırından ara, SMS ile durum sor ve konum gönder', async () => {
    const SMS = require('expo-sms');
    await require('@react-native-async-storage/async-storage').setItem(
      'guvende:v1:local-contacts',
      JSON.stringify([{ id: '1', name: 'Ayşe', phone: '+905321234567', relation: 'Annem', status: null }]),
    );
    const Ailem = require('@/app/(tabs)/ailem').default;
    await open(<Ailem />);
    await fireEvent.press(screen.getByLabelText('Annem: ara'));
    expect(openURL).toHaveBeenCalledWith('tel:+905321234567');
    await fireEvent.press(screen.getByLabelText('Annem: SMS ile durum sor'));
    await flush();
    expect(SMS.sendSMSAsync).toHaveBeenCalledWith(['+905321234567'], expect.stringMatching(/durumunu merak ediyorum/));
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

  it('Ayarlar: profil kartı ve bölüm satırları doğru ekranlara gider', async () => {
    const Ayarlar = require('@/app/(tabs)/ayarlar').default;
    const { router } = require('expo-router');
    await open(<Ayarlar />);
    expect(screen.getByText('Profilinizi oluşturun')).toBeTruthy();
    for (const t of ['Acil Durum Ayarları', 'Uygulama Tercihleri', 'Veri ve Gizlilik', 'Hesap ve Güvenlik', 'Hakkında']) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByLabelText(/^Konum paylaşımı\. .*Kapalı$/)).toBeTruthy();
    const go: [RegExp, string][] = [
      [/^Acil arama ayarları/, '/arama'],
      [/^Acil durum bildirimleri/, '/bildirim-ayarlari'],
      [/^Acil durum çantası/, '/canta'],
      [/^Tema/, '/tercihler'],
      [/^Kimlik doğrulama/, '/kimlik'],
      [/^Giriş ve güvenlik/, '/guvenlik'],
      [/^Geri bildirim/, '/geri-bildirim'],
      [/^Kaynaklar/, '/rehber/kaynaklar'],
    ];
    for (const [label, href] of go) {
      await fireEvent.press(screen.getByLabelText(label));
      expect(router.push).toHaveBeenCalledWith(href);
    }
  });

  it('Ayarlar: önbellek temizleme kullanıcı verisini korur', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('guvende:v1:local-contacts', '[]');
    await AsyncStorage.setItem('guvende:v1:quake-cache', '{}');
    await AsyncStorage.setItem('guvende:v1:ap-tile:11/1/1', '{}');
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'Temizle')?.onPress?.());
    const Ayarlar = require('@/app/(tabs)/ayarlar').default;
    await open(<Ayarlar />);
    await fireEvent.press(screen.getByLabelText(/^Depolama yönetimi/));
    await flush();
    expect(await AsyncStorage.getItem('guvende:v1:quake-cache')).toBeNull();
    expect(await AsyncStorage.getItem('guvende:v1:ap-tile:11/1/1')).toBeNull();
    expect(await AsyncStorage.getItem('guvende:v1:local-contacts')).toBe('[]');
  });

  it('Güvenlik: biyometrik desteklenmiyorsa açıklama gösterir, açmaz', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const Screen = require('@/app/guvenlik').default;
    await open(<Screen />);
    await fireEvent(screen.getByLabelText('Biyometrik giriş'), 'valueChange', true);
    await flush();
    expect(alert).toHaveBeenCalledWith('Biyometrik giriş kullanılamıyor', expect.any(String));
    expect(screen.getByLabelText('Biyometrik giriş').props.value).toBe(false);
  });

  it('Bildirim ayarları: tercih kalıcı', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const Screen = require('@/app/bildirim-ayarlari').default;
    await open(<Screen />);
    const sw = screen.getByLabelText('Topluluk bildirimleri');
    expect(sw.props.value).toBe(false);
    await fireEvent(sw, 'valueChange', true);
    await flush();
    const saved = JSON.parse(await AsyncStorage.getItem('guvende:v1:settings'));
    expect(saved.communityNotifications).toBe(true);
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
    ['bildirim-ayarlari', /doğrulanmış bir erken uyarı sağlayıcısı/],
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
    ['rehber/index', /Şu an sarsıntı mı var\?/],
    ['rehber/hazirlik', /Hazırlık durumunuz/],
    ['rehber/kaynaklar', /resmî uygulaması değildir/],
    ['saglik-bilgilerim', /Kan grubu/],
    ['acil-mod', /112’yi Ara/],
    ['aile/bulusma', /buluşacağınız yeri/],
  ])('%s açılır', async (route, expected) => {
    const Screen = require(`@/app/${route}`).default;
    await open(<Screen />);
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });

  it('rehber detayı: ne yapmalı → neden → ne yapmamalı → kaynak ve tarih', async () => {
    mockParams = { id: 'during-indoor' };
    const Screen = require('@/app/rehber/[id]').default;
    await open(<Screen />);
    expect(screen.getByText('Ne yapmalıyım?')).toBeTruthy();
    expect(screen.getByText('Neden?')).toBeTruthy();
    expect(screen.getByText('Ne yapmamalıyım?')).toBeTruthy();
    expect(screen.getByText(/Asansör kullanmayın/)).toBeTruthy();
    expect(screen.getAllByText(/Son kontrol: /).length).toBeGreaterThan(0);
    // İnceleme bekleyen (doğrulanmamış) maddeler gösterilmez
    expect(screen.queryByText(/Hayat üçgeni/i)).toBeNull();
    expect(screen.queryByText(/tüm katların düğmesine/)).toBeNull();
    expect(screen.getByText(/yastıkla koruyun/)).toBeTruthy();
  });

  it('rehber: doğrulama bekleyen veya bilinmeyen konu açılmaz', async () => {
    mockParams = { id: 'fire' };
    const Screen = require('@/app/rehber/[id]').default;
    await open(<Screen />);
    expect(screen.getByText('Rehber bulunamadı')).toBeTruthy();
  });

  it('hazırlık listesi işaretlenir, ilerleme yüzdesi güncellenir ve cihazda saklanır', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const Screen = require('@/app/rehber/hazirlik').default;
    await open(<Screen />);
    expect(screen.getByText('%0')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('checkbox')[0]!);
    await flush();
    expect(screen.queryByText('%0')).toBeNull();
    expect(JSON.parse(await AsyncStorage.getItem('guvende:v1:prep-checked'))).toHaveLength(1);
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
    expect(screen.getByText(/1\. Bölgenizde yakın zamanda deprem yok/)).toBeTruthy();
    expect(screen.getByText(/2\. Kimlik doğrulama/)).toBeTruthy();
    expect(screen.getByText(/Kanıt fotoğrafı gerekli/)).toBeTruthy();
    expect(screen.getByText(/Önce “Kullanıcı Bildirimi”/)).toBeTruthy();
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

  it('Hoş geldin: adımlar ilerler, Başla tanıtımı kapatır', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { router } = require('expo-router');
    const Screen = require('@/app/hosgeldin').default;
    await open(<Screen />);
    expect(screen.getByText(/erken uyarı sistemi değildir/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Devam'));
    expect(screen.getByText('İzinler')).toBeTruthy();
    await fireEvent.press(screen.getByText('Devam'));
    await fireEvent.press(screen.getByText('Başla'));
    await flush();
    expect(JSON.parse(await AsyncStorage.getItem('guvende:v1:settings')).onboardingSeen).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/');
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
