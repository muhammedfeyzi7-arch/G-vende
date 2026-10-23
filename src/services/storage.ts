import AsyncStorage from '@react-native-async-storage/async-storage';

/** Sürümlü JSON önbelleği. Okuma hatası "veri yok" olarak ele alınır, uygulama çökmez. */
const PREFIX = 'guvende:v1:';

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Depolama doluysa veya erişilemiyorsa önbellek atlanır.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {}
}

export async function clearAll(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    await AsyncStorage.multiRemove(keys);
  } catch {}
}

/** Yalnızca önbellekleri siler (ör. toplanma alanı karoları, deprem listesi); kullanıcı verisine dokunmaz. */
export async function clearCaches(keys: string[], prefixes: string[]): Promise<number> {
  try {
    const all = (await AsyncStorage.getAllKeys()).filter(
      (k) => k.startsWith(PREFIX) && (keys.includes(k.slice(PREFIX.length)) || prefixes.some((p) => k.slice(PREFIX.length).startsWith(p))),
    );
    await AsyncStorage.multiRemove(all);
    return all.length;
  } catch {
    return 0;
  }
}
