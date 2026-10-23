import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

/** Aile üyesi fotoğrafları yalnızca bu cihazda, uygulamanın belge klasöründe saklanır; sunucuya gönderilmez. */
const dir = () => new Directory(Paths.document, 'family');

/** Galeriden kare bir fotoğraf seçtirir; iptal veya izin yoksa null döner. */
export async function pickPhoto(): Promise<string | null | 'denied'> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return 'denied';
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, exif: false });
  if (r.canceled || !r.assets[0]) return null;
  return r.assets[0].uri;
}

/** Geçici fotoğrafı kalıcı klasöre kopyalar ve yeni adresini döner. */
export async function persistContactPhoto(uri: string): Promise<string> {
  const d = dir();
  if (!d.exists) d.create();
  const dest = new File(d, `p-${Date.now()}.jpg`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Yalnızca uygulamanın kendi aile klasöründeki dosyayı siler. */
export function deleteContactPhoto(uri: string | null | undefined) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.uri.startsWith(dir().uri) && f.exists) f.delete();
  } catch {
    // Silinemeyen dosya zararsızdır; kişi kaydı artık ona işaret etmez.
  }
}
