import { TOPICS, shown } from './content';

export const PREP_KEY = 'prep-checked';
const PREP_TOPICS = ['prep-home', 'prep-plan'];

/** Madde anahtarı metinden türetilir: metin değişirse o madde yeniden işaretlenmelidir (eski onay geçersiz). */
const keyOf = (topicId: string, text: string) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `${topicId}:${(h >>> 0).toString(36)}`;
};

export function prepChecklist() {
  return TOPICS.filter((t) => PREP_TOPICS.includes(t.id)).map((t) => ({
    topicId: t.id,
    title: t.title,
    items: shown(t.doList).map((i) => ({ key: keyOf(t.id, i.t), text: i.t })),
  }));
}

export function prepProgress(checked: string[]) {
  const keys = prepChecklist().flatMap((g) => g.items.map((i) => i.key));
  const done = keys.filter((k) => checked.includes(k)).length;
  return { done, total: keys.length, percent: keys.length ? Math.round((done / keys.length) * 100) : 0 };
}
