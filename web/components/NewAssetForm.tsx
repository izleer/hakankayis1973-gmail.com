'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { uploadMedia, vh } from '@/lib/client';
import { typeIconName, visibilityHints, visibilityLabels } from '@/lib/format';
import { useT } from '@/lib/i18n/client';
import type { Asset, AssetType, AttributeField, Visibility } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';

type Leaf = AssetType & { parentLabel: string | null };

function flattenTypes(types: AssetType[]): Leaf[] {
  const leaves: Leaf[] = [];
  for (const root of types) {
    if (root.children.length === 0) {
      leaves.push({ ...root, parentLabel: null });
    } else {
      for (const child of root.children) {
        if (child.children.length === 0) leaves.push({ ...child, parentLabel: root.label });
      }
    }
  }
  return leaves;
}

export function NewAssetForm({ types }: { types: AssetType[] }) {
  const router = useRouter();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [typeId, setTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acquiredAt, setAcquiredAt] = useState('');
  const [locationName, setLocationName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryBody, setEntryBody] = useState('');
  const [entryType, setEntryType] = useState('note');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const leaves = useMemo(() => flattenTypes(types), [types]);
  const selected = leaves.find((leaf) => leaf.id === typeId) ?? null;
  const fields: AttributeField[] = selected?.attributesSchema?.fields ?? [];

  function chooseCover(file: File | null) {
    setCover(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!typeId) {
      setError(t('Bir varlık türü seçin.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let coverMediaId: string | null = null;
      if (cover) {
        const media = await uploadMedia(cover);
        coverMediaId = media.id;
      }

      const payload = {
        typeId,
        title,
        description: description || null,
        visibility,
        acquiredAt: acquiredAt || null,
        locationName: locationName || null,
        attributes: Object.fromEntries(
          Object.entries(attributes).filter(([, value]) => value !== ''),
        ),
        coverMediaId,
        initialEntry:
          entryTitle || entryBody
            ? {
                type: entryType,
                title: entryTitle || null,
                body: entryBody || null,
              }
            : null,
      };
      const data = await vh.post<{ asset: Asset }>('assets', payload);
      router.push(`/varliklar/${data.asset.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('Varlık eklenemedi.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="editor" onSubmit={submit}>
      <section className="form-section">
        <div className="form-section-head">
          <span className="step">01</span>
          <div>
            <h2>{t('Ne kaydediyorsun?')}</h2>
            <p>{t('Canlı, büyüyen ya da süreci olan bir şey seç.')}</p>
          </div>
        </div>
        <div className="type-groups">
          {types.map((root) => {
            const options = root.children.length > 0 ? root.children : [root];
            return (
              <div key={root.id} className="type-group">
                <span className="type-group-label">
                  <Icon name={typeIconName(root.icon)} size={15} />
                  {root.label}
                </span>
                <div className="type-options">
                  {options.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`type-option${typeId === option.id ? ' is-selected' : ''}`}
                      onClick={() => {
                        setTypeId(option.id);
                        setAttributes({});
                      }}
                    >
                      <Icon name={typeIconName(option.icon)} size={20} />
                      <span>{option.label}</span>
                      {typeId === option.id ? (
                        <span className="type-check">
                          <Icon name="check" size={13} />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <span className="step">02</span>
          <div>
            <h2>{t('Temel bilgiler')}</h2>
            <p>{t('Bu varlığı yıllar sonra hatırlamanı sağlayacak kısa bilgiler.')}</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field wide">
            <span>{t('Adı')}</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('Örn. On iki yaşındaki Ficus')}
              maxLength={120}
              required
            />
          </label>
          <label className="field wide">
            <span>{t('Açıklama')}</span>
            <textarea
              className="textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('Bu varlığın hikâyesi, sana ne ifade ettiği…')}
              rows={3}
              maxLength={2000}
            />
          </label>
          <label className="field">
            <span>{t('Hayatına girdiği tarih')}</span>
            <input
              className="input"
              type="date"
              value={acquiredAt}
              onChange={(event) => setAcquiredAt(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('Konum')}</span>
            <input
              className="input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="İstanbul, Kadıköy"
              maxLength={160}
            />
          </label>
          {fields.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label}</span>
              <input
                className="input"
                type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                value={attributes[field.key] ?? ''}
                onChange={(event) =>
                  setAttributes((current) => ({ ...current, [field.key]: event.target.value }))
                }
                placeholder={field.type === 'date' ? undefined : field.label}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <span className="step">03</span>
          <div>
            <h2>{t('Kimler görebilsin?')}</h2>
            <p>{t('Varsayılan olarak özeldir. İstediğin zaman değiştirebilirsin.')}</p>
          </div>
        </div>
        <div className="visibility-options">
          {(['private', 'selected', 'public'] as Visibility[]).map((option) => (
            <button
              type="button"
              key={option}
              className={`visibility-option${visibility === option ? ' is-selected' : ''}`}
              onClick={() => setVisibility(option)}
            >
              <Icon
                name={option === 'private' ? 'lock' : option === 'selected' ? 'users' : 'eye'}
                size={18}
              />
              <span>
                <strong>{t(visibilityLabels[option])}</strong>
                <small>{t(visibilityHints[option])}</small>
              </span>
              {visibility === option ? (
                <span className="type-check">
                  <Icon name="check" size={13} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <span className="step">04</span>
          <div>
            <h2>{t('Bir kapak fotoğrafı')}</h2>
            <p>{t('Hafızanın ilk izi. JPG, PNG, WEBP veya GIF; en fazla 10 MB.')}</p>
          </div>
        </div>
        <div className="cover-upload">
          <div className={`cover-preview${preview ? ' has-image' : ''}`}>
            {preview ? (
              <img src={preview} alt={t('Kapak önizleme')} />
            ) : (
              <MediaImage
                src={null}
                alt=""
                fallbackIcon={selected ? typeIconName(selected.icon) : 'image'}
              />
            )}
          </div>
          <div className="cover-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              hidden
              onChange={(event) => chooseCover(event.target.files?.[0] ?? null)}
            />
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={17} />
              {cover ? t('Başka bir fotoğraf seç') : t('Fotoğraf seç')}
            </button>
            {cover ? (
              <button type="button" className="text-link muted" onClick={() => chooseCover(null)}>
                {t('Kaldır')}
              </button>
            ) : null}
            <small>{t('Kapak sonradan da eklenebilir.')}</small>
          </div>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-head">
          <span className="step">05</span>
          <div>
            <h2>
              {t('İlk not')} <em>{t('(isteğe bağlı)')}</em>
            </h2>
            <p>{t('Bugünü kaydetmek için küçük bir başlangıç.')}</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>{t('Kayıt türü')}</span>
            <select
              className="select"
              value={entryType}
              onChange={(event) => setEntryType(event.target.value)}
            >
              <option value="note">{t('Not')}</option>
              <option value="acquisition">{t('Edinme')}</option>
              <option value="photo">{t('Fotoğraf')}</option>
              <option value="maintenance">{t('Bakım')}</option>
              <option value="event">{t('Dönüm noktası')}</option>
              <option value="health">{t('Sağlık')}</option>
            </select>
          </label>
          <label className="field">
            <span>{t('Başlık')}</span>
            <input
              className="input"
              value={entryTitle}
              onChange={(event) => setEntryTitle(event.target.value)}
              placeholder={t('Örn. İlk gün')}
              maxLength={140}
            />
          </label>
          <label className="field wide">
            <span>{t('Not')}</span>
            <textarea
              className="textarea"
              value={entryBody}
              onChange={(event) => setEntryBody(event.target.value)}
              placeholder={t('Bu varlıkla ilgili saklamak istediğin ilk şey…')}
              rows={3}
              maxLength={5000}
            />
          </label>
        </div>
      </section>

      {error ? (
        <div className="form-error" role="alert">
          <Icon name="close" size={16} />
          {error}
        </div>
      ) : null}

      <div className="editor-actions">
        <Link href="/varliklar" className="btn btn-ghost">
          {t('Vazgeç')}
        </Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t('Kaydediliyor…') : t('Hafızaya ekle')}
          {!busy ? <Icon name="arrow-right" size={18} /> : null}
        </button>
      </div>
    </form>
  );
}
