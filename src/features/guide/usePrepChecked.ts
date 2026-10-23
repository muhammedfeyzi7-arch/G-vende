import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { readJson } from '@/services/storage';
import { PREP_KEY } from './prep';

/** Hazırlık listesinde işaretlenen maddeler (cihazda); ekran her odaklandığında yeniden okunur. */
export function usePrepChecked() {
  const [checked, setChecked] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      readJson<string[]>(PREP_KEY).then((v) => live && setChecked(v ?? []));
      return () => {
        live = false;
      };
    }, []),
  );
  return checked;
}
