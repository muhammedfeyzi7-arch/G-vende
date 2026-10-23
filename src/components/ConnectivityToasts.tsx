import { useEffect, useRef } from 'react';
import { useApp } from '@/providers/AppProvider';
import { useReports } from '@/providers/ReportsProvider';
import { useToast } from './Toast';

/** Bağlantı kesilince ve geri gelince kullanıcıyı kısa bir mesajla bilgilendirir. */
export function ConnectivityToasts() {
  const { online } = useApp();
  const { pending } = useReports();
  const toast = useToast();
  const prev = useRef(online);
  useEffect(() => {
    if (prev.current === online) return;
    prev.current = online;
    if (!online) toast.show({ text: 'İnternet yok. Acil araçlar, rehberler ve SMS çalışmaya devam eder.', tone: 'warning' });
    else
      toast.show({
        text: pending.length ? `Bağlantı geldi. ${pending.length} bekleyen bildirim gönderiliyor.` : 'Bağlantı geri geldi.',
        tone: 'success',
      });
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
