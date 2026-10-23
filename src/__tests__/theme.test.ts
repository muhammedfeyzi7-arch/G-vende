import { alpha, applyScheme, colors, currentScheme, darkPalette, lightPalette, themedStyles } from '@/theme';

describe('tema', () => {
  afterEach(() => applyScheme('dark'));

  it('palet değişince canlı renkler ve temalı stiller güncellenir', () => {
    const styles = themedStyles(() => ({ box: { backgroundColor: colors.surface }, text: { color: colors.text } }));
    expect(styles.box.backgroundColor).toBe(darkPalette.surface);
    applyScheme('light');
    expect(currentScheme()).toBe('light');
    expect(colors.bg).toBe(lightPalette.bg);
    expect(styles.box.backgroundColor).toBe(lightPalette.surface);
    expect(styles.text.color).toBe(lightPalette.text);
  });

  it('iki palet aynı anahtarlara sahip', () => {
    expect(Object.keys(lightPalette).sort()).toEqual(Object.keys(darkPalette).sort());
  });

  it('alpha yardımcı', () => expect(alpha('#030B14', 0.5)).toBe('rgba(3,11,20,0.5)'));
});
