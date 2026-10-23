import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import {
  fetchFeed,
  fetchMyReactions,
  fetchMyVotes,
  flagReport,
  markHelpful,
  sendReport,
  voteReport,
  type FlagReason,
  type Vote,
} from '@/features/reports/api';
import { applyOutcome, enqueue, isRetryable, nextAttemptDelayMs } from '@/features/reports/pendingQueue';
import { isBackendConfigured } from '@/services/env';
import { readJson, writeJson } from '@/services/storage';
import { friendlyError } from '@/services/supabase';
import type { NewReportInput, PendingReport, UserReport } from '@/types/report';
import { useApp } from './AppProvider';
import { useInbox } from './InboxProvider';
import { CATEGORY_META } from '@/features/reports/categories';
import { syncMyReports, type MyReport } from '@/features/reports/myReports';
import { UserError } from '@/services/errors';

type FeedStatus = 'idle' | 'loading' | 'ready' | 'error' | 'not-configured';

interface ReportsContextValue {
  reports: UserReport[];
  status: FeedStatus;
  error: string | null;
  lastSyncedAt: string | null;
  refresh: () => Promise<void>;
  pending: PendingReport[];
  /** Kuyruğa ekler ve hemen göndermeyi dener. Bekleyen bildirimler gönderilmiş gibi gösterilmez. */
  submit: (input: NewReportInput) => Promise<{ sent: boolean; message: string }>;
  retryPending: () => Promise<void>;
  discardPending: (clientId: string) => void;
  helpful: Set<string>;
  toggleHelpful: (id: string) => Promise<void>;
  flag: (id: string, reason: FlagReason) => Promise<void>;
  /** Kullanıcının verdiği topluluk oyları */
  votes: Map<string, Vote>;
  /** Bu cihazdan gönderilen bildirimler ve durumları */
  mine: MyReport[];
  removeMine: (clientId: string) => void;
  vote: (id: string, v: Vote, device: { latitude: number; longitude: number; accuracy: number } | null) => Promise<void>;
}

const Ctx = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const { online, session } = useApp();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [status, setStatus] = useState<FeedStatus>(isBackendConfigured() ? 'idle' : 'not-configured');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingReport[]>([]);
  const [helpful, setHelpful] = useState<Set<string>>(new Set());
  const [votes, setVotes] = useState<Map<string, Vote>>(new Map());
  const pendingRef = useRef<PendingReport[]>([]);
  const inbox = useInbox();
  const [mine, setMine] = useState<MyReport[]>([]);
  const mineRef = useRef<MyReport[]>([]);
  const saveMine = useCallback((m: MyReport[]) => {
    mineRef.current = m.slice(0, 50);
    setMine(mineRef.current);
    writeJson('my-reports', mineRef.current);
  }, []);
  const updateMine = useCallback(
    (clientId: string, patch: Partial<MyReport>) =>
      saveMine(mineRef.current.map((m) => (m.clientId === clientId ? { ...m, ...patch } : m))),
    [saveMine],
  );
  const note = useCallback(
    (id: string, title: string, body: string) =>
      inbox.add([{ id, kind: 'report', title, body, at: new Date().toISOString(), read: false, href: '/rapor/benim' }]),
    [inbox.add], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const flushing = useRef(false);

  const savePending = useCallback((q: PendingReport[]) => {
    pendingRef.current = q;
    setPending(q);
    writeJson('pending-reports', q);
  }, []);

  useEffect(() => {
    readJson<PendingReport[]>('pending-reports').then((q) => q && savePending(q));
    readJson<MyReport[]>('my-reports').then((m) => m && saveMine(m));
    readJson<{ reports: UserReport[]; at: string }>('feed-cache').then((c) => {
      if (c && isBackendConfigured()) {
        setReports((r) => (r.length ? r : c.reports));
        setLastSyncedAt((t) => t ?? c.at);
      }
    });
  }, [savePending, saveMine]);

  const refresh = useCallback(async () => {
    if (!isBackendConfigured()) {
      setStatus('not-configured');
      return;
    }
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const data = await fetchFeed();
      const at = new Date().toISOString();
      setReports(data);
      const { next, changes } = syncMyReports(mineRef.current, data);
      if (changes.length || next !== mineRef.current) saveMine(next);
      for (const c of changes) {
        const label = CATEGORY_META[c.report.category].formLabel;
        if (c.kind === 'verified')
          note(`rep-verified:${c.report.clientId}`, 'Bildiriminiz doğrulandı', `“${label}” yakındaki kişilerce onaylandı.`);
        else note(`rep-gone:${c.report.clientId}`, 'Bildiriminiz yayında değil', `“${label}” akıştan kaldırıldı veya incelemeye alındı.`);
      }
      setLastSyncedAt(at);
      setStatus('ready');
      setError(null);
      writeJson('feed-cache', { reports: data.map((r) => ({ ...r, media: [] })), at });
    } catch (e) {
      setStatus('error');
      setError(friendlyError(e));
    }
  }, []);

  // Akış ~60 sn'de bir (±%20 rastgele) yenilenir; uygulama arka plandayken istek atılmaz.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, 60_000 * (0.8 + 0.4 * Math.random()));
    };
    refresh();
    schedule();
    const sub = AppState.addEventListener('change', (st) => {
      if (timer) clearTimeout(timer);
      timer = null;
      if (st === 'active') {
        refresh();
        schedule();
      }
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!session || !isBackendConfigured()) return setHelpful(new Set());
    fetchMyReactions()
      .then(setHelpful)
      .catch(() => {});
    fetchMyVotes()
      .then(setVotes)
      .catch(() => {});
  }, [session]);

  const attempt = useCallback(
    async (item: PendingReport) => {
      const outcome = await sendReport(item, item.serverId);
      savePending(applyOutcome(pendingRef.current, item.clientId, outcome));
      const label = CATEGORY_META[item.category].formLabel;
      if (outcome.kind === 'sent') {
        updateMine(item.clientId, { state: 'sent', serverId: outcome.serverId, error: null });
        note(`rep-sent:${item.clientId}`, 'Bildiriminiz yayınlandı', `“${label}” önce Kullanıcı Bildirimi olarak görünür.`);
      } else if (outcome.kind === 'partial') {
        updateMine(item.clientId, { serverId: outcome.serverId, error: outcome.error });
      } else if (outcome.kind === 'fatal') {
        updateMine(item.clientId, { state: 'failed', error: outcome.error });
        note(`rep-failed:${item.clientId}`, 'Bildirim gönderilemedi', `“${label}”: ${outcome.error}`);
      } else updateMine(item.clientId, { error: outcome.error });
      return outcome;
    },
    [savePending, updateMine, note],
  );

  const retryPending = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const item of pendingRef.current.filter(isRetryable)) await attempt(item);
      await refresh();
    } finally {
      flushing.current = false;
    }
  }, [attempt, refresh]);

  // Bağlantı geri geldiğinde ve periyodik olarak kuyruğu boşalt (üstel geri çekilme).
  useEffect(() => {
    if (!online || !session || pending.length === 0) return;
    const minAttempts = Math.min(...pending.filter(isRetryable).map((p) => p.attempts));
    if (!Number.isFinite(minAttempts)) return;
    const t = setTimeout(retryPending, minAttempts === 0 ? 0 : nextAttemptDelayMs(minAttempts));
    return () => clearTimeout(t);
  }, [online, session, pending, retryPending]);

  const submit = useCallback(
    async (input: NewReportInput) => {
      savePending(enqueue(pendingRef.current, input));
      if (!mineRef.current.some((m) => m.clientId === input.clientId))
        saveMine([
          {
            clientId: input.clientId,
            serverId: null,
            category: input.category,
            description: input.description,
            areaLabel: input.areaLabel,
            createdAt: new Date().toISOString(),
            state: 'pending',
          },
          ...mineRef.current,
        ]);
      if (!online) return { sent: false, message: 'İnternet yok. Bildiriminiz cihazda bekliyor; bağlantı gelince gönderilecek.' };
      const item = pendingRef.current.find((p) => p.clientId === input.clientId)!;
      const outcome = await attempt(item);
      if (outcome.kind === 'sent') {
        refresh();
        return { sent: true, message: 'Bildiriminiz yayınlandı.' };
      }
      if (outcome.kind === 'partial')
        return { sent: false, message: `Bildirim yayınlandı ancak ${outcome.error.toLocaleLowerCase('tr-TR')} Tekrar denenecek.` };
      if (outcome.kind === 'retry')
        return { sent: false, message: `Gönderilemedi (${outcome.error}). Bildiriminiz bekleyen gönderiler arasında.` };
      return { sent: false, message: `Gönderilemedi: ${friendlyError({ message: outcome.error })}` };
    },
    [online, attempt, refresh, savePending, saveMine],
  );

  const discardPending = useCallback(
    (clientId: string) => {
      savePending(pendingRef.current.filter((p) => p.clientId !== clientId));
      saveMine(mineRef.current.filter((m) => !(m.clientId === clientId && m.state !== 'sent')));
    },
    [savePending, saveMine],
  );
  const removeMine = useCallback((clientId: string) => saveMine(mineRef.current.filter((m) => m.clientId !== clientId)), [saveMine]);

  const toggleHelpful = useCallback(
    async (id: string) => {
      const was = helpful.has(id);
      const next = new Set(helpful);
      if (was) next.delete(id);
      else next.add(id);
      setHelpful(next);
      setReports((rs) => rs.map((r) => (r.id === id ? { ...r, helpfulCount: Math.max(0, r.helpfulCount + (was ? -1 : 1)) } : r)));
      try {
        await markHelpful(id, !was);
      } catch (e) {
        setHelpful(helpful);
        refresh();
        throw new UserError(friendlyError(e));
      }
    },
    [helpful, refresh],
  );

  const flag = useCallback(async (id: string, reason: FlagReason) => {
    try {
      await flagReport(id, reason);
    } catch (e) {
      throw new UserError(friendlyError(e));
    }
  }, []);

  const vote = useCallback(
    async (id: string, v: Vote, device: { latitude: number; longitude: number; accuracy: number } | null) => {
      try {
        await voteReport(id, v, device);
      } catch (e) {
        throw new UserError(friendlyError(e));
      }
      setVotes((m) => new Map(m).set(id, v));
      // Doğrulama/kaldırma sunucuda hesaplanır; güncel durumu çek.
      refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      reports,
      status,
      error,
      lastSyncedAt,
      refresh,
      pending,
      submit,
      retryPending,
      discardPending,
      helpful,
      toggleHelpful,
      flag,
      votes,
      vote,
      mine,
      removeMine,
    }),
    [
      reports,
      status,
      error,
      lastSyncedAt,
      refresh,
      pending,
      submit,
      retryPending,
      discardPending,
      helpful,
      toggleHelpful,
      flag,
      votes,
      vote,
      mine,
      removeMine,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReports() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useReports, ReportsProvider içinde kullanılmalı');
  return c;
}
