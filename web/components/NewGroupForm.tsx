'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { uploadMedia, vh } from '@/lib/client';
import { useT } from '@/lib/i18n/client';
import type { Group, GroupJoinPolicy } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

const categories = [
  'Bitkiler',
  'Klasik araçlar',
  'Ev & mekân',
  'Evcil hayvanlar',
  'Sanat & koleksiyon',
  'Bisiklet',
  'El işi',
  'Diğer',
];

export function NewGroupForm() {
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Bitkiler');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [joinPolicy, setJoinPolicy] = useState<GroupJoinPolicy>('open');
  const [rules, setRules] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseCover(file: File | null) {
    setCover(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let coverUrl: string | null = null;
      if (cover) {
        const media = await uploadMedia(cover);
        coverUrl = media.url;
      }
      const data = await vh.post<{ community: Group }>('communities', {
        name: name.trim(),
        description: description.trim() || null,
        category: category || null,
        rules: rules.trim() || null,
        visibility,
        joinPolicy,
        coverUrl,
      });
      router.push(`/gruplar/${data.community.slug}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Grup oluşturulamadı.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="editor group-editor" onSubmit={submit}>
      <section className="form-section">
        <div className="form-section-head">
          <span className="step">01</span>
          <div>
            <h2>{t('Grubun kimliği')}</h2>
            <p>{t('İnsanların ne için bir araya geldiğini birkaç cümleyle anlat.')}</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field wide">
            <span>{t('Grup adı')}</span>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('Örn. İzmir Bonsai Topluluğu')}
              maxLength={80}
              required
            />
          </label>
          <label className="field wide">
            <span>{t('Açıklama')}</span>
            <textarea
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('Grubun amacı, konusu ve kapsamı…')}
              rows={3}
              maxLength={1000}
            />
          </label>
          <label className="field">
            <span>{t('Kategori')}</span>
            <select
              className="select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {t(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('Kimler katılabilir?')}</span>
            <select
              className="select"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
            >
              <option value="public">{t('Herkese açık grup')}</option>
              <option value="private">{t('Özel grup (yalnızca davetle)')}</option>
            </select>
          </label>
          <label className="field">
            <span>{t('Katılım modeli')}</span>
            <select
              className="select"
              value={joinPolicy}
              onChange={(event) => setJoinPolicy(event.target.value as GroupJoinPolicy)}
              disabled={visibility === 'private'}
            >
              <option value="open">{t('Serbest katılım')}</option>
              <option value="approval">{t('Yönetici onayı')}</option>
            </select>
            <small>
              {visibility === 'private'
                ? t('Özel gruplarda katılım yalnızca davetle olur.')
                : joinPolicy === 'approval'
                  ? t('Katılmak isteyenler onayınızı bekler.')
                  : t('Üyelik, katılma isteğiyle hemen açılır.')}
            </small>
          </label>
          <label className="field">
            <span>{t('Kapak görseli')}</span>
            <span className="cover-picker">
              <span className="cover-preview">
                {preview ? (
                  <img src={preview} alt="" />
                ) : (
                  <MediaImage src={null} alt="" fallbackIcon="users" />
                )}
              </span>
              <span className="cover-picker-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Icon name="upload" size={15} />
                  {t('Görsel seç')}
                </button>
                {cover ? <small>{cover.name}</small> : null}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => chooseCover(event.target.files?.[0] ?? null)}
              />
            </span>
          </label>
          <label className="field wide">
            <span>{t('Grup kuralları')}</span>
            <textarea
              className="textarea"
              value={rules}
              onChange={(event) => setRules(event.target.value)}
              placeholder={t('Nazik ol, kaynak belirt, satış baskısı kurma…')}
              rows={4}
              maxLength={2000}
            />
          </label>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="editor-actions">
        <Link href="/gruplar" className="btn btn-ghost">
          {t('Vazgeç')}
        </Link>
        <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 2}>
          <Icon name="users" size={17} />
          {busy ? t('Oluşturuluyor…') : t('Grubu oluştur')}
        </button>
      </div>
    </form>
  );
}
