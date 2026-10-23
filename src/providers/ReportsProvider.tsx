import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { buildSampleReports } from '@/features/reports/sampleReports';
import { env, isBackendConfigured } from '@/services/env';
import { readJson, writeJson } from '@/services/storage';
import { friendlyError } from '@/services/supabase';
import type { NewReportInput, PendingReport, UserReport } from '@/types/report';
import { useApp } from './AppProvider';

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
  const flushing = useRef(false);

  const savePending = useCallback((q: PendingReport[]) => {
    pendingRef.current = q;
    setPending(q);
    writeJson('pending-reports', q);
  }, []);

  useEffect(() => {
    readJson<PendingReport[]>('pending-reports').then((q) => q && savePending(q));
    readJson<{ reports: UserReport[]; at: string }>('feed-cache').then((c) => {
      if (c && isBackendConfigured()) {
        setReports((r) => (r.length ? r : c.reports));
        setLastSyncedAt((t) => t ?? c.at);
      }
    });
  }, [savePending]);

  const refresh = useCallback(async () => {
    if (!isBackendConfigured()) {
      setStatus('not-configured');
      if (env.demoReports) setReports(buildSampleReports());
      return;
    }
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      const data = await fetchFeed();
      const at = new Date().toISOString();
      setReports(data);
      setLastSyncedAt(at);
      setStatus('ready');
      setError(null);
      writeJson('feed-cache', { reports: data.map((r) => ({ ...r, media: [] })), at });
    } catch (e) {
      setStatus('error');
      setError(friendlyError(e));
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
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
      return outcome;
    },
    [savePending],
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
    [online, attempt, refresh, savePending],
  );

  const discardPending = useCallback(
    (clientId: string) => savePending(pendingRef.current.filter((p) => p.clientId !== clientId)),
    [savePending],
  );

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
        throw new Error(friendlyError(e));
      }
    },
    [helpful, refresh],
  );

  const flag = useCallback(async (id: string, reason: FlagReason) => {
    try {
      await flagReport(id, reason);
    } catch (e) {
      throw new Error(friendlyError(e));
    }
  }, []);

  const vote = useCallback(
    async (id: string, v: Vote, device: { latitude: number; longitude: number; accuracy: number } | null) => {
      try {
        await voteReport(id, v, device);
      } catch (e) {
        throw new Error(friendlyError(e));
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
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReports() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useReports, ReportsProvider içinde kullanılmalı');
  return c;
}
