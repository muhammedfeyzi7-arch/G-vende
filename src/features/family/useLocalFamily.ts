import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  loadContacts,
  loadMeetingPoint,
  MAX_LOCAL_CONTACTS,
  normalizePhone,
  saveContacts,
  saveMeetingPoint,
  type LocalContact,
  type LocalMeetingPoint,
} from './local';

export function useLocalFamily() {
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [meetingPoint, setMeetingPoint] = useState<LocalMeetingPoint | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Ekran her odaklandığında diğer ekranlarda yapılan değişiklikleri yükle.
  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadMeetingPoint()]).then(([c, m]) => {
        setContacts(c);
        setMeetingPoint(m);
        setLoaded(true);
      });
    }, []),
  );

  const addContact = useCallback(
    (name: string, phoneRaw: string, relation: string | null): string | null => {
      const phone = normalizePhone(phoneRaw);
      if (!name.trim()) return 'İsim girin.';
      if (!phone) return 'Telefon numarası geçersiz.';
      if (contacts.length >= MAX_LOCAL_CONTACTS) return `En fazla ${MAX_LOCAL_CONTACTS} kişi eklenebilir.`;
      if (contacts.some((c) => c.phone === phone)) return 'Bu numara zaten listede.';
      const next = [...contacts, { id: `${Date.now()}`, name: name.trim(), phone, relation: relation?.trim() || null }];
      setContacts(next);
      saveContacts(next);
      return null;
    },
    [contacts],
  );

  const removeContact = useCallback(
    (id: string) => {
      const next = contacts.filter((c) => c.id !== id);
      setContacts(next);
      saveContacts(next);
    },
    [contacts],
  );

  const updateMeetingPoint = useCallback((m: LocalMeetingPoint | null) => {
    setMeetingPoint(m);
    saveMeetingPoint(m);
  }, []);

  return { contacts, meetingPoint, loaded, addContact, removeContact, updateMeetingPoint };
}
