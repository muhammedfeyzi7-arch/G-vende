import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  loadContacts,
  loadMeetingPoint,
  loadMyStatus,
  MAX_LOCAL_CONTACTS,
  normalizePhone,
  saveContacts,
  saveMeetingPoint,
  saveMyStatus,
  type ContactStatusKind,
  type LocalContact,
  type LocalMeetingPoint,
  type MyStatus,
} from './local';

export function useLocalFamily() {
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [meetingPoint, setMeetingPoint] = useState<LocalMeetingPoint | null>(null);
  const [myStatus, setMyStatusState] = useState<MyStatus | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Ekran her odaklandığında diğer ekranlarda yapılan değişiklikleri yükle.
  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadMeetingPoint(), loadMyStatus()]).then(([c, m, s]) => {
        setContacts(c);
        setMeetingPoint(m);
        setMyStatusState(s);
        setLoaded(true);
      });
    }, []),
  );

  const persist = useCallback((next: LocalContact[]) => {
    setContacts(next);
    saveContacts(next);
  }, []);

  const addContact = useCallback(
    (name: string, phoneRaw: string, relation: string | null): string | null => {
      const phone = normalizePhone(phoneRaw);
      if (!name.trim()) return 'İsim girin.';
      if (!phone) return 'Telefon numarası geçersiz.';
      if (contacts.length >= MAX_LOCAL_CONTACTS) return `En fazla ${MAX_LOCAL_CONTACTS} kişi eklenebilir.`;
      if (contacts.some((c) => c.phone === phone)) return 'Bu numara zaten listede.';
      persist([...contacts, { id: `${Date.now()}`, name: name.trim(), phone, relation: relation?.trim() || null, status: null }]);
      return null;
    },
    [contacts, persist],
  );

  const removeContact = useCallback((id: string) => persist(contacts.filter((c) => c.id !== id)), [contacts, persist]);

  const setContactStatus = useCallback(
    (ids: string[], kind: ContactStatusKind | null) => {
      const at = new Date().toISOString();
      persist(contacts.map((c) => (ids.includes(c.id) ? { ...c, status: kind ? { kind, at } : null } : c)));
    },
    [contacts, persist],
  );

  const updateMeetingPoint = useCallback((m: LocalMeetingPoint | null) => {
    setMeetingPoint(m);
    saveMeetingPoint(m);
  }, []);

  const setMyStatus = useCallback((s: MyStatus | null) => {
    setMyStatusState(s);
    saveMyStatus(s);
  }, []);

  return { contacts, meetingPoint, myStatus, loaded, addContact, removeContact, setContactStatus, updateMeetingPoint, setMyStatus };
}
