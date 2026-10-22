import { readJson, writeJson } from '@/services/storage';
import type { AssemblyPoint } from '@/types/assembly';
import { EDEVLET_ASSEMBLY_URL } from './api';

/**
 * Kullanıcının kendisine atanmış toplanma alanı (ör. e-Devlet AFAD sorgusunun sonucu).
 * Uygulama bu konumu doğrulamaz; kullanıcı girer ve yalnızca bu cihazda saklanır.
 */
export interface MyAssemblyPoint {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  savedAt: string;
}

const KEY = 'my-assembly-point';

export const loadMyPoint = () => readJson<MyAssemblyPoint>(KEY);
export const saveMyPoint = (p: MyAssemblyPoint | null) => writeJson(KEY, p);

export function myPointAsAssembly(p: MyAssemblyPoint): AssemblyPoint {
  return {
    id: 'mine',
    name: p.name,
    address: p.address,
    province: null,
    district: null,
    neighborhood: null,
    latitude: p.latitude,
    longitude: p.longitude,
    capacity: null,
    sourceName: 'Sizin kaydınız',
    sourceUrl: EDEVLET_ASSEMBLY_URL,
    sourcePublishedAt: null,
    importedAt: p.savedAt,
    isUserSaved: true,
  };
}
