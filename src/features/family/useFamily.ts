import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { readJson, removeKey, writeJson } from '@/services/storage';
import { friendlyError } from '@/services/supabase';
import { currentUserId, fetchGroups, type FamilyGroup } from './api';

export type FamilyState =
  | { status: 'not-configured' }
  | { status: 'signed-out' }
  | { status: 'loading' }
  | { status: 'error'; error: string; cached: { groups: FamilyGroup[]; at: string } | null }
  | { status: 'ready'; groups: FamilyGroup[]; at: string; me: string };

export function useFamily() {
  const { session, settings, online } = useApp();
  const [state, setState] = useState<FamilyState>({ status: 'loading' });
  const cacheAllowed = useRef(settings.cacheFamilyOffline);
  cacheAllowed.current = settings.cacheFamilyOffline;

  useEffect(() => {
    if (!settings.cacheFamilyOffline) removeKey('family-cache');
  }, [settings.cacheFamilyOffline]);

  const load = useCallback(async () => {
    if (!isBackendConfigured()) return setState({ status: 'not-configured' });
    if (!session) return setState({ status: 'signed-out' });
    try {
      const [groups, me] = await Promise.all([fetchGroups(), currentUserId()]);
      const at = new Date().toISOString();
      setState({ status: 'ready', groups, at, me: me! });
      if (cacheAllowed.current) writeJson('family-cache', { groups, at });
    } catch (e) {
      const cached = cacheAllowed.current ? await readJson<{ groups: FamilyGroup[]; at: string }>('family-cache') : null;
      setState({ status: 'error', error: friendlyError(e), cached });
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
      if (!online) return;
      const t = setInterval(load, 30_000);
      return () => clearInterval(t);
    }, [load, online]),
  );

  return { state, reload: load };
}
