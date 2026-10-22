export interface AssemblyPoint {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
  capacity: number | null;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: string | null;
  importedAt: string;
}
