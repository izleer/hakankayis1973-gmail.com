export type AdPlacement =
  | 'home'
  | 'assets'
  | 'assetDetail'
  | 'entry'
  | 'groups'
  | 'friends'
  | 'profile';

export type AdsConfig = {
  client: string;
  slots: Record<AdPlacement, string>;
};

/**
 * Google AdSense yapılandırması çalışma anında ortam değişkenlerinden okunur;
 * böylece Docker imajı yeniden derlenmeden yayıncı kimliği değiştirilebilir.
 * `ADSENSE_CLIENT` `ca-pub-...` biçiminde değilse reklamlar kapalı kalır ve
 * arayüz nötr bir yer tutucu gösterir.
 *
 * Beklenen değişkenler:
 *   ADSENSE_CLIENT               ca-pub-0000000000000000
 *   ADSENSE_SLOT_HOME            ana sayfa reklam birimi
 *   ADSENSE_SLOT_ASSETS          varlık listesi ve varlık/kayıt formu birimi
 *   ADSENSE_SLOT_ASSET_DETAIL    varlık detayı reklam birimi
 *   ADSENSE_SLOT_ENTRY           yeni kayıt formu reklam birimi
 *   ADSENSE_SLOT_GROUPS          gruplar ve grup detayı reklam birimi
 *   ADSENSE_SLOT_FRIENDS         arkadaşlar ve keşfet reklam birimi
 *   ADSENSE_SLOT_PROFILE         profil reklam birimi
 */
export function adConfig(): AdsConfig | null {
  const client = (process.env.ADSENSE_CLIENT ?? '').trim();
  if (!client.startsWith('ca-pub-')) return null;
  return {
    client,
    slots: {
      home: (process.env.ADSENSE_SLOT_HOME ?? '').trim(),
      assets: (process.env.ADSENSE_SLOT_ASSETS ?? '').trim(),
      assetDetail: (process.env.ADSENSE_SLOT_ASSET_DETAIL ?? '').trim(),
      entry: (process.env.ADSENSE_SLOT_ENTRY ?? '').trim(),
      groups: (process.env.ADSENSE_SLOT_GROUPS ?? '').trim(),
      friends: (process.env.ADSENSE_SLOT_FRIENDS ?? '').trim(),
      profile: (process.env.ADSENSE_SLOT_PROFILE ?? '').trim(),
    },
  };
}

/** ads.txt satırı için yayıncı kimliği (`pub-...`). */
export function adsensePublisherId(): string | null {
  const config = adConfig();
  return config ? config.client.replace(/^ca-/, '') : null;
}
