'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { vh } from '@/lib/client';
import type { SocialConnectionsResponse } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Icon } from './Icons';

const reasonMessages: Record<string, string> = {
  config: 'Meta uygulama bilgileri eksik. Aşağıdaki kurulum adımlarını tamamlayın.',
  denied: 'Facebook izin isteği reddedildi. Bağlantı kurulmadı.',
  no_page: 'Facebook Sayfası veya sayfaya bağlı Instagram Business hesabı bulunamadı.',
  invalid: 'Bağlantı isteği geçersiz. Lütfen yeniden deneyin.',
  token: 'Meta erişim jetonu alınamadı. Uygulama ayarlarını ve izinleri kontrol edin.',
  network: 'Meta sunucularına ulaşılamadı. İnternet bağlantınızı kontrol edin.',
};

export function SocialSettings({
  initial,
  result,
}: {
  initial: SocialConnectionsResponse | null;
  result: { social: string | null; reason: string | null; accounts: number | null };
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial?.items ?? []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  if (!initial) {
    return (
      <section className="aside-card social-unavailable">
        <h2>Sosyal servis yüklenemedi</h2>
        <p>API şu anda yanıt vermiyor. Sayfayı yenileyerek tekrar deneyin.</p>
      </section>
    );
  }

  const { config } = initial;
  const showNotice = result.social && !noticeDismissed;

  async function disconnect(id: string) {
    if (busyId) return;
    if (!window.confirm('Bu sosyal bağlantı kaldırılsın mı?')) return;
    setBusyId(id);
    setError(null);
    try {
      await vh.delete(`social/connections/${id}`);
      setItems((current) => current.filter((item) => item.id !== id));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Bağlantı kaldırılamadı.');
    } finally {
      setBusyId(null);
    }
  }

  function dismissNotice() {
    setNoticeDismissed(true);
    router.replace('/ayarlar/sosyal');
  }

  return (
    <div className="social-settings">
      {showNotice ? (
        <div
          className={`social-notice${result.social === 'connected' ? ' is-success' : ' is-error'}`}
          role="status"
        >
          <Icon name={result.social === 'connected' ? 'check' : 'bell'} size={17} />
          <span>
            {result.social === 'connected'
              ? `${result.accounts ?? 1} sosyal hesap bağlandı. Artık varlık detayından paylaşabilirsin.`
              : reasonMessages[result.reason ?? ''] ??
                'Sosyal bağlantı tamamlanamadı.'}
          </span>
          <button type="button" className="icon-btn" onClick={dismissNotice} aria-label="Kapat">
            <Icon name="close" size={15} />
          </button>
        </div>
      ) : null}

      <section className={`aside-card social-status${config.configured ? ' is-ready' : ''}`}>
        <div className="social-status-head">
          <span className="social-status-icon">
            <Icon name="share" size={20} />
          </span>
          <div>
            <span className="eyebrow">META ENTEGRASYONU</span>
            <h2>
              {config.configured
                ? 'Paylaşım altyapısı hazır'
                : 'Kurulum birkaç adım uzakta'}
            </h2>
          </div>
          <span className={`status-pill ${config.configured ? 'is-active' : 'is-pending'}`}>
            {config.configured ? 'Yapılandırıldı' : 'Kurulum gerekli'}
          </span>
        </div>

        {!config.configured ? (
          <>
            <p className="social-lede">
              Gerçek Facebook ve Instagram paylaşımı için Meta uygulama bilgileri
              gerekiyor. Eksik değişkenler:
            </p>
            <p className="social-missing">
              {config.missing.map((name) => (
                <code key={name}>{name}</code>
              ))}
            </p>
            <ol className="social-steps">
              <li>
                <strong>Meta uygulaması oluştur.</strong> Meta for Developers’ta yeni
                bir uygulama açıp Facebook Login ve Instagram Graph API ürünlerini ekle.
              </li>
              <li>
                <strong>Dönüş adresini tanımla.</strong> Facebook Login &gt; Ayarlar
                bölümüne şu adresi ekle:
                <code>{config.redirectUri}</code>
              </li>
              <li>
                <strong>API ortamını doldur.</strong> <code>api/.env</code> içine
                <code>META_APP_ID</code>, <code>META_APP_SECRET</code> ve en az 16
                karakterlik <code>SOCIAL_TOKEN_KEY</code> ekle; API’yi yeniden başlat.
              </li>
              <li>
                <strong>Sayfa ve Instagram hesabını hazırla.</strong> Facebook
                Sayfanın olması, Instagram paylaşımı için de sayfaya bağlı bir
                Instagram Business hesabı gerekiyor.
              </li>
              <li>
                <strong>Instagram medyasını yayınla.</strong> Yerel depolamada
                <code>MEDIA_PUBLIC_BASE_URL</code> ile herkese açık HTTPS adresi
                tanımla veya S3 depolamaya geç. Facebook paylaşımı bundan etkilenmez.
              </li>
            </ol>
          </>
        ) : (
          <p className="social-lede">
            Facebook Sayfanı bağlayarak başla. Sayfaya bağlı Instagram Business
            hesabı varsa otomatik olarak eklenir. Grafik API sürümü:{' '}
            <strong>{config.graphVersion}</strong>.
          </p>
        )}

        {config.configured && !config.mediaPublicReady ? (
          <p className="form-note is-warning">
            <Icon name="lock" size={15} />
            Instagram paylaşımı için medya adresi henüz herkese açık değil.
            Facebook gönderi, hikâye ve Reels paylaşımı kullanılabilir.
          </p>
        ) : null}

        <div className="social-status-actions">
          {config.configured ? (
            <a className="btn btn-primary" href="/api/social/start">
              <Icon name="facebook" size={17} />
              Facebook ile bağlan
            </a>
          ) : (
            <button type="button" className="btn btn-primary" disabled>
              <Icon name="facebook" size={17} />
              Facebook ile bağlan
            </button>
          )}
          <small>
            Gerekli izinler: sayfa listesi, sayfa içeriği yönetimi, Instagram içerik
            yayınlama.
          </small>
        </div>
      </section>

      <section className="aside-card social-connections">
        <div className="social-section-head">
          <div>
            <span className="eyebrow">BAĞLI HESAPLAR</span>
            <h2>{items.length > 0 ? `${items.length} bağlantı` : 'Henüz bağlantı yok'}</h2>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {items.length === 0 ? (
          <p className="muted-note">
            Facebook ile bağlan dediğinde izin verdiğin sayfalar ve varsa bağlı
            Instagram Business hesapları burada listelenir.
          </p>
        ) : (
          <ul className="social-connection-list">
            {items.map((item) => (
              <li className="social-connection" key={item.id}>
                <span className={`social-provider is-${item.provider}`}>
                  <Icon name={item.provider === 'facebook' ? 'facebook' : 'instagram'} size={18} />
                </span>
                <span className="social-connection-text">
                  <strong>{item.accountName}</strong>
                  <small>
                    {item.provider === 'facebook'
                      ? 'Facebook Sayfası'
                      : `Instagram Business · ${item.pageName} sayfasına bağlı`}
                    {item.accountUsername ? ` · @${item.accountUsername}` : ''}
                  </small>
                  <small className="social-connection-date">
                    {formatDate(item.createdAt)} tarihinde bağlandı
                  </small>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busyId === item.id}
                  onClick={() => disconnect(item.id)}
                >
                  <Icon name="logout" size={15} />
                  {busyId === item.id ? 'Kaldırılıyor…' : 'Kaldır'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="aside-card social-formats">
        <span className="eyebrow">PAYLAŞIM BİÇİMLERİ</span>
        <div className="social-format-grid">
          <div>
            <Icon name="image" size={18} />
            <strong>Gönderi</strong>
            <small>Facebook Sayfasında fotoğraf veya video gönderisi.</small>
          </div>
          <div>
            <Icon name="sparkles" size={18} />
            <strong>Hikâye</strong>
            <small>Kapak fotoğrafı 24 saatlik hikâye olarak paylaşılır.</small>
          </div>
          <div>
            <Icon name="camera" size={18} />
            <strong>Reels</strong>
            <small>Varlığa bağlı videolar dikey Reels olarak yayınlanır.</small>
          </div>
        </div>
      </section>
    </div>
  );
}
