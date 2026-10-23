import { formatTrAddress } from './address';

describe('112 için açık adres', () => {
  it('Android biçimi: mahalle, sokak, numara, ilçe/il, posta kodu', () => {
    const a = formatTrAddress({
      district: 'Cumhuriyet',
      street: 'Atatürk Caddesi',
      streetNumber: '12',
      subregion: 'Merkez',
      city: 'Düzce',
      region: 'Düzce',
      postalCode: '81010',
    });
    expect(a.line1).toBe('Cumhuriyet Mah., Atatürk Caddesi No: 12');
    expect(a.line2).toBe('Merkez / Düzce 81010');
    expect(a.full).toBe('Cumhuriyet Mah., Atatürk Caddesi No: 12, Merkez / Düzce 81010');
  });

  it('iOS biçimi: ilçe city alanında, "Mahallesi" tekrarlanmaz', () => {
    const a = formatTrAddress({
      district: 'Kültür Mahallesi',
      street: 'Gül Sokak',
      streetNumber: '5',
      city: 'Kadıköy',
      region: 'İstanbul',
    });
    expect(a.full).toBe('Kültür Mahallesi, Gül Sokak No: 5, Kadıköy / İstanbul');
  });

  it('sokak yoksa yer adını kullanır; eksik alanlarla çalışır', () => {
    expect(formatTrAddress({ name: 'Gölyaka Devlet Hastanesi', subregion: 'Gölyaka', region: 'Düzce' }).full).toBe(
      'Gölyaka Devlet Hastanesi, Gölyaka / Düzce',
    );
    expect(formatTrAddress({ region: 'Bolu' }).full).toBe('Bolu');
    expect(formatTrAddress(null).full).toBeNull();
    expect(formatTrAddress({}).full).toBeNull();
  });
});
