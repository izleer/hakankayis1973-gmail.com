export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_types (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_slug TEXT,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type_slug   TEXT,
  description TEXT,
  location    TEXT,
  acquired_on TEXT,
  cover_path  TEXT,
  visibility  TEXT NOT NULL DEFAULT 'private',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type_slug);

CREATE TABLE IF NOT EXISTS entries (
  id                TEXT PRIMARY KEY,
  asset_id          TEXT NOT NULL,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  note              TEXT,
  occurred_at       TEXT NOT NULL,
  measurement_value REAL,
  measurement_unit  TEXT,
  reminder_at       TEXT,
  reminder_done     INTEGER NOT NULL DEFAULT 0,
  extra_json        TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_entries_asset ON entries(asset_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_reminder ON entries(reminder_at, reminder_done);
CREATE INDEX IF NOT EXISTS idx_entries_deleted ON entries(deleted_at);

CREATE TABLE IF NOT EXISTS media (
  id            TEXT PRIMARY KEY,
  asset_id      TEXT NOT NULL,
  entry_id      TEXT,
  kind          TEXT NOT NULL DEFAULT 'image',
  relative_path TEXT NOT NULL UNIQUE,
  mime          TEXT,
  bytes         INTEGER NOT NULL DEFAULT 0,
  width         INTEGER,
  height        INTEGER,
  created_at    TEXT NOT NULL,
  deleted_at    TEXT,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_media_asset ON media(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_entry ON media(entry_id);
CREATE INDEX IF NOT EXISTS idx_media_deleted ON media(deleted_at);

CREATE TABLE IF NOT EXISTS export_jobs (
  id              TEXT PRIMARY KEY,
  export_type     TEXT NOT NULL,
  status          TEXT NOT NULL,
  started_at      TEXT,
  completed_at    TEXT,
  file_path       TEXT,
  file_name       TEXT,
  total_files     INTEGER NOT NULL DEFAULT 0,
  processed_files INTEGER NOT NULL DEFAULT 0,
  total_bytes     INTEGER NOT NULL DEFAULT 0,
  processed_bytes INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  options_json    TEXT,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created ON export_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS export_items (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL,
  kind          TEXT NOT NULL,
  source_path   TEXT,
  target_path   TEXT,
  status        TEXT NOT NULL,
  error_message TEXT,
  FOREIGN KEY (job_id) REFERENCES export_jobs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_export_items_job ON export_items(job_id);

-- Aşama 3 (mağaza ödemesi) için ayrılmış çevrimdışı yetki önbelleği.
CREATE TABLE IF NOT EXISTS subscription_cache (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  plan              TEXT NOT NULL DEFAULT 'free',
  status            TEXT NOT NULL DEFAULT 'none',
  store             TEXT,
  product_id        TEXT,
  expires_at        TEXT,
  verified_at       TEXT,
  offline_grace_days INTEGER NOT NULL DEFAULT 7
);
`;

export const ASSET_TYPE_SEED: Array<[string, string, string | null, number]> = [
  ['canli', 'Canlılar', null, 10],
  ['canli-bitki', 'Bitkiler ve ağaçlar', 'canli', 11],
  ['canli-bitki-bonsai', 'Bonsai', 'canli-bitki', 111],
  ['canli-bitki-agac', 'Ağaç', 'canli-bitki', 112],
  ['canli-bitki-ic-mekan', 'İç mekân bitkisi', 'canli-bitki', 113],
  ['canli-hayvan', 'Evcil hayvanlar', 'canli', 12],
  ['canli-hayvan-kopek', 'Köpek', 'canli-hayvan', 121],
  ['canli-hayvan-kedi', 'Kedi', 'canli-hayvan', 122],
  ['canli-hayvan-diger', 'Diğer hayvan', 'canli-hayvan', 123],
  ['tasinan', 'Taşınabilir varlıklar', null, 20],
  ['tasit', 'Araçlar', 'tasinan', 21],
  ['tasit-otomobil', 'Otomobil', 'tasit', 211],
  ['tasit-motosiklet', 'Motosiklet', 'tasit', 212],
  ['tasit-bisiklet', 'Bisiklet', 'tasit', 213],
  ['elektronik', 'Elektronik', 'tasinan', 22],
  ['ev-esyalari', 'Ev eşyaları', 'tasinan', 23],
  ['gayrimenkul', 'Gayrimenkul', null, 30],
  ['gayrimenkul-konut', 'Konut', 'gayrimenkul', 301],
  ['gayrimenkul-arsa', 'Arsa', 'gayrimenkul', 302],
  ['gayrimenkul-is-yeri', 'İş yeri', 'gayrimenkul', 303],
  ['sanat', 'Koleksiyon ve sanat', null, 40],
  ['sanat-tablo', 'Tablo', 'sanat', 41],
  ['sanat-heykel', 'Heykel', 'sanat', 42],
  ['sanat-antika', 'Antika', 'sanat', 43],
  ['diger', 'Diğer', null, 50],
];

export function seedSql(): string {
  const values = ASSET_TYPE_SEED.map(
    ([slug, name, parent, sort]) =>
      `('${slug.replace(/'/g, "''")}', '${name.replace(/'/g, "''")}', ${
        parent ? `'${parent.replace(/'/g, "''")}'` : 'NULL'
      }, ${sort})`,
  ).join(',\n  ');
  return `INSERT OR IGNORE INTO asset_types (slug, name, parent_slug, sort) VALUES\n  ${values};`;
}

/** Yedekten geri yüklemede birleştirilen tablolar (bağımlılık sırasıyla). */
export const RESTORE_TABLES = ['asset_types', 'assets', 'entries', 'media'] as const;
