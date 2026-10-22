import { Directory, File, Paths } from 'expo-file-system';
import { readJson, writeJson } from '@/services/storage';

/**
 * Kullanıcı profili. Ad ve fotoğraf yalnızca bu cihazda tutulur; giriş yapılmışsa yalnızca
 * görünen ad sunucudaki `profiles.display_name` alanına eşitlenir. Telefon numarası sunucuya gönderilmez.
 */
export interface Profile {
  name: string;
  phone: string;
  photoUri: string | null;
  /** Profil kartında il/ilçe göster (yalnızca bu cihazda görünür) */
  showLocation: boolean;
}

export const EMPTY_PROFILE: Profile = { name: '', phone: '', photoUri: null, showLocation: true };

export const loadProfile = async () => ({ ...EMPTY_PROFILE, ...((await readJson<Profile>('profile')) ?? {}) });
export const saveProfile = (p: Profile) => writeJson('profile', p);

/** Seçilen fotoğrafı uygulamanın kalıcı klasörüne kopyalar (önbellek temizlense de kaybolmaz). */
export async function persistPhoto(uri: string): Promise<string> {
  const dir = new Directory(Paths.document, 'profile');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `avatar-${Date.now()}.jpg`);
  await new File(uri).copy(dest);
  // Eski fotoğrafları temizle
  for (const f of dir.list()) if (f instanceof File && f.uri !== dest.uri) f.delete();
  return dest.uri;
}

export async function removePhoto(): Promise<void> {
  const dir = new Directory(Paths.document, 'profile');
  if (dir.exists) dir.delete();
}
