'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { uploadMedia, vh } from '@/lib/client';
import { typeIconName, visibilityHints, visibilityLabels } from '@/lib/format';
import { useT } from '@/lib/i18n/client';
import type { Asset, AssetType, AttributeField, CustomField, Visibility } from '@/lib/types';
import { Icon } from './Icons';
import { MediaImage } from './MediaImage';
import {
  CustomFieldsEditor,
  prepareCustomFields,
  TemplateFields,
} from './TemplateFieldsEditor';
import { ViewerPicker } from './ViewerPicker';

type Selectable = AssetType & { path: string[] };

function isSelectable(type: AssetType): boolean {
  return (
    type.isSelectable ??
    (type.children.length === 0 || (type.attributesSchema?.fields?.length ?? 0) > 0)
  );
}

/** Alt kategoriler dahil seçilebilir tüm türleri, üst kategori yoluyla birlikte toplar. */
function collectSelectable(types: AssetType[], path: string[] = []): Selectable[] {
  const items: Selectable[] = [];
  for (const type of types) {
    if (isSelectable(type)) items.push({ ...type, path });
    items.push(...collectSelectable(type.children, [...path, type.label]));
  }
  return items;
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
  const [viewerIds, setViewerIds] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryBody, setEntryBody] = useState('');
  const [entryType, setEntryType] = useState('note');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectable = useMemo(() => collectSelectable(types), [types]);
  const selected = selectable.find((leaf) => leaf.id === typeId) ?? null;
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
    if (visibility === 'selected' && viewerIds.length === 0) {
      setError(t('Seçili kişiler görünürlüğü için en az bir kişi seçin.'));
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
        viewerIds: visibility === 'selected' ? viewerIds : undefined,
        acquiredAt: acquiredAt || null,
        locationName: locationName || null,
        attributes: Object.fromEntries(
          Object.entries(attributes).filter(([, value]) => value !== ''),
        ),
        customFields: prepareCustomFields(customFields),
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
            const options = collectSelectable([root]);
            if (options.length === 0) return null;
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
                      <span className="type-option-copy">
                        <span>{option.label}</span>
                        {option.path.length > 0 ? (
                          <small>{option.path.slice(1).join(' · ')}</small>
                        ) : null}
                      </span>
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
        </div>

        {selected && fields.length > 0 ? (
          <div className="form-subsection">
            <div>
              <h3>{t('Kategori alanları')}</h3>
              <p>{t('Seçtiğin kategorinin hazır alanları.')}</p>
            </div>
            <TemplateFields
              fields={fields}
              values={attributes}
              onChange={setAttributes}
              disabled={busy}
            />
          </div>
        ) : null}

        {selected ? (
          <div className="form-subsection">
            <div>
              <h3>{t('Özel alanlar')}</h3>
              <p>{t('Hazır alanların dışında kendi bilgilerini ekleyebilirsin.')}</p>
            </div>
            <CustomFieldsEditor
              value={customFields}
              onChange={setCustomFields}
              disabled={busy}
            />
          </div>
        ) : null}
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
          {(['private', 'selected', 'friends', 'public'] as Visibility[]).map((option) => (
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
        {visibility === 'selected' ? (
          <ViewerPicker selected={viewerIds} onChange={setViewerIds} disabled={busy} />
        ) : null}
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
