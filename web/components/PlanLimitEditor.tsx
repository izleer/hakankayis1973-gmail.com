'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { vh } from '@/lib/client';
import { formatDateTime } from '@/lib/format';
import type {
  Plan,
  PlanLimitHistoryItem,
  PlanLimitMode,
  PlanLimitRule,
} from '@/lib/types';

const PLAN_ORDER: Plan[] = ['free', 'premium', 'plus'];
const PLAN_LABEL: Record<Plan, string> = {
  free: 'Ücretsiz',
  premium: 'Premium',
  plus: 'Plus',
};
const MODE_LABEL: Record<PlanLimitMode, string> = {
  enforce: 'Zorunlu',
  warn: 'Uyarı',
  shadow: 'Gölge',
};
const MB = 1024 * 1024;

type LimitMeta = { label: string; hint: string; unit: 'count' | 'mb' };

const LIMITS: Record<string, LimitMeta> = {
  max_assets: {
    label: 'Varlık sayısı',
    hint: 'Bir kullanıcının oluşturabileceği toplam varlık.',
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
    hint: 'Yüklenebilecek en büyük tek dosya.',
    unit: 'mb',
  },
  max_storage_bytes: {
    label: 'Toplam depolama',
    hint: 'Kullanıcının tüm dosyalarının toplam kotası.',
    unit: 'mb',
  },
};

const SCOPE_LABEL: Record<string, string> = {
  all: 'Tüm dosyalar',
  image: 'Görseller',
  video: 'Videolar',
  document: 'Belgeler',
};

const FILE_SCOPES = ['all', 'image', 'video', 'document'] as const;

type Draft = {
  value: string;
  unlimited: boolean;
  mode: PlanLimitMode;
  warningPct: string;
  active: boolean;
};

function keyOf(rule: PlanLimitRule): string {
  return `${rule.plan}:${rule.limitKey}:${rule.scope}`;
}

function draftOf(rule: PlanLimitRule): Draft {
  const meta = LIMITS[rule.limitKey];
  const bytes = rule.maxValue;
  return {
    value:
      bytes === null
        ? ''
        : meta?.unit === 'mb'
          ? String(Math.round((bytes / MB) * 100) / 100)
          : String(bytes),
    unlimited: bytes === null,
    mode: rule.mode,
    warningPct: String(rule.warningPct),
    active: rule.active,
  };
}

function formatBytes(value: number | null): string {
  if (value === null) return 'Sınırsız';
  if (value >= MB) return `${Math.round((value / MB) * 100) / 100} MB`;
  return `${value} bayt`;
}

function historyValue(limitKey: string, value: unknown): string {
  if (value === null || value === undefined) return 'Sınırsız';
  const meta = LIMITS[limitKey];
  if (meta?.unit === 'mb') return formatBytes(Number(value));
  return String(value);
}

export function PlanLimitEditor({
  rules,
  history,
}: {
  rules: PlanLimitRule[];
  history: PlanLimitHistoryItem[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(rules.map((rule) => [keyOf(rule), draftOf(rule)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function update(rule: PlanLimitRule, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [keyOf(rule)]: { ...(current[keyOf(rule)] ?? draftOf(rule)), ...patch },
    }));
  }

  async function save() {
    setError(null);
    setNotice(null);
    const updates: Record<string, unknown>[] = [];
    for (const rule of rules) {
      const meta = LIMITS[rule.limitKey];
      const draft = drafts[keyOf(rule)];
      if (!meta || !draft) continue;
      const warningPct = Number(draft.warningPct);
      if (!Number.isInteger(warningPct) || warningPct < 1 || warningPct > 100) {
        setError(`${meta.label}: uyarı yüzdesi 1–100 arasında olmalı.`);
        return;
      }
      let maxValue: number | null = null;
      if (!draft.unlimited) {
        const parsed = Number(draft.value.replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed < 0) {
          setError(`${meta.label}: geçerli, negatif olmayan bir değer gir.`);
          return;
        }
        maxValue = meta.unit === 'mb' ? Math.round(parsed * MB) : Math.round(parsed);
      }
      const unchanged =
        rule.maxValue === maxValue &&
        rule.mode === draft.mode &&
        rule.warningPct === warningPct &&
        rule.active === draft.active;
      if (unchanged) continue;
      updates.push({
        plan: rule.plan,
        limitKey: rule.limitKey,
        scope: rule.scope,
        maxValue,
        mode: draft.mode,
        warningPct,
        active: draft.active,
      });
    }
    if (updates.length === 0) {
      setNotice('Kaydedilecek değişiklik yok.');
      return;
    }
    setBusy(true);
    try {
      const result = await vh.patch<{ updated: number }>('admin/plan-limits', { updates });
      setNotice(`${result.updated} kural güncellendi. Yeni değerler anında geçerli.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Limitler kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  function renderRule(rule: PlanLimitRule) {
    const meta = LIMITS[rule.limitKey];
    const draft = drafts[keyOf(rule)];
    if (!meta || !draft) return null;
    const id = keyOf(rule).replace(/[^a-z0-9]+/gi, '-');
    const scopeLabel = rule.scope !== 'all' ? SCOPE_LABEL[rule.scope] ?? rule.scope : null;
    return (
      <div key={keyOf(rule)} className="admin-rule">
        <div className="admin-rule-name">
          <strong>{scopeLabel ? `${meta.label} · ${scopeLabel}` : meta.label}</strong>
          <small>
            {scopeLabel
              ? 'Türe özel sınır; etkin değilse genel kural geçerlidir.'
              : meta.hint}
          </small>
          {rule.updatedAt ? (
            <small className="admin-rule-updated">
              Son: {formatDateTime(rule.updatedAt)}
              {rule.updatedByUsername ? ` · @${rule.updatedByUsername}` : ''}
            </small>
          ) : null}
        </div>
        <div className="admin-rule-fields">
          <label className="field admin-field-value">
            <span>{meta.unit === 'mb' ? 'MB' : 'Adet'}</span>
            <input
              id={`${id}-value`}
              className="input"
              inputMode="decimal"
              value={draft.unlimited ? '' : draft.value}
              disabled={draft.unlimited || busy}
              onChange={(event) => update(rule, { value: event.target.value })}
            />
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={draft.unlimited}
              disabled={busy}
              onChange={(event) => update(rule, { unlimited: event.target.checked })}
            />
            Sınırsız
          </label>
          <label className="field admin-field-mode">
            <span>Mod</span>
            <select
              className="select"
              value={draft.mode}
              disabled={busy}
              onChange={(event) =>
                update(rule, { mode: event.target.value as PlanLimitMode })
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
              value={draft.warningPct}
              disabled={busy}
              onChange={(event) => update(rule, { warningPct: event.target.value })}
            />
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={draft.active}
              disabled={busy}
              onChange={(event) => update(rule, { active: event.target.checked })}
            />
            {scopeLabel ? 'Türe özel' : 'Etkin'}
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-plans">
        {PLAN_ORDER.map((plan) => {
          const planRules = rules.filter((rule) => rule.plan === plan);
          const keys = [...new Set(planRules.map((rule) => rule.limitKey))];
          return (
            <section key={plan} className="admin-plan">
              <header className="admin-plan-head">
                <h2>{PLAN_LABEL[plan]}</h2>
                <span className="admin-plan-chip">{plan}</span>
              </header>
              {keys.map((key) => {
                if (key === 'max_file_bytes') {
                  return FILE_SCOPES.map((scope) => {
                    const rule = planRules.find(
                      (item) => item.limitKey === key && item.scope === scope,
                    );
                    return rule ? renderRule(rule) : null;
                  });
                }
                const rule = planRules.find((item) => item.limitKey === key);
                return rule ? renderRule(rule) : null;
              })}
            </section>
          );
        })}
      </div>

      <div className="admin-actions">
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Kaydediliyor…' : 'Değişiklikleri yayınla'}
        </button>
        <p className="admin-actions-note">
          Zorunlu modda sınır aşılırsa yazma reddedilir; gölge modda yalnızca ölçülür.
          Mevcut veriler hiçbir modda silinmez.
        </p>
      </div>

      {notice ? (
        <p className="plan-notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}

      <section className="admin-history">
        <h2>Değişiklik geçmişi</h2>
        {history.length === 0 ? (
          <p className="admin-empty">Henüz limit değişikliği kaydedilmedi.</p>
        ) : (
          <div className="admin-history-list">
            {history.map((item) => (
              <article key={item.id} className="admin-history-item">
                <header>
                  <strong>
                    {item.actor ? `${item.actor.displayName} (@${item.actor.username})` : 'Sistem'}
                  </strong>
                  <time>{formatDateTime(item.createdAt)}</time>
                </header>
                <ul>
                  {(item.metadata.changes ?? []).map((change, index) => (
                    <li key={`${item.id}-${index}`}>
                      {PLAN_LABEL[change.plan]} ·{' '}
                      {LIMITS[change.limitKey]?.label ?? change.limitKey}
                      {change.scope && change.scope !== 'all'
                        ? ` · ${SCOPE_LABEL[change.scope] ?? change.scope}`
                        : ''}
                      :{' '}
                      {historyValue(change.limitKey, change.before?.max_value)} →{' '}
                      {historyValue(change.limitKey, change.after.maxValue)} ·{' '}
                      {MODE_LABEL[(change.after.mode as PlanLimitMode) ?? 'enforce']}
                      {change.after.active === false ? ' · pasif' : ''}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
