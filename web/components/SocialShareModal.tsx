'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { vh } from '@/lib/client';
import { formatDate, mediaSrc } from '@/lib/format';
import type {
  Asset,
  Media,
  SocialConnectionsResponse,
  SocialProvider,
  SocialShare,
  SocialShareFormat,
} from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

const formatLabels: Record<SocialShareFormat, string> = {
  post: 'Gönderi',
  story: 'Hikâye',
  reel: 'Reels',
};

const providerLabels: Record<SocialProvider, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
};

function defaultCaption(asset: Asset): string {
  const description = asset.description?.trim();
  const text = description ? `${asset.title}\n\n${description}` : asset.title;
  return text.slice(0, 2200);
}

export function SocialShareModal({
  asset,
  images,
  videos,
  onClose,
  onShared,
}: {
  asset: Asset;
  images: Media[];
  videos: Media[];
  onClose: () => void;
  onShared?: (message: string) => void;
}) {
  const [data, setData] = useState<SocialConnectionsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<SocialProvider>('facebook');
  const [connectionId, setConnectionId] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<SocialShareFormat>('post');
  const [mediaId, setMediaId] = useState<string | undefined>(undefined);
  const [caption, setCaption] = useState(() => defaultCaption(asset));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialShare | null>(null);

  useEffect(() => {
    let cancelled = false;
    vh.get<SocialConnectionsResponse>('social/connections')
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : 'Bağlantılar yüklenemedi.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connections = data?.items ?? [];
  const availableProviders = useMemo(
    () => new Set(connections.map((item) => item.provider)),
    [connections],
  );

  const activeProvider: SocialProvider = availableProviders.has(provider)
    ? provider
    : (connections[0]?.provider ?? provider);
  const providerConnections = connections.filter(
    (item) => item.provider === activeProvider,
  );
  const connection =
    providerConnections.find((item) => item.id === connectionId) ??
    providerConnections[0] ??
    null;

  const config = data?.config;
  const instagramBlocked = activeProvider === 'instagram' && !config?.instagramReady;
  const storyCover = asset.coverUrl ?? images[0]?.url ?? null;

  function chooseProvider(next: SocialProvider) {
    setProvider(next);
    setConnectionId(undefined);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !connection) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await vh.post<{ share: SocialShare }>('social/share', {
        assetId: asset.id,
        provider: activeProvider,
        format,
        connectionId: connection.id,
        ...(format !== 'story' && mediaId ? { mediaId } : {}),
        ...(format !== 'story' && caption.trim() ? { caption: caption.trim() } : {}),
      });
      setResult(payload.share);
      onShared?.(
        `${providerLabels[activeProvider]} ${formatLabels[payload.share.format].toLocaleLowerCase('tr-TR')} olarak paylaşıldı.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Paylaşım tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sosyal medyada paylaş">
      <div className="modal social-share-modal">
        <header className="modal-head">
          <div>
            <span className="eyebrow">SOSYAL PAYLAŞIM</span>
            <h2>{asset.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <Icon name="close" size={20} />
          </button>
        </header>

        {loadError ? (
          <div className="modal-body">
            <p className="form-error">{loadError}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Kapat
              </button>
            </div>
          </div>
        ) : !data ? (
          <div className="modal-body">
            <p className="muted-note">Sosyal hesaplar yükleniyor…</p>
          </div>
        ) : result ? (
          <div className="modal-body social-result">
            <span className="social-result-icon">
              <Icon name="check" size={26} />
            </span>
            <h3>
              {providerLabels[result.provider]} {formatLabels[result.format].toLocaleLowerCase('tr-TR')}{' '}
              yayınlandı
            </h3>
            <p>
              {result.format === 'story'
                ? 'Hikâye 24 saat boyunca görünür kalacak.'
                : 'Paylaşımın hesabında yayında.'}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Kapat
              </button>
              {result.permalink ? (
                <a
                  className="btn btn-primary"
                  href={result.permalink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="arrow-right" size={16} />
                  Paylaşımı aç
                </a>
              ) : null}
            </div>
          </div>
        ) : !config?.configured ? (
          <div className="modal-body social-locked">
            <span className="social-result-icon">
              <Icon name="lock" size={24} />
            </span>
            <h3>Meta bağlantısı henüz kurulmadı</h3>
            <p>
              Facebook ve Instagram paylaşımı için uygulama anahtarlarını ekleyip
              bir sayfa bağlaman gerekiyor.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Vazgeç
              </button>
              <Link href="/ayarlar/sosyal" className="btn btn-primary">
                <Icon name="share" size={16} />
                Kuruluma git
              </Link>
            </div>
          </div>
        ) : connections.length === 0 ? (
          <div className="modal-body social-locked">
            <span className="social-result-icon">
              <Icon name="facebook" size={24} />
            </span>
            <h3>Henüz bağlı hesap yok</h3>
            <p>
              Facebook Sayfanı ve varsa ona bağlı Instagram Business hesabını
              bağlayarak paylaşmaya başlayabilirsin.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Vazgeç
              </button>
              <Link href="/ayarlar/sosyal" className="btn btn-primary">
                <Icon name="facebook" size={16} />
                Hesap bağla
              </Link>
            </div>
          </div>
        ) : (
          <form className="modal-body" onSubmit={submit}>
            <div className="social-share-block">
              <span className="field-label">Hesap</span>
              <div className="social-provider-tabs">
                {(['facebook', 'instagram'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`social-provider-tab is-${item}${
                      activeProvider === item ? ' is-selected' : ''
                    }`}
                    onClick={() => chooseProvider(item)}
                    disabled={!availableProviders.has(item)}
                    aria-pressed={activeProvider === item}
                  >
                    <Icon name={item} size={17} />
                    {providerLabels[item]}
                  </button>
                ))}
              </div>
              {providerConnections.length > 1 ? (
                <select
                  className="select"
                  value={connection?.id ?? ''}
                  onChange={(event) => setConnectionId(event.target.value)}
                  aria-label="Sosyal hesap"
                >
                  {providerConnections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.accountName}
                      {item.provider === 'instagram' && item.accountUsername
                        ? ` (@${item.accountUsername})`
                        : ''}
                    </option>
                  ))}
                </select>
              ) : connection ? (
                <p className="social-active-account">
                  <Icon name={activeProvider} size={15} />
                  {connection.accountName}
                  {connection.accountUsername ? ` · @${connection.accountUsername}` : ''}
                  <small>{connection.pageName} sayfası</small>
                </p>
              ) : null}
            </div>

            <div className="social-share-block">
              <span className="field-label">Paylaşım biçimi</span>
              <div className="social-format-tabs">
                {(['post', 'story', 'reel'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`social-format-tab${format === item ? ' is-selected' : ''}`}
                    onClick={() => {
                      setFormat(item);
                      setMediaId(undefined);
                      setError(null);
                    }}
                    disabled={item === 'reel' && videos.length === 0}
                  >
                    <Icon
                      name={item === 'post' ? 'image' : item === 'story' ? 'sparkles' : 'camera'}
                      size={16}
                    />
                    {formatLabels[item]}
                  </button>
                ))}
              </div>
            </div>

            {format === 'story' ? (
              <div className="social-story-preview">
                <span className="social-story-frame">
                  <MediaImage src={storyCover} alt="" fallbackIcon="image" />
                </span>
                <div>
                  <strong>Kapak fotoğrafıyla hikâye</strong>
                  <small>
                    Hikâye, varlığın kapak fotoğrafı kullanılarak paylaşılır.
                    {asset.coverUrl ? '' : ' Kapak yoksa en yeni görsel kullanılır.'}
                  </small>
                </div>
              </div>
            ) : format === 'reel' ? (
              <div className="social-share-block">
                <span className="field-label">Video</span>
                {videos.length === 0 ? (
                  <p className="form-note is-warning">
                    <Icon name="lock" size={15} />
                    Bu varlıkta Reels için video yok. Varlık detayından bir video
                    ekleyebilirsin.
                  </p>
                ) : (
                  <div className="social-media-grid">
                    <button
                      type="button"
                      className={`social-media-option${mediaId ? '' : ' is-selected'}`}
                      onClick={() => setMediaId(undefined)}
                    >
                      <span className="social-media-video">
                        <Icon name="camera" size={18} />
                      </span>
                      <small>En yeni video</small>
                    </button>
                    {videos.map((video) => (
                      <button
                        key={video.id}
                        type="button"
                        className={`social-media-option${mediaId === video.id ? ' is-selected' : ''}`}
                        onClick={() => setMediaId(video.id)}
                      >
                        <span className="social-media-video">
                          <Icon name="camera" size={18} />
                        </span>
                        <small>{formatDate(video.createdAt)}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="social-share-block">
                <span className="field-label">Görsel</span>
                <div className="social-media-grid">
                  {asset.coverUrl ? (
                    <button
                      type="button"
                      className={`social-media-option${mediaId ? '' : ' is-selected'}`}
                      onClick={() => setMediaId(undefined)}
                    >
                      <MediaImage src={asset.coverUrl} alt="" />
                      <small>Kapak</small>
                    </button>
                  ) : null}
                  {images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      className={`social-media-option${mediaId === image.id ? ' is-selected' : ''}`}
                      onClick={() => setMediaId(image.id)}
                    >
                      <MediaImage src={mediaSrc(image.url)} alt="" />
                      <small>{formatDate(image.createdAt)}</small>
                    </button>
                  ))}
                </div>
                {!asset.coverUrl && images.length === 0 ? (
                  <p className="form-note is-warning">
                    <Icon name="lock" size={15} />
                    Paylaşmak için varlığa bir görsel ekleyin.
                  </p>
                ) : null}
              </div>
            )}

            {format !== 'story' ? (
              <label className="field">
                <span>Açıklama</span>
                <textarea
                  className="textarea"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  rows={3}
                  maxLength={2200}
                  placeholder="Paylaşıma eşlik edecek not…"
                />
                <small>{caption.length}/2200</small>
              </label>
            ) : null}

            {instagramBlocked ? (
              <p className="form-note is-warning">
                <Icon name="lock" size={15} />
                Instagram paylaşımı için medya adresinin herkese açık HTTPS olması
                gerekiyor. Ayarlar sayfasındaki kurulum adımlarına bak.
              </p>
            ) : null}

            {activeProvider === 'instagram' && format === 'post' && mediaId ? (
              <p className="muted-note">
                Instagram gönderileri fotoğraf olarak yayınlanır; videolar için Reels
                biçimini seç.
              </p>
            ) : null}

            {error ? <p className="form-error">{error}</p> : null}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                Vazgeç
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  busy ||
                  !connection ||
                  instagramBlocked ||
                  (format === 'reel' && videos.length === 0) ||
                  (format === 'post' && !asset.coverUrl && images.length === 0)
                }
              >
                <Icon name={activeProvider} size={16} />
                {busy
                  ? 'Paylaşılıyor…'
                  : `${formatLabels[format]} olarak paylaş`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
