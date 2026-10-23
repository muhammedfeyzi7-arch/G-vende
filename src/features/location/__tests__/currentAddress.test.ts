import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { addressFor } from '../currentAddress';

jest.mock('expo-location', () => ({ reverseGeocodeAsync: jest.fn() }));
const here = { latitude: 40.84, longitude: 31.16 };

describe('SMS için açık adres (internetsiz)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    (Location.reverseGeocodeAsync as jest.Mock).mockReset();
  });
  it('internet yokken adres servisi hiç çağrılmaz, yakındaki son adres kullanılır (SMS beklemez)', async () => {
    await AsyncStorage.setItem(
      'guvende:v1:last-address',
      JSON.stringify({ line1: 'X', line2: 'Y', full: 'Cumhuriyet Mah., Merkez / Düzce', at: new Date().toISOString(), ...here }),
    );
    expect(await addressFor(here, 4000, false)).toBe('Cumhuriyet Mah., Merkez / Düzce');
    expect(Location.reverseGeocodeAsync).not.toHaveBeenCalled();
  });
  it('kayıtlı adres yoksa null döner (mesaj yalnızca harita bağlantısıyla gider)', async () => {
    expect(await addressFor(here, 4000, false)).toBeNull();
  });
});
