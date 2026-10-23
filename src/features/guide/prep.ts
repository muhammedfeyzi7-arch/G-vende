import { KIT_ITEMS } from '@/features/emergency/content';
import type { GuideImgKey } from './Art';
import { TOPICS, shown } from './content';

export const PREP_KEY = 'prep-checked';

/** Madde anahtarı metinden türetilir: metin değişirse o madde yeniden işaretlenmelidir (eski onay geçersiz). */
const keyOf = (topicId: string, text: string) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `${topicId}:${(h >>> 0).toString(36)}`;
};

export type PrepGroupId = 'home' | 'kit' | 'plan' | 'furniture' | 'special';
export type PrepGroup = {
  id: PrepGroupId;
  title: string;
  sub: string;
  img: GuideImgKey;
  /** 'kit': maddeler çanta listesindedir (/canta, ayarlarda saklanır) */
  kind: 'list' | 'kit';
  items: { key: string; text: string }[];
};

const fromTopic = (topicId: string, pick: (g?: 'furniture') => boolean) => {
  const t = TOPICS.find((x) => x.id === topicId)!;
  return shown(t.doList)
    .filter((i) => pick(i.g))
    .map((i) => ({ key: keyOf(t.id, i.t), text: i.t }));
};

/** Deprem öncesi hazırlık grupları (AFAD kaynaklı konu maddelerinden). */
export function prepGroups(): PrepGroup[] {
  return [
    {
      id: 'home',
      title: 'Ev güvenliği',
      sub: 'Evinizdeki riskleri azaltın, daha güvenli bir yaşam alanı oluşturun.',
      img: 'home-safety',
      kind: 'list',
      items: fromTopic('prep-home', (g) => g !== 'furniture'),
    },
    {
      id: 'kit',
      title: 'Acil durum çantası',
      sub: 'Deprem sonrası ilk 72 saat için gerekli malzemeleri hazırlayın.',
      img: 'kit',
      kind: 'kit',
      items: KIT_ITEMS.map((k) => ({ key: k.id, text: k.label })),
    },
    {
      id: 'plan',
      title: 'Aile iletişim ve buluşma planı',
      sub: 'Ailenizle acil durumlarda nasıl iletişim kuracağınızı planlayın.',
      img: 'family-plan',
      kind: 'list',
      items: fromTopic('prep-plan', () => true),
    },
    {
      id: 'furniture',
      title: 'Eşya ve mobilya güvenliği',
      sub: 'Devrilebilecek eşyaları sabitleyin, riskleri azaltın.',
      img: 'furniture',
      kind: 'list',
      items: fromTopic('prep-home', (g) => g === 'furniture'),
    },
    {
      id: 'special',
      title: 'Özel ihtiyaçlar',
      sub: 'Bebekler, yaşlılar, hamileler ve engelli bireyler için planınızı uyarlayın.',
      img: 'special-needs',
      kind: 'list',
      items: fromTopic('prep-special', () => true),
    },
  ];
}

/** Grup ilerlemesi: liste maddeleri `checked` (hazırlık), çanta maddeleri `kitChecked` (ayarlar) içinden sayılır. */
export function groupProgress(g: PrepGroup, checked: string[], kitChecked: string[]) {
  const src = g.kind === 'kit' ? kitChecked : checked;
  const done = g.items.filter((i) => src.includes(i.key)).length;
  return { done, total: g.items.length };
}

export function prepProgress(checked: string[], kitChecked: string[] = []) {
  let done = 0;
  let total = 0;
  for (const g of prepGroups()) {
    const p = groupProgress(g, checked, kitChecked);
    done += p.done;
    total += p.total;
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** Eski API: yalnızca işaretlenebilir hazırlık maddeleri (çanta hariç). */
export function prepChecklist() {
  return prepGroups()
    .filter((g) => g.kind === 'list')
    .map((g) => ({ topicId: g.id, title: g.title, items: g.items }));
}

/** "13 adımın 5'i": sayıya göre iyelik eki (0–999). */
export function possessive(n: number) {
  const ones = ['ı', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
  const tens = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
  if (n === 0) return `0'ı`;
  if (n % 100 === 0) return `${n}'ü`;
  if (n % 10 === 0) return `${n}'${tens[(n / 10) % 10]}`;
  return `${n}'${ones[n % 10]}`;
}
