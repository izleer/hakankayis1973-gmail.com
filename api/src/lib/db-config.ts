/**
 * Veritabanı bağlantı adreslerini Supabase (yönetilen PostgreSQL) ve
 * pooler kurulumlarına göre yorumlar. Saf fonksiyonlardır; env okumaz.
 */

export type PoolerMode = 'direct' | 'session-pooler' | 'transaction-pooler';

export interface DatabaseTarget {
  host: string;
  port: number;
  database: string;
  pooler: PoolerMode;
  supabase: boolean;
  /** URL'deki sslmode parametresi (disable, require, verify-full...). */
  sslmode: string | null;
}

export interface DatabaseSslOptions {
  rejectUnauthorized: boolean;
}

const SUPABASE_SUFFIXES = ['.supabase.co', '.supabase.com'];

function isSupabaseHost(host: string): boolean {
  return SUPABASE_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix));
}

/**
 * PostgreSQL adresini çözer. Şema, kullanıcı adı veya parola döndürmez;
 * yalnızca hedef ve pooler modu ile ilgili bilgi verir.
 */
export function inspectDatabaseUrl(raw: string): DatabaseTarget {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('DATABASE_URL geçerli bir postgres:// adresi değil.');
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new Error('DATABASE_URL postgres:// veya postgresql:// ile başlamalı.');
  }

  const host = parsed.hostname.toLowerCase();
  const port = parsed.port ? Number(parsed.port) : 5432;
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'postgres';
  const supabase = isSupabaseHost(host);
  // Supabase transaction pooler 6543, session pooler 5432 kullanır.
  const pooler: PoolerMode =
    port === 6543 ? 'transaction-pooler' : host.includes('pooler.supabase') ? 'session-pooler' : 'direct';

  return {
    host,
    port,
    database,
    pooler,
    supabase,
    sslmode: parsed.searchParams.get('sslmode'),
  };
}

/**
 * SSL ayarını belirler. Supabase TLS zorunlu kılar; `sslmode=verify-ca`
 * veya `verify-full` sertifika doğrulamasını açar, diğer durumlarda
 * yönetilen sağlayıcıların zincirleriyle uyum için doğrulama kapalıdır.
 */
export function sslOptionsFor(
  target: DatabaseTarget,
  forceSsl: boolean,
): DatabaseSslOptions | false {
  const mode = target.sslmode?.toLowerCase();
  if (mode === 'disable') return forceSsl ? { rejectUnauthorized: false } : false;
  if (mode === 'verify-ca' || mode === 'verify-full') return { rejectUnauthorized: true };
  if (
    mode === 'require' ||
    mode === 'prefer' ||
    mode === 'allow' ||
    mode === 'no-verify' ||
    forceSsl ||
    target.supabase
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

/**
 * pg, bağlantı dizesindeki `sslmode` değerini açık `ssl` seçeneğinin üzerine
 * yazar. Hesapladığımız ayarın geçerli olması için adresi sslmode'dan arındırırız.
 */
export function withoutSslMode(raw: string): string {
  const trimmed = raw.trim();
  const url = new URL(trimmed);
  if (!url.searchParams.has('sslmode')) return trimmed;
  url.searchParams.delete('sslmode');
  return url.toString();
}

/**
 * Migration/seed/seed-reset gibi DDL ve oturum kilidi kullanan işlemler için
 * bağlantı adresini seçer. Supabase transaction pooler oturum düzeyinde
 * advisory lock desteklemediğinden burada açıkça reddedilir.
 */
export function resolveMigrationUrl(runtimeUrl: string, overrideUrl?: string | null): string {
  const selected = overrideUrl?.trim() || runtimeUrl.trim();
  const target = inspectDatabaseUrl(selected);
  if (target.pooler === 'transaction-pooler') {
    throw new Error(
      'Migration ve seed işlemleri transaction pooler (port 6543) üzerinden çalıştırılamaz. ' +
        'DATABASE_MIGRATION_URL değişkenine Supabase doğrudan bağlantısını (db.<proje>.supabase.co:5432) ' +
        'veya session pooler adresini (...pooler.supabase.com:5432) verin.',
    );
  }
  return selected;
}

/** Günlük satırlarında kullanılacak, kimlik bilgisi içermeyen hedef özeti. */
export function describeDatabaseTarget(target: DatabaseTarget): string {
  const suffix =
    target.pooler === 'direct' ? '' : ` (${target.pooler === 'session-pooler' ? 'session pooler' : 'transaction pooler'})`;
  return `${target.host}:${target.port}/${target.database}${suffix}`;
}
