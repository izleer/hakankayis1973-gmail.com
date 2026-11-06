'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { vh } from '@/lib/client';
import { formatDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n/client';
import type {
  Asset,
  AssetDetailData,
  SocialConnection,
  SocialConnectionsResponse,
} from '@/lib/types';
import { Icon } from './Icons';
import { SocialShareModal } from './SocialShareModal';

export function ProfileSocial({
  assets,
  initial,
}: {
  assets: Asset[];
  initial: SocialConnectionsResponse | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<SocialConnectionsResponse | null>(initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id ?? '');
  const [shareDetail, setShareDetail] = useState<AssetDetailData | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (data) return;
    let cancelled = false;
    vh.get<SocialConnectionsResponse>('social/connections')
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : t('Bağlantılar yüklenemedi.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [data, t]);

  const connections = data?.items ?? [];
  const config = data?.config;
  const connectedProviders = useMemo(
    () => new Set(connections.map((item) => item.provider)),
    [connections],
  );

  async function disconnect(connection: SocialConnection) {
    if (busyId) return;
    if (!window.confirm(t('Bu sosyal bağlantı kaldırılsın mı?'))) return;
    setBusyId(connection.id);
    setError(null);
    try {
      await vh.delete(`social/connections/${connection.id}`);
      setData((current) =>
        current ? { ...current, items: current.items.filter((item) => item.id !== connection.id) } : current,
      );
      setNotice(t('{name} bağlantısı kaldırıldı.', { name: connection.accountName }));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Bağlantı kaldırılamadı.'));
    } finally {
      setBusyId(null);
    }
  }

  async function openShare() {
    if (!selectedAssetId || preparing) return;
    setPreparing(true);
    setError(null);
    try {
      const detail = await vh.get<AssetDetailData>(`assets/${selectedAssetId}`);
      setShareDetail(detail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Varlık yüklenemedi.'));
    } finally {
      setPreparing(false);
    }
  }

  const shareMedia = useMemo(
    () => (shareDetail?.entries ?? []).flatMap((entry) => entry.media),
    [shareDetail],
  );
  const shareImages = shareMedia.filter((item) => item.kind === 'image');
  const shareVideos = shareMedia.filter((item) => item.kind === 'video');

  return (
    <section className="profile-social" aria-label={t('Sosyal hesaplar')}>
      <div className="profile-social-head">
        <div>
          <span className="eyebrow">{t('SOSYAL HESAPLAR')}</span>
          <h2>{t('Facebook ve Instagram')}</h2>
        </div>
        <span className={`status-pill ${connections.length > 0 ? 'is-active' : 'is-pending'}`}>
          {connections.length > 0
            ? t('{count} bağlantı', { count: connections.length })
            : t('Bağlantı yok')}
        </span>
      </div>

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {!data && !loadError ? (
        <p className="muted-note">{t('Sosyal hesaplar yükleniyor…')}</p>
      ) : null}

      {data && !config?.configured ? (
        <p className="form-note is-warning">
          <Icon name="lock" size={15} />
          {t(
            'Sunucuda Meta uygulama bilgileri tanımlanınca Facebook ve Instagram bağlantısı açılır. Kurulum adımları sosyal ayarlarda.',
          )}
        </p>
      ) : null}

      {connections.length > 0 ? (
        <ul className="social-connection-list">
          {connections.map((item) => (
            <li className="social-connection" key={item.id}>
              <span className={`social-provider is-${item.provider}`}>
                <Icon name={item.provider === 'facebook' ? 'facebook' : 'instagram'} size={17} />
              </span>
              <span className="social-connection-text">
                <strong>{item.accountName}</strong>
                <small>
                  {item.provider === 'facebook'
                    ? t('Facebook Sayfası')
                    : t('Instagram Business · {page} sayfasına bağlı', { page: item.pageName })}
                  {item.accountUsername ? ` · @${item.accountUsername}` : ''}
                </small>
                <small className="social-connection-date">
                  {t('{date} tarihinde bağlandı', { date: formatDate(item.createdAt, locale) })}
                </small>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busyId === item.id}
                onClick={() => disconnect(item)}
              >
                <Icon name="logout" size={14} />
                {busyId === item.id ? t('Kaldırılıyor…') : t('Kaldır')}
              </button>
            </li>
          ))}
        </ul>
      ) : data && config?.configured ? (
        <p className="muted-note">
          {t(
            'Henüz bağlı hesap yok. Facebook Sayfanı bağla; sayfaya bağlı Instagram Business hesabı varsa otomatik eklenir.',
          )}
        </p>
      ) : null}

      <div className="profile-social-actions">
        {config?.configured ? (
          <a className="btn btn-primary" href="/api/social/start">
            <Icon name="facebook" size={16} />
            {connectedProviders.size > 0 ? t('Hesap ekle') : t('Facebook ile bağlan')}
          </a>
        ) : (
          <button type="button" className="btn btn-primary" disabled>
            <Icon name="facebook" size={16} />
            {t('Facebook ile bağlan')}
          </button>
        )}
        <Link href="/ayarlar/sosyal" className="btn btn-ghost">
          <Icon name="share" size={15} />
          {t('Sosyal ayarlar')}
        </Link>
      </div>

      {connections.length > 0 ? (
        <div className="profile-social-share">
          <span className="field-label">{t('Varlığını paylaş')}</span>
          {assets.length > 0 ? (
            <div className="profile-social-share-row">
              <select
                className="select"
                value={selectedAssetId}
                onChange={(event) => setSelectedAssetId(event.target.value)}
                aria-label={t('Paylaşılacak varlık')}
              >
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openShare}
                disabled={preparing || !selectedAssetId}
              >
                <Icon name="share" size={15} />
                {preparing ? t('Hazırlanıyor…') : t('Paylaş')}
              </button>
            </div>
          ) : (
            <p className="muted-note">{t('Paylaşmak için önce bir varlık ekle.')}</p>
          )}
          {config && !config.instagramReady ? (
            <p className="form-note is-warning">
              <Icon name="lock" size={15} />
              {t('Instagram için medya adresinin herkese açık HTTPS olması gerekir.')}
            </p>
          ) : null}
        </div>
      ) : null}

      {notice ? <p className="form-note">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {shareDetail ? (
        <SocialShareModal
          asset={shareDetail.asset}
          images={shareImages}
          videos={shareVideos}
          onClose={() => setShareDetail(null)}
          onShared={(message) => setNotice(message)}
        />
      ) : null}
    </section>
  );
}
