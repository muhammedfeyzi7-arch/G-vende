import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppText } from '@/components/ui';
import { Page, RowGroup, ToggleRow } from '@/components/ds';
import { formatPhone, loadContacts, type LocalContact } from '@/features/family/local';
import { useApp } from '@/providers/AppProvider';
import { StateMessage } from '@/components/ui';

/** Seçilen kişilere gönderilen mesajlara konum eklenmez. */
export default function HideLocation() {
  const { settings, updateSettings } = useApp();
  const [contacts, setContacts] = useState<LocalContact[] | null>(null);
  useEffect(() => {
    loadContacts().then(setContacts);
  }, []);
  if (contacts && !contacts.length)
    return (
      <StateMessage
        icon="people-outline"
        title="Kişi yok"
        message="Önce Ailem sekmesinden acil durum kişisi ekleyin."
        actionLabel="Ailem’e git"
        onAction={() => router.push('/ailem')}
      />
    );
  const toggle = (id: string, hide: boolean) =>
    updateSettings({ hideLocationFrom: hide ? [...settings.hideLocationFrom, id] : settings.hideLocationFrom.filter((x) => x !== id) });
  return (
    <Page>
      <AppText variant="label">
        Açık olan kişilere gönderilen durum mesajlarında konumunuz yer almaz; bu kişilere ayrı, konumsuz bir mesaj hazırlanır.
      </AppText>
      <RowGroup>
        {(contacts ?? []).map((c, i) => (
          <ToggleRow
            key={c.id}
            first={i === 0}
            icon="eye-off-outline"
            title={c.name}
            subtitle={formatPhone(c.phone)}
            value={settings.hideLocationFrom.includes(c.id)}
            onChange={(v) => toggle(c.id, v)}
          />
        ))}
      </RowGroup>
    </Page>
  );
}
