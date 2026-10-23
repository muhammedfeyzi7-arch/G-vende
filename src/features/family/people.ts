import type { AvatarStatus } from '@/components/ds';
import { colors } from '@/theme';
import type { FamilyGroup } from './api';
import { effectiveStatus, STATUS_TTL_MS, type LocalContact, type MyStatus } from './local';

export interface PersonSummary {
  key: string;
  name: string;
  status: AvatarStatus;
  label: string;
  color: string;
  at: string | null;
  /** Durum nereden geliyor: yerel işaretleme mi, çevrimiçi aile grubu mu */
  source: 'me' | 'local' | 'group';
  contactId?: string;
  /** Yerel kişi fotoğrafı (yalnızca cihazda) */
  photoUri?: string | null;
  /** Çevrimiçi gruptaki son konum (yalnızca paylaşım açıksa) ve eski olup olmadığı */
  location?: { latitude: number; longitude: number; stale: boolean } | null;
}

export const STATUS_LABEL: Record<Exclude<AvatarStatus, null>, { label: string; color: string }> = {
  safe: { label: 'Güvende', color: colors.safe },
  help: { label: 'Yardım istiyor', color: colors.danger },
  waiting: { label: 'Cevap yok', color: colors.warning },
  home: { label: 'Evde', color: colors.info },
  unknown: { label: 'Bilinmiyor', color: colors.textMuted },
};

/**
 * Ben + yerel kişiler + çevrimiçi aile grubu üyelerinden tek bir özet listesi oluşturur.
 * Yanıt vermeyen kişi asla "tehlikede" sayılmaz; yalnızca "Yanıt bekleniyor" / "Bilinmiyor" gösterilir.
 */
export function buildPeople(
  me: { name: string; status: MyStatus | null },
  contacts: LocalContact[],
  groups: FamilyGroup[],
  myUserId: string | null,
  now = Date.now(),
): PersonSummary[] {
  const out: PersonSummary[] = [];
  const myFresh = me.status && now - Date.parse(me.status.at) < STATUS_TTL_MS ? me.status : null;
  const meStatus: AvatarStatus = myFresh ? (myFresh.kind === 'safe' ? 'safe' : 'help') : 'unknown';
  out.push({
    key: 'me',
    name: 'Ben',
    status: meStatus,
    label: myFresh ? (myFresh.kind === 'safe' ? 'Güvendeyim' : 'Yardım istedim') : 'Durum bildir',
    color: STATUS_LABEL[meStatus!].color,
    at: myFresh?.at ?? null,
    source: 'me',
  });
  for (const c of contacts) {
    const s = effectiveStatus(c, now);
    const st: AvatarStatus = s ? s.kind : 'unknown';
    out.push({
      key: `c:${c.id}`,
      name: c.relation || c.name,
      status: st,
      label: STATUS_LABEL[st!].label,
      color: STATUS_LABEL[st!].color,
      at: s?.at ?? null,
      source: 'local',
      contactId: c.id,
      photoUri: c.photoUri ?? null,
    });
  }
  const seen = new Set<string>();
  for (const g of groups) {
    for (const m of g.members) {
      if (m.userId === myUserId || seen.has(m.userId)) continue;
      seen.add(m.userId);
      const c = m.lastCheckin;
      const fresh = c && now - Date.parse(c.at) < STATUS_TTL_MS;
      const st: AvatarStatus = !c ? 'unknown' : !fresh ? 'unknown' : c.status === 'safe' ? 'safe' : 'help';
      out.push({
        key: `g:${m.userId}`,
        name: m.displayName,
        status: st,
        label: c && !fresh ? 'Son durum eski' : STATUS_LABEL[st!].label,
        color: STATUS_LABEL[st!].color,
        at: c?.at ?? null,
        source: 'group',
        location: c?.location ? { ...c.location, stale: now - Date.parse(c.at) > 30 * 60_000 } : null,
      });
    }
  }
  return out;
}

/** "Ailende N kişiden M'i güvende" — kullanıcının kendisi sayılmaz. */
export function safeCount(people: PersonSummary[]) {
  const others = people.filter((p) => p.source !== 'me');
  return {
    safe: others.filter((p) => p.status === 'safe').length,
    waiting: others.filter((p) => p.status === 'waiting').length,
    help: others.filter((p) => p.status === 'help').length,
    home: others.filter((p) => p.status === 'home').length,
    total: others.length,
    lastAt:
      people
        .map((p) => p.at)
        .filter((t): t is string => !!t)
        .sort()
        .at(-1) ?? null,
  };
}
