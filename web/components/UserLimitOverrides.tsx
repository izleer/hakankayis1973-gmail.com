'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { vh } from '@/lib/client';
import { formatDateTime } from '@/lib/format';
import type {
  Plan,
  PlanLimitMode,
  UserLimitOverride,
  UserMini,
} from '@/lib/types';

const MB = 1024 * 1024;

const MODE_LABEL: Record<PlanLimitMode, string> = {
  enforce: 'Zorunlu',
  warn: 'Uyarı',
  shadow: 'Gölge',
};

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Ücretsiz',
  premium: 'Premium',
  plus: 'Plus',
};

const SCOPE_LABEL: Record<string, string> = {
  all: 'Tüm dosyalar',
  image: 'Görseller',
  video: 'Videolar',
  document: 'Belgeler',
};

type LimitMeta = { label: string; hint: string; unit: 'count' | 'mb' };

const LIMITS: Record<string, LimitMeta> = {
  max_assets: {
    label: 'Varlık sayısı',
    hint: 'Kullanıcının oluşturabileceği toplam varlık.',
    unit: 'count',
  },
  max_entries_per_asset: {
    label: 'Varlık başına kayıt',
    hint: 'Tek bir varlığa eklenebilecek hareket sayısı.',
    unit: 'count',
  },
  max_media_per_entry: {
    label: 'Kayıt başına dosya',
    hint: 'Bir harekete bağlanabilecek fotoğraf/belge sayısı.',
    unit: 'count',
  },
  max_media_per_asset: {
    label: 'Varlık başına toplam dosya',
    hint: 'Varlığın tüm kayıtlarındaki dosya toplamı.',
    unit: 'count',
  },
  max_file_bytes: {
    label: 'Tek dosya boyutu',
    hint: 'Yüklenebilecek en büyük tek dosya; türe özel tanımlanabilir.',
    unit: 'mb',
  },
  max_storage_bytes: {
    label: 'Toplam depolama',
    hint: 'Kullanıcının tüm dosyalarının toplam kotası.',
    unit: 'mb',
  },
};

const LIMIT_KEYS = Object.keys(LIMITS);

type FormState = {
  limitKey: string;
  scope: string;
  value: string;
  unlimited: boolean;
  mode: PlanLimitMode;
  warningPct: string;
  active: boolean;
  expiresAt: string;
  note: string;
};

function blankForm(): FormState {
  return {
    limitKey: 'max_assets',
    scope: 'all',
    value: '',
    unlimited: false,
    mode: 'enforce',
    warningPct: '80',
    active: true,
    expiresAt: '',
    note: '',
  };
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function formatLimit(limitKey: string, value: number | null): string {
  if (value === null) return 'Sınırsız';
  if (LIMITS[limitKey]?.unit === 'mb') {
    const mb = Math.round((value / MB) * 100) / 100;
    return `${mb} MB`;
  }
  return String(value);
}

function overrideLabel(item: UserLimitOverride): string {
  const label = LIMITS[item.limitKey]?.label ?? item.limitKey;
  return item.scope === 'all'
    ? label
    : `${label} · ${SCOPE_LABEL[item.scope] ?? item.scope}`;
}

export function UserLimitOverrides() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserMini[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<(UserMini & { plan: Plan }) | null>(null);
  const [overrides, setOverrides] = useState<UserLimitOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);

  const loadUser = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await vh.get<{
        user: UserMini & { plan: Plan };
        items: UserLimitOverride[];
      }>(`admin/users/${userId}/limit-overrides`);
      setSelected(data.user);
      setOverrides(data.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İstisnalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    setSearched(true);
    setError(null);
    setNotice(null);
    try {
      const data = await vh.get<{ items: UserMini[] }>(
        `admin/users?q=${encodeURIComponent(query.trim())}&limit=20`,
      );
      setResults(data.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Kullanıcılar aranamadı.');
    } finally {
      setSearching(false);
    }
  }

  function openUser(user: UserMini) {
    setForm(blankForm());
    setNotice(null);
    setError(null);
    void loadUser(user.id);
  }

  function edit(item: UserLimitOverride) {
    const meta = LIMITS[item.limitKey];
    setForm({
      limitKey: item.limitKey,
      scope: item.scope,
      value:
        item.maxValue === null
          ? ''
          : meta?.unit === 'mb'
            ? String(Math.round((item.maxValue / MB) * 100) / 100)
            : String(item.maxValue),
      unlimited: item.maxValue === null,
      mode: item.mode,
      warningPct: String(item.warningPct),
      active: item.active,
      expiresAt: toLocalInput(item.expiresAt),
      note: item.note ?? '',
    });
    setNotice(null);
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const meta = LIMITS[form.limitKey];
    if (!meta) return;
    const warningPct = Number(form.warningPct);
    if (!Number.isInteger(warningPct) || warningPct < 1 || warningPct > 100) {
      setError('Uyarı yüzdesi 1–100 arasında olmalı.');
      return;
    }
    let maxValue: number | null = null;
    if (!form.unlimited) {
      const parsed = Number(form.value.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('Geçerli, negatif olmayan bir değer gir.');
        return;
      }
      maxValue = meta.unit === 'mb' ? Math.round(parsed * MB) : Math.round(parsed);
    }
    let expiresAt: string | null = null;
    if (form.expiresAt) {
      const parsed = new Date(form.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        setError('Geçersiz son kullanma tarihi.');
        return;
      }
      expiresAt = parsed.toISOString();
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await vh.patch(`admin/users/${selected.id}/limit-overrides`, {
        limitKey: form.limitKey,
        scope: form.limitKey === 'max_file_bytes' ? form.scope : 'all',
        maxValue,
        mode: form.mode,
        warningPct,
        active: form.active,
        note: form.note.trim() || null,
        expiresAt,
      });
      setNotice('İstisna kaydedildi. Kullanıcının sınırları anında güncellendi.');
      setForm(blankForm());
      await loadUser(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İstisna kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: UserLimitOverride) {
    if (!selected) return;
    if (!window.confirm(`${overrideLabel(item)} istisnasını kaldırmak istiyor musun?`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await vh.delete(
        `admin/users/${selected.id}/limit-overrides?limitKey=${encodeURIComponent(
          item.limitKey,
        )}&scope=${encodeURIComponent(item.scope)}`,
      );
      setNotice('İstisna kaldırıldı; plan kuralı yeniden geçerli.');
      await loadUser(selected.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İstisna kaldırılamadı.');
    } finally {
      setBusy(false);
    }
  }

  const scopeAllowed = form.limitKey === 'max_file_bytes';

  return (
    <section className="admin-panel" aria-labelledby="admin-overrides-title">
      <header className="admin-plan-head">
        <div>
          <h2 id="admin-overrides-title">Kullanıcıya özel istisnalar</h2>
          <p className="admin-actions-note">
            Plan kuralından önce uygulanır. Tek bir kullanıcıya ek kota verebilir ya da
            süreli bir istisna tanımlayabilirsin.
          </p>
        </div>
      </header>

      <form className="admin-user-search" onSubmit={search}>
        <input
          className="input"
          placeholder="Kullanıcı adı veya isim ara"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={80}
        />
        <button type="submit" className="btn" disabled={searching}>
          {searching ? 'Aranıyor…' : 'Ara'}
        </button>
      </form>

      {searched && results.length === 0 && !searching ? (
        <p className="admin-empty">Eşleşen kullanıcı bulunamadı.</p>
      ) : null}
      {results.length > 0 ? (
        <div className="admin-user-results">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              className={`admin-user-item${
                selected?.id === user.id ? ' is-active' : ''
              }`}
              onClick={() => openUser(user)}
            >
              <strong>{user.displayName}</strong>
              <small>@{user.username}</small>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className="admin-overrides">
          <div className="admin-plan-head">
            <div className="admin-user-heading">
              <h2>
                {selected.displayName} <small>@{selected.username}</small>
              </h2>
              <span className="admin-plan-chip">{PLAN_LABEL[selected.plan]}</span>
            </div>
          </div>

          {loading ? (
            <p className="admin-empty">Yükleniyor…</p>
          ) : overrides.length === 0 ? (
            <p className="admin-empty">Bu kullanıcı için istisna tanımlı değil.</p>
          ) : (
            <div className="admin-override-list">
              {overrides.map((item) => (
                <article key={`${item.limitKey}:${item.scope}`} className="admin-override-item">
                  <div className="admin-rule-name">
                    <strong>{overrideLabel(item)}</strong>
                    <small>
                      {formatLimit(item.limitKey, item.maxValue)} · {MODE_LABEL[item.mode]} ·
                      uyarı %{item.warningPct}
                      {item.active ? '' : ' · pasif'}
                    </small>
                    {item.expiresAt ? (
                      <small className="admin-rule-updated">
                        Son geçerlilik: {formatDateTime(item.expiresAt)}
                      </small>
                    ) : null}
                    {item.note ? <small>{item.note}</small> : null}
                    {item.updatedAt ? (
                      <small className="admin-rule-updated">
                        Güncellendi: {formatDateTime(item.updatedAt)}
                        {item.updatedByUsername ? ` · @${item.updatedByUsername}` : ''}
                      </small>
                    ) : null}
                  </div>
                  <div className="admin-override-actions">
                    <button type="button" className="btn" onClick={() => edit(item)} disabled={busy}>
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => remove(item)}
                      disabled={busy}
                    >
                      Kaldır
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <form className="admin-override-form" onSubmit={save}>
            <h3>İstisna ekle / güncelle</h3>
            <div className="admin-rule">
              <div className="admin-rule-name">
                <strong>{LIMITS[form.limitKey]?.label ?? 'Sınır'}</strong>
                <small>{LIMITS[form.limitKey]?.hint}</small>
              </div>
              <div className="admin-rule-fields">
                <label className="field admin-field-value">
                  <span>Limit</span>
                  <select
                    className="select"
                    value={form.limitKey}
                    disabled={busy}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        limitKey: event.target.value,
                        scope: event.target.value === 'max_file_bytes' ? current.scope : 'all',
                        value: '',
                        unlimited: false,
                      }))
                    }
                  >
                    {LIMIT_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {LIMITS[key]?.label}
                      </option>
                    ))}
                  </select>
                </label>
                {scopeAllowed ? (
                  <label className="field admin-field-mode">
                    <span>Kapsam</span>
                    <select
                      className="select"
                      value={form.scope}
                      disabled={busy}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, scope: event.target.value }))
                      }
                    >
                      <option value="all">{SCOPE_LABEL.all}</option>
                      <option value="image">{SCOPE_LABEL.image}</option>
                      <option value="video">{SCOPE_LABEL.video}</option>
                      <option value="document">{SCOPE_LABEL.document}</option>
                    </select>
                  </label>
                ) : null}
                <label className="field admin-field-value">
                  <span>{LIMITS[form.limitKey]?.unit === 'mb' ? 'MB' : 'Adet'}</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={form.unlimited ? '' : form.value}
                    disabled={form.unlimited || busy}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, value: event.target.value }))
                    }
                  />
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.unlimited}
                    disabled={busy}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, unlimited: event.target.checked }))
                    }
                  />
                  Sınırsız
                </label>
                <label className="field admin-field-mode">
                  <span>Mod</span>
                  <select
                    className="select"
                    value={form.mode}
                    disabled={busy}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        mode: event.target.value as PlanLimitMode,
                      }))
                    }
                  >
                    <option value="enforce">{MODE_LABEL.enforce}</option>
                    <option value="warn">{MODE_LABEL.warn}</option>
                    <option value="shadow">{MODE_LABEL.shadow}</option>
                  </select>
                </label>
                <label className="field admin-field-warning">
                  <span>Uyarı %</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={100}
                    value={form.warningPct}
                    disabled={busy}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, warningPct: event.target.value }))
                    }
                  />
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.active}
                    disabled={busy}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, active: event.target.checked }))
                    }
                  />
                  Etkin
                </label>
                <label className="field admin-field-expiry">
                  <span>Son geçerlilik (isteğe bağlı)</span>
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.expiresAt}
                    disabled={busy}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, expiresAt: event.target.value }))
                    }
                  />
                </label>
                <label className="field admin-field-note">
                  <span>Not (isteğe bağlı)</span>
                  <input
                    className="input"
                    maxLength={500}
                    placeholder="Örn. destek talebi #123"
                    value={form.note}
                    disabled={busy}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, note: event.target.value }))
                    }
                  />
                </label>
              </div>
            </div>
            <div className="admin-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Kaydediliyor…' : 'İstisnayı kaydet'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setForm(blankForm())}
                disabled={busy}
              >
                Formu temizle
              </button>
              <p className="admin-actions-note">
                İstisna, plan kuralından önce uygulanır. Süresi geçen istisnalar yok sayılır;
                mevcut veriler hiçbir durumda silinmez.
              </p>
            </div>
          </form>

          {notice ? (
            <p className="plan-notice" role="status">
              {notice}
            </p>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : null}
    </section>
  );
}
