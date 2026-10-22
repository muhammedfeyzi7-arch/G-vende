import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { mergeInbox, quakeInboxItems, type InboxItem } from '@/features/inbox/rules';
import { readJson, writeJson } from '@/services/storage';
import { useApp } from './AppProvider';

interface InboxValue {
  items: InboxItem[];
  unread: number;
  add: (items: InboxItem[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const Ctx = createContext<InboxValue | null>(null);

/** Bildirim merkezi: gerçek deprem verisinden ve alınan push bildirimlerinden oluşur. */
export function InboxProvider({ children }: { children: ReactNode }) {
  const { quakes, settings, userCoords } = useApp();
  const [items, setItems] = useState<InboxItem[]>([]);
  const loaded = useRef(false);
  const ref = useRef<InboxItem[]>([]);

  const commit = useCallback((next: InboxItem[]) => {
    ref.current = next;
    setItems(next);
    writeJson('inbox', next);
  }, []);

  useEffect(() => {
    readJson<InboxItem[]>('inbox').then((i) => {
      ref.current = mergeInbox(i ?? [], ref.current);
      setItems(ref.current);
      loaded.current = true;
    });
  }, []);

  const add = useCallback((incoming: InboxItem[]) => commit(mergeInbox(ref.current, incoming)), [commit]);

  useEffect(() => {
    if (!quakes.snapshot) return;
    const incoming = quakeInboxItems(quakes.snapshot.events, settings, userCoords);
    if (incoming.length) add(incoming);
  }, [quakes.snapshot, settings.quakeNotifications, settings.officialNotifications, settings.minNotifyMagnitude, userCoords, add]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<InboxValue>(
    () => ({
      items,
      unread: items.filter((i) => !i.read).length,
      add,
      markRead: (id) => commit(ref.current.map((i) => (i.id === id ? { ...i, read: true } : i))),
      markAllRead: () => commit(ref.current.map((i) => ({ ...i, read: true }))),
      clear: () => commit([]),
    }),
    [items, add, commit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInbox() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useInbox, InboxProvider içinde kullanılmalı');
  return c;
}
