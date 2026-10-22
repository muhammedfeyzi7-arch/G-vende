import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { EMPTY_PROFILE, loadProfile, type Profile } from '@/features/settings/profile';

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [loaded, setLoaded] = useState(false);
  useFocusEffect(
    useCallback(() => {
      loadProfile().then((p) => {
        setProfile(p);
        setLoaded(true);
      });
    }, []),
  );
  return { profile, loaded };
}
