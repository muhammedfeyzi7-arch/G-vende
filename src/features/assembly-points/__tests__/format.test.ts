import { titleCaseTr } from '../format';

describe('resmî ad yazımı', () => {
  it('büyük harfli adları Türkçe kurallarla düzeltir', () => {
    expect(titleCaseTr('1 NO LU AFET VE ACİL DURUM TOPLANMA ALANI')).toBe("1 No'lu Afet ve Acil Durum Toplanma Alanı");
    expect(titleCaseTr('ÇEŞME')).toBe('Çeşme');
    expect(titleCaseTr('ÜNİVERSİTE')).toBe('Üniversite');
    expect(titleCaseTr('İZMİR')).toBe('İzmir');
    expect(titleCaseTr('ISPARTAKULE-IŞIK PARKI')).toBe('Ispartakule-Işık Parkı');
  });
  it('düzgün yazılmış veya boş metne dokunmaz', () => {
    expect(titleCaseTr('4261/1 Sk.')).toBe('4261/1 Sk.');
    expect(titleCaseTr('4261/1')).toBe('4261/1');
    expect(titleCaseTr(null)).toBeNull();
  });
});
