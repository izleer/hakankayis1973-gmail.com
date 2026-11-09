import { afterEach, describe, expect, it, vi } from 'vitest';

// storage.ts -> env.ts zinciri yüklenmeden önce gerekli ortamı sağla.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.STORAGE_DRIVER = 'local';
process.env.MEDIA_SIGNING_SECRET = 'test-media-signing-secret-0123456789';

const {
  signMediaKey,
  verifyMediaSignature,
  mediaRefUrl,
  canonicalMediaRef,
  isSignableMediaKey,
} = await import('../src/lib/storage.js');
const { detectMime, assertMediaContent, decodeBase64Media } = await import(
  '../src/lib/media-validation.js'
);
const { ApiError } = await import('../src/lib/errors.js');

const KEY = 'media/2026/01/00000000-0000-4000-8000-000000000000.jpg';

function parts(url: string): { key: string; exp: string; sig: string } {
  const match = /^\/files\/([^?]+)\?exp=(\d+)&sig=(.+)$/.exec(url);
  if (!match) throw new Error(`Beklenen imzalı URL biçimi değil: ${url}`);
  return { key: decodeURIComponent(match[1]!), exp: match[2]!, sig: match[3]! };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('imzalı medya adresleri', () => {
  it('imzalanan anahtar doğrulanır', () => {
    const url = signMediaKey(KEY);
    const { key, exp, sig } = parts(url);
    expect(key).toBe(KEY);
    expect(verifyMediaSignature(key, exp, sig)).toBe(true);
  });

  it('kurcalanmış imza reddedilir', () => {
    const { key, exp, sig } = parts(signMediaKey(KEY));
    const tampered = `${sig.slice(0, -2)}${sig.endsWith('AA') ? 'BB' : 'AA'}`;
    expect(verifyMediaSignature(key, exp, tampered)).toBe(false);
  });

  it('imza başka bir anahtar için kullanılamaz', () => {
    const { exp, sig } = parts(signMediaKey(KEY));
    const other = 'media/2026/01/11111111-1111-4111-8111-111111111111.jpg';
    expect(verifyMediaSignature(other, exp, sig)).toBe(false);
  });

  it('süresi dolmuş adres reddedilir', () => {
    const { sig } = parts(signMediaKey(KEY));
    expect(verifyMediaSignature(KEY, '1', sig)).toBe(false);
  });

  it('eksik parametreler reddedilir', () => {
    const { exp, sig } = parts(signMediaKey(KEY));
    expect(verifyMediaSignature(KEY, null, sig)).toBe(false);
    expect(verifyMediaSignature(KEY, exp, null)).toBe(false);
    expect(verifyMediaSignature(KEY, exp, '')).toBe(false);
  });

  it('imzalanamaz anahtarlar reddedilir', () => {
    expect(isSignableMediaKey('../../etc/passwd')).toBe(false);
    expect(isSignableMediaKey('random.txt')).toBe(false);
    expect(verifyMediaSignature('../../etc/passwd', `${Math.floor(Date.now() / 1000) + 3600}`, 'x')).toBe(false);
  });

  it('seed anahtarları imzalanabilir', () => {
    expect(isSignableMediaKey('seed/demo.jpg')).toBe(true);
    const { key, exp, sig } = parts(signMediaKey('seed/demo.jpg'));
    expect(verifyMediaSignature(key, exp, sig)).toBe(true);
  });

  it('aynı TTL penceresinde özdeş URL üretir (önbellek dostu)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const first = signMediaKey(KEY, 3600);
    vi.setSystemTime(new Date('2026-01-01T00:30:00Z'));
    expect(signMediaKey(KEY, 3600)).toBe(first);
    vi.setSystemTime(new Date('2026-01-01T01:00:01Z'));
    expect(signMediaKey(KEY, 3600)).not.toBe(first);
  });
});

describe('medya referansları', () => {
  it('boş değer null döner', () => {
    expect(mediaRefUrl(null)).toBeNull();
    expect(mediaRefUrl('')).toBeNull();
    expect(canonicalMediaRef(null)).toBeNull();
  });

  it('ham /files yolu okunurken imzalanır', () => {
    const url = mediaRefUrl(`/files/${KEY}`);
    expect(url).toContain('?exp=');
    expect(url).toContain('&sig=');
    const { key, exp, sig } = parts(url!);
    expect(verifyMediaSignature(key, exp, sig)).toBe(true);
  });

  it('eski imzalı referans yeniden imzalanır', () => {
    const url = mediaRefUrl(`/files/${KEY}?exp=1&sig=eski`);
    expect(url).not.toContain('sig=eski');
    const { key, exp, sig } = parts(url!);
    expect(verifyMediaSignature(key, exp, sig)).toBe(true);
  });

  it('harici adresler değiştirilmez', () => {
    expect(mediaRefUrl('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
    expect(canonicalMediaRef('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
  });

  it('yazarken imza sorgusu kanonik yola indirgenir', () => {
    expect(canonicalMediaRef(`/files/${KEY}?exp=123&sig=abc`)).toBe(`/files/${KEY}`);
    expect(canonicalMediaRef(`/files/${KEY}`)).toBe(`/files/${KEY}`);
  });
});

describe('base64 çözümü', () => {
  it('geçerli base64 doğru byte dizisine çözülür', () => {
    const source = Buffer.from('merhaba dünya');
    expect(decodeBase64Media(source.toString('base64'), 1024)).toEqual(source);
  });

  it('data URL öneki ve boşluklar temizlenir', () => {
    const source = Buffer.from('veri');
    const encoded = source.toString('base64');
    expect(decodeBase64Media(`data:image/png;base64,${encoded}`, 1024)).toEqual(source);
    expect(decodeBase64Media(`  ${encoded} \n`, 1024)).toEqual(source);
  });

  it('geçersiz karakterler reddedilir', () => {
    expect(() => decodeBase64Media('!!!!', 1024)).toThrowError(/okunamadı/i);
  });

  it('hatalı uzunluk reddedilir', () => {
    expect(() => decodeBase64Media('abc', 1024)).toThrowError(/okunamadı/i);
  });

  it('boş içerik reddedilir', () => {
    expect(() => decodeBase64Media('', 1024)).toThrowError(/boş/i);
    expect(() => decodeBase64Media('   ', 1024)).toThrowError(/boş/i);
  });

  it('boyut sınırı aşılırsa 413 döner', () => {
    const big = Buffer.alloc(2048).toString('base64');
    try {
      decodeBase64Media(big, 1024);
      throw new Error('beklenen hata fırlatılmadı');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as InstanceType<typeof ApiError>).status).toBe(413);
    }
  });
});

function ftyp(major: string, brands: string[] = []): Buffer {
  const brandBuf = Buffer.from(brands.join(''), 'latin1');
  const head = Buffer.alloc(16);
  head.writeUInt32BE(16 + brandBuf.length, 0);
  head.write('ftyp', 4, 'latin1');
  head.write(major, 8, 'latin1');
  head.writeUInt32BE(0, 12);
  return Buffer.concat([head, brandBuf]);
}

describe('içerik (magic byte) doğrulaması', () => {
  it('desteklenen türler doğru tanınır', () => {
    expect(detectMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))).toBe('image/png');
    expect(detectMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe('image/jpeg');
    expect(detectMime(Buffer.from('GIF89a.......'))).toBe('image/gif');
    expect(detectMime(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf');
    expect(detectMime(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))).toBe('image/webp');
    expect(detectMime(ftyp('isom', ['isom', 'iso2']))).toBe('video/mp4');
    expect(detectMime(ftyp('avif'))).toBe('image/avif');
    expect(detectMime(ftyp('mif1', ['avif']))).toBe('image/avif');
  });

  it('tanınmayan içerik null döner', () => {
    expect(detectMime(Buffer.from('tamamen rastgele bir metin'))).toBeNull();
    expect(detectMime(Buffer.alloc(0))).toBeNull();
  });

  it('eşleşen içerik kabul edilir', () => {
    expect(() => assertMediaContent(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).not.toThrow();
  });

  it('bildirilen türle eşleşmeyen içerik reddedilir', () => {
    expect(() => assertMediaContent(Buffer.from('%PDF-1.7\n'), 'image/jpeg')).toThrowError(/eşleşmiyor/i);
    expect(() => assertMediaContent(Buffer.from('rastgele'), 'image/png')).toThrowError(/eşleşmiyor/i);
  });
});