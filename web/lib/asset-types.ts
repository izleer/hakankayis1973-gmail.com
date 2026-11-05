import { api } from './api';
import type { AssetType } from './types';

/** Ağaç yapısındaki varlık türlerinde kimliğe göre arama yapar. */
export function findAssetType(types: AssetType[], id: string): AssetType | null {
  for (const type of types) {
    if (type.id === id) return type;
    const child = findAssetType(type.children ?? [], id);
    if (child) return child;
  }
  return null;
}

/** Tür şemasındaki alan etiketlerini anahtara göre döndürür; hata durumunda boş sözlük. */
export async function loadAttributeLabels(typeId: string): Promise<Record<string, string>> {
  try {
    const types = await api<{ items: AssetType[] }>('/v1/asset-types');
    const fields = findAssetType(types.items, typeId)?.attributesSchema?.fields ?? [];
    return Object.fromEntries(fields.map((field) => [field.key, field.label]));
  } catch {
    return {};
  }
}
