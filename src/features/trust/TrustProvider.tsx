import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApp } from '@/providers/AppProvider';
import { isBackendConfigured } from '@/services/env';
import { fetchMyTrust } from './api';
import type { TrustInfo } from './rules';

interface TrustValue {
  /** null: bilinmiyor (sunucu yok, giriş yok veya yükleniyor) */
  trust: TrustInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<TrustValue>({ trust: null, loading: false, refresh: async () => {} });

/** Oturum açan kullanıcının kimlik/rol/askı durumunu sunucudan okur. */
export function TrustProvider({ children }: { children: ReactNode }) {
  const { session } = useApp();
  const [trust, setTrust] = useState<TrustInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session || !isBackendConfigured()) return setTrust(null);
    setLoading(true);
    try {
      setTrust(await fetchMyTrust());
    } catch {
      // Ağ hatasında son bilinen durum korunur; sunucu kuralları yine de uygular.
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ trust, loading, refresh }), [trust, loading, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTrust = () => useContext(Ctx);
