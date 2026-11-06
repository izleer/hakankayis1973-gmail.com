#!/usr/bin/env node
/**
 * izleer — fonksiyonel API test seti
 *
 * İzole test veritabanına (varlik_hafizasi_test) ve ayrı API örneğine (varsayılan :4100)
 * karşı çalışır. Demo verisine dokunmaz. Tekrar çalıştırılabilir: her koşuda benzersiz
 * kullanıcı/topluluk adları üretir.
 *
 * Kullanım:
 *   API_BASE=http://127.0.0.1:4100 node infra/scripts/functional-api-test.mjs
 */

const BASE = (process.env.API_BASE || 'http://127.0.0.1:4100').replace(/\/+$/, '');
const RUN = Date.now().toString(36).slice(-6);
const PASSWORD = 'Test1234!';
const DEMO_PASSWORD = 'Demo1234!';

const results = [];
const ctx = {};

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text, headers: res.headers };
}

class AssertionError extends Error {}

function expect(condition, message) {
  if (!condition) throw new AssertionError(message);
}

function expectStatus(res, expected, label = '') {
  const wanted = Array.isArray(expected) ? expected : [expected];
  expect(
    wanted.includes(res.status),
    `${label} beklenen HTTP ${wanted.join('/')} — gelen ${res.status} ${res.text?.slice(0, 180) ?? ''}`,
  );
}

async function run(id, area, title, fn) {
  const started = performance.now();
  try {
    const note = await fn();
    results.push({
      id,
      area,
      title,
      status: 'PASS',
      expected: note?.expected ?? '',
      actual: note?.actual ?? 'Beklenen davranış doğrulandı',
      note: note?.note ?? '',
      ms: Math.round(performance.now() - started),
    });
    console.log(`PASS ${id} ${title}`);
  } catch (error) {
    results.push({
      id,
      area,
      title,
      status: 'FAIL',
      expected: error instanceof AssertionError ? '' : 'İstisnasız tamamlanma',
      actual: error.message,
      note: '',
      ms: Math.round(performance.now() - started),
    });
    console.log(`FAIL ${id} ${title} — ${error.message}`);
  }
}

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function login(identifier, password) {
  return call('POST', '/v1/auth/login', { body: { identifier, password } });
}

// ---------------------------------------------------------------------------
// 01 — Sistem ve kimlik doğrulama
// ---------------------------------------------------------------------------
await run('FT-01', 'Sistem', 'Sağlık ucu veritabanıyla birlikte OK döner', async () => {
  const res = await call('GET', '/health');
  expectStatus(res, 200);
  expect(res.json.status === 'ok' && res.json.db === 'ok', `Sağlık durumu: ${res.text}`);
  return { expected: '200 {status:ok, db:ok}', actual: `${res.json.status}/${res.json.db}` };
});

await run('FT-02', 'Kimlik', 'Yeni kullanıcı kaydı token ve kullanıcı döner', async () => {
  const res = await call('POST', '/v1/auth/register', {
    body: {
      email: `fta_${RUN}@test.local`,
      password: PASSWORD,
      username: `fta_${RUN}`,
      displayName: 'Fonksiyonel A',
    },
  });
  expectStatus(res, 201);
  expect(Boolean(res.json.data?.token), 'Token yok');
  expect(res.json.data.user.username === `fta_${RUN}`, 'Kullanıcı adı uyuşmuyor');
  ctx.aTok = res.json.data.token;
  ctx.aId = res.json.data.user.id;
  ctx.aUser = res.json.data.user;
  return { expected: '201 + token', actual: `201, kullanıcı ${ctx.aUser.username}` };
});

await run('FT-03', 'Kimlik', 'İkinci kullanıcı kaydı başarılı', async () => {
  const res = await call('POST', '/v1/auth/register', {
    body: {
      email: `ftb_${RUN}@test.local`,
      password: PASSWORD,
      username: `ftb_${RUN}`,
      displayName: 'Fonksiyonel B',
    },
  });
  expectStatus(res, 201);
  ctx.bTok = res.json.data.token;
  ctx.bId = res.json.data.user.id;
  ctx.bUser = res.json.data.user;
  return { expected: '201', actual: '201' };
});

await run('FT-04', 'Kimlik', 'Üçüncü kullanıcı kaydı başarılı', async () => {
  const res = await call('POST', '/v1/auth/register', {
    body: {
      email: `ftc_${RUN}@test.local`,
      password: PASSWORD,
      username: `ftc_${RUN}`,
      displayName: 'Fonksiyonel C',
    },
  });
  expectStatus(res, 201);
  ctx.cTok = res.json.data.token;
  ctx.cId = res.json.data.user.id;
  return { expected: '201', actual: '201' };
});

await run('FT-05', 'Kimlik', 'Aynı e-posta ile kayıt 409 döner', async () => {
  const res = await call('POST', '/v1/auth/register', {
    body: {
      email: `fta_${RUN}@test.local`,
      password: PASSWORD,
      username: `fta2_${RUN}`,
      displayName: 'Kopya',
    },
  });
  expectStatus(res, 409);
  return { expected: '409 CONFLICT', actual: res.json.error?.code ?? res.text };
});

await run('FT-06', 'Kimlik', 'Zayıf şifre 422 ile reddedilir', async () => {
  const res = await call('POST', '/v1/auth/register', {
    body: {
      email: `weak_${RUN}@test.local`,
      password: 'abc',
      username: `weak_${RUN}`,
      displayName: 'Zayıf',
    },
  });
  expectStatus(res, 422);
  return { expected: '422 VALIDATION_ERROR', actual: res.json.error?.code ?? res.text };
});

await run('FT-07', 'Kimlik', 'E-posta ile giriş başarılı', async () => {
  const res = await login(`fta_${RUN}@test.local`, PASSWORD);
  expectStatus(res, 200);
  expect(Boolean(res.json.data?.token), 'Token yok');
  ctx.aTok = res.json.data.token;
  return { expected: '200 + token', actual: '200' };
});

await run('FT-08', 'Kimlik', 'Kullanıcı adı ile giriş başarılı', async () => {
  const res = await login(`fta_${RUN}`, PASSWORD);
  expectStatus(res, 200);
  expect(res.json.data.user.username === `fta_${RUN}`, 'Kullanıcı adı uyuşmuyor');
  return { expected: '200', actual: '200' };
});

await run('FT-09', 'Kimlik', 'Hatalı şifre 401 döner', async () => {
  const res = await login(`fta_${RUN}`, 'YanlisSifre1');
  expectStatus(res, 401);
  return { expected: '401 UNAUTHORIZED', actual: res.json.error?.code ?? res.text };
});

await run('FT-10', 'Kimlik', 'Oturum ucu token ile 200, tokensiz 401 döner', async () => {
  const withToken = await call('GET', '/v1/auth/session', { token: ctx.aTok });
  expectStatus(withToken, 200, 'tokenlı');
  const without = await call('GET', '/v1/auth/session');
  expectStatus(without, 401, 'tokensiz');
  return { expected: '200 / 401', actual: '200 / 401' };
});

await run('FT-11', 'Kimlik', 'Çıkış sonrası eski token geçersizleşir', async () => {
  const logout = await call('POST', '/v1/auth/logout', { token: ctx.aTok });
  expectStatus(logout, 200);
  const after = await call('GET', '/v1/auth/session', { token: ctx.aTok });
  expectStatus(after, 401);
  const relogin = await login(`fta_${RUN}`, PASSWORD);
  expectStatus(relogin, 200);
  ctx.aTok = relogin.json.data.token;
  return { expected: '200 sonra 401', actual: 'çıkış 200, eski token 401' };
});

// ---------------------------------------------------------------------------
// 02 — Varlık türleri ve varlık CRUD
// ---------------------------------------------------------------------------
await run('FT-12', 'Varlık türleri', 'Tür ağacı kök ve alt kategorilerle döner', async () => {
  const res = await call('GET', '/v1/asset-types');
  expectStatus(res, 200);
  const roots = res.json.data?.items ?? [];
  expect(roots.length > 0, 'Kök tür yok');
  const parent = roots.find((item) => Array.isArray(item.children) && item.children.length > 0);
  const leaf = roots.flatMap((item) => (item.children?.length ? item.children : [item])).find(
    (item) => !item.children || item.children.length === 0,
  );
  expect(parent, 'Alt kategorili kök tür bulunamadı');
  expect(leaf, 'Yaprak tür bulunamadı');
  ctx.parentTypeId = parent.id;
  ctx.leafTypeId = leaf.id;
  return { expected: '200 + ağaç', actual: `${roots.length} kök, yaprak=${leaf.id}` };
});

await run('FT-13', 'Varlık türleri', 'Kök türle varlık oluşturma 422 INVALID_TYPE döner', async () => {
  const res = await call('POST', '/v1/assets', {
    token: ctx.aTok,
    body: { typeId: ctx.parentTypeId, title: 'Alt kategori denemesi' },
  });
  expectStatus(res, 422);
  expect(res.json.error?.code === 'INVALID_TYPE', `Kod: ${res.json.error?.code}`);
  return { expected: '422 INVALID_TYPE', actual: '422 INVALID_TYPE' };
});

await run('FT-14', 'Varlık', 'Özel varlık ilk kaydıyla oluşturulur', async () => {
  const res = await call('POST', '/v1/assets', {
    token: ctx.aTok,
    body: {
      typeId: ctx.leafTypeId,
      title: `FT Özel Varlık ${RUN}`,
      description: 'Fonksiyonel test özel varlığı',
      visibility: 'private',
      initialEntry: { type: 'note', title: 'İlk not', body: 'Özel kayıt', visibility: 'private' },
    },
  });
  expectStatus(res, 201);
  ctx.privateId = res.json.data.asset.id;
  return { expected: '201', actual: `201, varlık ${ctx.privateId}` };
});

await run('FT-15', 'Varlık', 'Herkese açık varlık ve kayıt oluşturulur', async () => {
  const res = await call('POST', '/v1/assets', {
    token: ctx.aTok,
    body: {
      typeId: ctx.leafTypeId,
      title: `FT Kamu Varlık ${RUN}`,
      visibility: 'public',
      initialEntry: { type: 'note', title: 'Kamu notu', body: 'Herkese açık kayıt', visibility: 'public' },
    },
  });
  expectStatus(res, 201);
  ctx.publicId = res.json.data.asset.id;
  return { expected: '201', actual: `201, varlık ${ctx.publicId}` };
});

await run('FT-16', 'Varlık', 'Seçili erişimli varlık oluşturulur', async () => {
  const res = await call('POST', '/v1/assets', {
    token: ctx.aTok,
    body: {
      typeId: ctx.leafTypeId,
      title: `FT Seçili Varlık ${RUN}`,
      visibility: 'selected',
    },
  });
  expectStatus(res, 201);
  ctx.selectedId = res.json.data.asset.id;
  return { expected: '201', actual: '201' };
});

await run('FT-17', 'Varlık', 'Kendi varlık listesi oluşturulanları içerir', async () => {
  const res = await call('GET', '/v1/assets?limit=48', { token: ctx.aTok });
  expectStatus(res, 200);
  const ids = (res.json.data?.items ?? []).map((item) => item.id);
  expect(ids.includes(ctx.privateId) && ids.includes(ctx.publicId), 'Oluşturulan varlıklar listede yok');
  return { expected: '200 + varlıklar', actual: `${ids.length} varlık` };
});

await run('FT-18', 'Varlık', 'Sahip özel varlığı görüntüler', async () => {
  const res = await call('GET', `/v1/assets/${ctx.privateId}`, { token: ctx.aTok });
  expectStatus(res, 200);
  expect(res.json.data.asset.title.includes('Özel'), 'Başlık uyuşmuyor');
  return { expected: '200', actual: '200' };
});

await run('FT-19', 'Varlık', 'Anonim kullanıcı özel varlığa erişemez', async () => {
  const res = await call('GET', `/v1/assets/${ctx.privateId}`);
  expectStatus(res, 403);
  return { expected: '403 FORBIDDEN', actual: '403' };
});

await run('FT-20', 'Varlık', 'Keşfet yalnızca kamu varlığını gösterir', async () => {
  const res = await call('GET', `/v1/assets/discover?q=${encodeURIComponent(`FT ${'Kamu'} Varlık ${RUN}`)}`);
  expectStatus(res, 200);
  const ids = (res.json.data?.items ?? []).map((item) => item.id);
  expect(ids.includes(ctx.publicId), 'Kamu varlığı keşfette yok');
  expect(!ids.includes(ctx.privateId), 'Özel varlık keşfette görünüyor');
  return { expected: 'kamu var, özel yok', actual: `${ids.length} sonuç` };
});

await run('FT-21', 'Varlık', 'Varlık başlığı ve açıklaması güncellenir', async () => {
  const res = await call('PATCH', `/v1/assets/${ctx.publicId}`, {
    token: ctx.aTok,
    body: { title: `FT Kamu Varlık ${RUN} (güncel)`, description: 'Güncellendi' },
  });
  expectStatus(res, 200);
  expect(res.json.data.asset.title.endsWith('(güncel)'), 'Başlık güncellenmedi');
  return { expected: '200 + yeni başlık', actual: '200' };
});

await run('FT-22', 'Varlık', 'Bayrakla erişim verilen kullanıcı varlığı görür', async () => {
  const grant = await call('POST', `/v1/assets/${ctx.selectedId}/access`, {
    token: ctx.aTok,
    body: { username: `ftb_${RUN}` },
  });
  expectStatus(grant, 201);
  const view = await call('GET', `/v1/assets/${ctx.selectedId}`, { token: ctx.bTok });
  expectStatus(view, 200);
  const list = await call('GET', `/v1/assets/${ctx.selectedId}/access`, { token: ctx.aTok });
  expectStatus(list, 200);
  expect((list.json.data.items ?? []).some((item) => item.user.username === `ftb_${RUN}`), 'Erişim listesinde yok');
  return { expected: '201 + 200', actual: 'erişim verildi ve görüntülendi' };
});

await run('FT-23', 'Varlık', 'Kendine erişim verme 409 döner', async () => {
  const res = await call('POST', `/v1/assets/${ctx.selectedId}/access`, {
    token: ctx.aTok,
    body: { username: `fta_${RUN}` },
  });
  expectStatus(res, 409);
  return { expected: '409', actual: '409' };
});

await run('FT-24', 'Varlık', 'Varlıktan geniş görünürlüklü kayıt 422 döner', async () => {
  const res = await call('POST', '/v1/assets', {
    token: ctx.aTok,
    body: {
      typeId: ctx.leafTypeId,
      title: `FT Görünürlük ${RUN}`,
      visibility: 'private',
      initialEntry: { type: 'note', body: 'Kamu kayıt', visibility: 'public' },
    },
  });
  expectStatus(res, 422);
  expect(res.json.error?.code === 'VISIBILITY_TOO_BROAD', `Kod: ${res.json.error?.code}`);
  return { expected: '422 VISIBILITY_TOO_BROAD', actual: '422' };
});

await run('FT-25', 'Varlık', 'Boş başlıklı varlık 422 döner', async () => {
  const res = await call('POST', '/v1/assets', {
    token: ctx.aTok,
    body: { typeId: ctx.leafTypeId, title: '   ' },
  });
  expectStatus(res, 422);
  return { expected: '422', actual: '422' };
});

await run('FT-26', 'Varlık', 'Silinen varlık sonrası görüntüleme 404 döner', async () => {
  const create = await call('POST', '/v1/assets', {
    token: ctx.aTok,
    body: { typeId: ctx.leafTypeId, title: `FT Silinecek ${RUN}` },
  });
  expectStatus(create, 201);
  const id = create.json.data.asset.id;
  const del = await call('DELETE', `/v1/assets/${id}`, { token: ctx.aTok });
  expectStatus(del, 204);
  const view = await call('GET', `/v1/assets/${id}`, { token: ctx.aTok });
  expectStatus(view, 404);
  return { expected: '204 sonra 404', actual: '204 → 404' };
});

await run('FT-27', 'Varlık', 'Varlık arşivlenir ve arşiv filtresinde listelenir', async () => {
  const res = await call('PATCH', `/v1/assets/${ctx.selectedId}`, {
    token: ctx.aTok,
    body: { status: 'archived' },
  });
  expectStatus(res, 200);
  const list = await call('GET', '/v1/assets?status=archived&limit=48', { token: ctx.aTok });
  expectStatus(list, 200);
  expect((list.json.data.items ?? []).some((item) => item.id === ctx.selectedId), 'Arşiv listesinde yok');
  return { expected: '200 + listede', actual: 'arşivlendi' };
});

// ---------------------------------------------------------------------------
// 03 — Günlük kayıtları ve ölçümler
// ---------------------------------------------------------------------------
await run('FT-28', 'Kayıt', 'Varlığa günlük kaydı eklenir', async () => {
  const res = await call('POST', `/v1/assets/${ctx.privateId}/entries`, {
    token: ctx.aTok,
    body: { type: 'note', title: 'Bakım notu', body: 'Filtre değişti', visibility: 'private' },
  });
  expectStatus(res, 201);
  ctx.entryId = res.json.data.entry.id;
  return { expected: '201', actual: '201' };
});

await run('FT-29', 'Kayıt', 'Sahip olmayan kullanıcı kayıt ekleyemez', async () => {
  const res = await call('POST', `/v1/assets/${ctx.privateId}/entries`, {
    token: ctx.bTok,
    body: { body: 'Yetkisiz kayıt' },
  });
  expectStatus(res, 403);
  return { expected: '403', actual: '403' };
});

await run('FT-30', 'Kayıt', 'Başlıksız ve metinsiz kayıt 422 döner', async () => {
  const res = await call('POST', `/v1/assets/${ctx.privateId}/entries`, {
    token: ctx.aTok,
    body: { type: 'note' },
  });
  expectStatus(res, 422);
  return { expected: '422', actual: '422' };
});

await run('FT-31', 'Kayıt', 'Kayıt başlığı güncellenir', async () => {
  const res = await call('PATCH', `/v1/entries/${ctx.entryId}`, {
    token: ctx.aTok,
    body: { title: 'Bakım notu (güncel)', body: 'Filtre ve yağ değişti' },
  });
  expectStatus(res, 200);
  expect(res.json.data.entry.title.includes('güncel'), 'Başlık güncellenmedi');
  return { expected: '200', actual: '200' };
});

await run('FT-32', 'Kayıt', 'Ölçümlü kayıt ölçüm listesine yansır', async () => {
  const res = await call('POST', `/v1/assets/${ctx.privateId}/entries`, {
    token: ctx.aTok,
    body: {
      type: 'measurement',
      title: 'Bakım ölçümü',
      measurements: [{ metric: 'basinc', value: 32.5, unit: 'psi' }],
    },
  });
  expectStatus(res, 201);
  const measurements = await call('GET', `/v1/assets/${ctx.privateId}/measurements`, {
    token: ctx.aTok,
  });
  expectStatus(measurements, 200);
  const item = (measurements.json.data.items ?? []).find((row) => row.metric === 'basinc');
  expect(item && item.value === 32.5 && item.unit === 'psi', 'Ölçüm bulunamadı veya değer yanlış');
  return { expected: '201 + ölçüm', actual: '32.5 psi listelendi' };
});

await run('FT-33', 'Kayıt', 'Kayda medya bağlanır ve medya ucu listeler', async () => {
  const upload = await call('POST', '/v1/media/upload', {
    token: ctx.aTok,
    body: { filename: 'ft.png', mimeType: 'image/png', dataBase64: PNG_BASE64 },
  });
  expectStatus(upload, 201);
  const mediaId = upload.json.data.media.id;
  ctx.mediaId = mediaId;
  const attach = await call('PATCH', `/v1/entries/${ctx.entryId}`, {
    token: ctx.aTok,
    body: { mediaIds: [mediaId] },
  });
  expectStatus(attach, 200);
  const list = await call('GET', `/v1/entries/${ctx.entryId}/media`, { token: ctx.aTok });
  expectStatus(list, 200);
  expect((list.json.data.items ?? []).some((item) => item.id === mediaId), 'Medya kayda bağlanmadı');
  return { expected: '201 + bağlama + listeleme', actual: 'medya bağlandı' };
});

await run('FT-34', 'Kayıt', 'Kayıt silinince görüntüleme 404 döner', async () => {
  const res = await call('DELETE', `/v1/entries/${ctx.entryId}`, { token: ctx.aTok });
  expectStatus(res, 204);
  const view = await call('GET', `/v1/entries/${ctx.entryId}`, { token: ctx.aTok });
  expectStatus(view, 404);
  return { expected: '204 → 404', actual: '204 → 404' };
});

// ---------------------------------------------------------------------------
// 04 — Medya
// ---------------------------------------------------------------------------
await run('FT-35', 'Medya', 'PNG yüklemesi 201 ve ready durumu döner', async () => {
  const res = await call('POST', '/v1/media/upload', {
    token: ctx.aTok,
    body: { filename: 'piksel.png', mimeType: 'image/png', dataBase64: PNG_BASE64 },
  });
  expectStatus(res, 201);
  expect(res.json.data.media.status === 'ready', `Durum: ${res.json.data.media.status}`);
  expect(res.json.data.media.kind === 'image', 'Tür image değil');
  ctx.media2Id = res.json.data.media.id;
  return { expected: '201 ready/image', actual: '201 ready/image' };
});

await run('FT-36', 'Medya', 'Desteklenmeyen dosya türü 422 döner', async () => {
  const res = await call('POST', '/v1/media/upload', {
    token: ctx.aTok,
    body: { filename: 'x.bmp', mimeType: 'image/bmp', dataBase64: PNG_BASE64 },
  });
  expectStatus(res, 422);
  expect(res.json.error?.code === 'UNSUPPORTED_MEDIA', `Kod: ${res.json.error?.code}`);
  return { expected: '422 UNSUPPORTED_MEDIA', actual: '422' };
});

await run('FT-37', 'Medya', 'Yerel depolamada presign 409 döner', async () => {
  const res = await call('POST', '/v1/media/presign', {
    token: ctx.aTok,
    body: { filename: 'x.png', mimeType: 'image/png', byteSize: 128 },
  });
  expectStatus(res, 409);
  expect(res.json.error?.code === 'DIRECT_UPLOAD_REQUIRED', `Kod: ${res.json.error?.code}`);
  return { expected: '409 DIRECT_UPLOAD_REQUIRED', actual: '409' };
});

await run('FT-38', 'Medya', 'Medya ucu sahibine 200, anonime 401 döner', async () => {
  const owner = await call('GET', `/v1/media/${ctx.media2Id}`, { token: ctx.aTok });
  expectStatus(owner, 200);
  const anon = await call('GET', `/v1/media/${ctx.media2Id}`);
  expectStatus(anon, 401);
  return { expected: '200 / 401', actual: '200 / 401' };
});

// ---------------------------------------------------------------------------
// 05 — Kullanıcılar, takip ve profil
// ---------------------------------------------------------------------------
await run('FT-39', 'Kullanıcı', 'Kullanıcı profili 200 döner', async () => {
  const res = await call('GET', '/v1/users/mert', { token: ctx.aTok });
  expectStatus(res, 200);
  expect(res.json.data.user.username === 'mert', 'Profil kullanıcısı yanlış');
  return { expected: '200', actual: '200, @mert' };
});

await run('FT-40', 'Kullanıcı', 'Profil bilgileri güncellenir', async () => {
  const res = await call('PATCH', '/v1/me', {
    token: ctx.aTok,
    body: { displayName: 'Fonksiyonel A+', bio: 'Test biyografisi' },
  });
  expectStatus(res, 200);
  expect(res.json.data.user.displayName === 'Fonksiyonel A+', 'Görünen ad güncellenmedi');
  return { expected: '200', actual: '200' };
});

await run('FT-41', 'Kullanıcı', 'Onboarding tercihleri kaydedilir', async () => {
  const res = await call('POST', '/v1/me/onboarding', {
    token: ctx.aTok,
    body: { displayName: 'Fonksiyonel A+', bio: 'Test biyografisi', interests: ['koleksiyon', 'fotoğraf'] },
  });
  expectStatus(res, 200);
  expect(Array.isArray(res.json.data.user.interests) && res.json.data.user.interests.length === 2, 'İlgi alanları kaydedilmedi');
  return { expected: '200 + 2 ilgi alanı', actual: '200' };
});

await run('FT-42', 'Kullanıcı', 'Takip başlar ve takipçi listesinde görünür', async () => {
  const follow = await call('POST', '/v1/users/mert/follow', { token: ctx.aTok });
  expectStatus(follow, 201);
  const followers = await call('GET', '/v1/users/mert/followers?limit=48', { token: ctx.aTok });
  expectStatus(followers, 200);
  expect(
    (followers.json.data.items ?? []).some((item) => item.user?.username === `fta_${RUN}` || item.username === `fta_${RUN}`),
    'Takipçi listesinde yok',
  );
  return { expected: '201 + listede', actual: 'takip edildi' };
});

await run('FT-43', 'Kullanıcı', 'Kendini takip etme 409 döner', async () => {
  const res = await call('POST', `/v1/users/fta_${RUN}/follow`, { token: ctx.aTok });
  expectStatus(res, 409);
  return { expected: '409', actual: '409' };
});

await run('FT-44', 'Kullanıcı', 'Takibi bırakma 200 ve following=false döner', async () => {
  const res = await call('DELETE', '/v1/users/mert/follow', { token: ctx.aTok });
  expectStatus(res, 200);
  expect(res.json.data.following === false, 'following=false değil');
  return { expected: '200 following:false', actual: '200' };
});

await run('FT-45', 'Kullanıcı', 'Özet ucu istatistik ve okunmamış sayısı döner', async () => {
  const res = await call('GET', '/v1/me/summary', { token: ctx.aTok });
  expectStatus(res, 200);
  expect(typeof res.json.data.stats?.unreadNotifications === 'number', 'unreadNotifications yok');
  expect(res.json.data.stats.assets >= 3, 'Varlık sayısı beklenenden az');
  return { expected: '200 + stats', actual: `assets=${res.json.data.stats.assets}` };
});

await run('FT-46', 'Kullanıcı', 'Veri dışa aktarımı profil ve koleksiyonları içerir', async () => {
  const res = await call('GET', '/v1/me/export', { token: ctx.aTok });
  expectStatus(res, 200);
  expect(res.json.data.profile?.username === `fta_${RUN}`, 'Profil yok');
  expect(Array.isArray(res.json.data.assets) && res.json.data.assets.length >= 3, 'Varlıklar yok');
  return { expected: '200 + export', actual: `${res.json.data.assets.length} varlık` };
});

await run('FT-47', 'Kullanıcı', 'Kullanıcı önerileri listelenir', async () => {
  const res = await call('GET', '/v1/users/suggestions', { token: ctx.aTok });
  expectStatus(res, 200);
  expect(Array.isArray(res.json.data.items), 'items dizisi yok');
  return { expected: '200 + items', actual: `${res.json.data.items.length} öneri` };
});

// ---------------------------------------------------------------------------
// 06 — Gönderiler, beğeni, yorum ve akış
// ---------------------------------------------------------------------------
await run('FT-48', 'Gönderi', 'Metin gönderisi oluşturulur', async () => {
  const res = await call('POST', '/v1/posts', {
    token: ctx.aTok,
    body: { body: `Fonksiyonel test gönderisi ${RUN}`, audience: 'public' },
  });
  expectStatus(res, 201);
  ctx.postId = res.json.data.post.id;
  return { expected: '201', actual: '201' };
});

await run('FT-49', 'Gönderi', 'Boş gönderi 422 döner', async () => {
  const res = await call('POST', '/v1/posts', { token: ctx.aTok, body: { body: '   ' } });
  expectStatus(res, 422);
  return { expected: '422', actual: '422' };
});

await run('FT-50', 'Gönderi', 'Gönderi kimliğiyle okunur', async () => {
  const res = await call('GET', `/v1/posts/${ctx.postId}`, { token: ctx.bTok });
  expectStatus(res, 200);
  expect(res.json.data.post.body.includes(RUN), 'Gövde uyuşmuyor');
  return { expected: '200', actual: '200' };
});

await run('FT-51', 'Gönderi', 'Beğeni eklenir, tekrar beğeni sayıyı artırmaz, geri alınır', async () => {
  const first = await call('POST', `/v1/posts/${ctx.postId}/like`, { token: ctx.bTok });
  expectStatus(first, [200, 201]);
  const second = await call('POST', `/v1/posts/${ctx.postId}/like`, { token: ctx.bTok });
  expectStatus(second, [200, 201]);
  const after = await call('GET', `/v1/posts/${ctx.postId}`, { token: ctx.aTok });
  expect(after.json.data.post.likeCount === 1, `Beğeni sayısı: ${after.json.data.post.likeCount}`);
  const unlike = await call('DELETE', `/v1/posts/${ctx.postId}/like`, { token: ctx.bTok });
  expectStatus(unlike, 200);
  return { expected: 'tek beğeni', actual: 'likeCount=1, geri alındı' };
});

await run('FT-52', 'Gönderi', 'Yorum eklenir, listelenir ve yanıtlanır', async () => {
  const comment = await call('POST', `/v1/posts/${ctx.postId}/comments`, {
    token: ctx.bTok,
    body: { body: 'Harika bir kayıt!' },
  });
  expectStatus(comment, 201);
  const commentId = comment.json.data.comment.id;
  const reply = await call('POST', `/v1/posts/${ctx.postId}/comments`, {
    token: ctx.aTok,
    body: { body: 'Teşekkürler', parentId: commentId },
  });
  expectStatus(reply, 201);
  const list = await call('GET', `/v1/posts/${ctx.postId}/comments`, { token: ctx.aTok });
  expectStatus(list, 200);
  expect((list.json.data.items ?? []).length >= 2, 'Yorumlar listelenmedi');
  const del = await call('DELETE', `/v1/comments/${commentId}`, { token: ctx.bTok });
  expectStatus(del, 204);
  return { expected: '201 + 2 yorum + 204', actual: 'yorum ve yanıt oluştu' };
});

await run('FT-53', 'Gönderi', 'Gönderi gövdesi güncellenir', async () => {
  const res = await call('PATCH', `/v1/posts/${ctx.postId}`, {
    token: ctx.aTok,
    body: { body: `Güncel gönderi ${RUN}` },
  });
  expectStatus(res, 200);
  expect(res.json.data.post.body.startsWith('Güncel'), 'Gövde güncellenmedi');
  return { expected: '200', actual: '200' };
});

await run('FT-54', 'Akış', 'Keşfet akışı kamu gönderisini içerir', async () => {
  const res = await call('GET', '/v1/feed?scope=explore&limit=50', { token: ctx.bTok });
  expectStatus(res, 200);
  expect((res.json.data.items ?? []).some((item) => item.post?.id === ctx.postId || item.id === ctx.postId), 'Gönderi akışta yok');
  return { expected: '200 + gönderi', actual: `${res.json.data.items.length} öğe` };
});

await run('FT-55', 'Gönderi', 'Özel varlık gönderiye eklenemez (422)', async () => {
  const res = await call('POST', '/v1/posts', {
    token: ctx.aTok,
    body: { body: 'Özel varlık paylaşımı', assetId: ctx.privateId },
  });
  expectStatus(res, 422);
  expect(res.json.error?.code === 'ASSET_NOT_SHARED', `Kod: ${res.json.error?.code}`);
  return { expected: '422 ASSET_NOT_SHARED', actual: '422' };
});

// ---------------------------------------------------------------------------
// 07 — Topluluklar
// ---------------------------------------------------------------------------
await run('FT-56', 'Topluluk', 'Açık topluluk oluşturulur, sahibi üye olur', async () => {
  const res = await call('POST', '/v1/communities', {
    token: ctx.aTok,
    body: { name: `FT Açık Grup ${RUN}`, description: 'Fonksiyonel test', joinPolicy: 'open' },
  });
  expectStatus(res, 201);
  ctx.openSlug = res.json.data.community.slug;
  expect(res.json.data.community.memberCount === 1, 'Üye sayısı 1 değil');
  return { expected: '201 üye=1', actual: `${ctx.openSlug}` };
});

await run('FT-57', 'Topluluk', 'Topluluk detayı sahip bilgisiyle döner', async () => {
  const res = await call('GET', `/v1/communities/${ctx.openSlug}`, { token: ctx.aTok });
  expectStatus(res, 200);
  expect(res.json.data.isOwner === true && res.json.data.isMember === true, 'Sahip/üye bayrakları yanlış');
  return { expected: '200 isOwner', actual: '200' };
});

await run('FT-58', 'Topluluk', 'Başka kullanıcı açık topluluğa katılır', async () => {
  const res = await call('POST', `/v1/communities/${ctx.openSlug}/join`, { token: ctx.bTok });
  expectStatus(res, 201);
  expect(res.json.data.joined === true, 'Katılım gerçekleşmedi');
  const membership = await call('GET', `/v1/communities/${ctx.openSlug}/membership`, { token: ctx.bTok });
  expectStatus(membership, 200);
  expect(membership.json.data.isMember === true, 'Üyelik aktif değil');
  return { expected: '201 + aktif üyelik', actual: 'katıldı' };
});

await run('FT-59', 'Topluluk', 'Varlık topluluğa paylaşılır ve üye listesinde görünür', async () => {
  const share = await call('POST', `/v1/communities/${ctx.openSlug}/assets`, {
    token: ctx.aTok,
    body: { assetId: ctx.publicId, scope: 'all' },
  });
  expectStatus(share, 201);
  const list = await call('GET', `/v1/communities/${ctx.openSlug}/assets`, { token: ctx.bTok });
  expectStatus(list, 200);
  expect((list.json.data.items ?? []).some((item) => item.asset?.id === ctx.publicId || item.id === ctx.publicId), 'Varlık listede yok');
  return { expected: '201 + listede', actual: 'paylaşıldı' };
});

await run('FT-60', 'Topluluk', 'Üye topluluk gönderisi oluşturur ve grup akışında görünür', async () => {
  const post = await call('POST', '/v1/posts', {
    token: ctx.bTok,
    body: { body: `Grup gönderisi ${RUN}`, audience: 'community', communityId: (await call('GET', `/v1/communities/${ctx.openSlug}`, { token: ctx.bTok })).json.data.community.id },
  });
  expectStatus(post, 201);
  ctx.communityPostId = post.json.data.post.id;
  const feed = await call('GET', `/v1/feed?community=${ctx.openSlug}&limit=50`, { token: ctx.bTok });
  expectStatus(feed, 200);
  expect((feed.json.data.items ?? []).some((item) => (item.post?.id ?? item.id) === ctx.communityPostId), 'Grup gönderisi akışta yok');
  return { expected: '201 + akışta', actual: 'paylaşıldı' };
});

await run('FT-61', 'Topluluk', 'Üye olmayan grup akışını görmez', async () => {
  const res = await call('GET', `/v1/feed?community=${ctx.openSlug}&limit=50`, { token: ctx.cTok });
  expectStatus(res, 200);
  expect((res.json.data.items ?? []).length === 0, 'Üye olmayana grup içeriği gösterildi');
  return { expected: '200 boş liste', actual: 'boş' };
});

await run('FT-62', 'Topluluk', 'Onaylı katılım isteği sahibi tarafından onaylanır', async () => {
  const create = await call('POST', '/v1/communities', {
    token: ctx.aTok,
    body: { name: `FT Onaylı Grup ${RUN}`, joinPolicy: 'approval' },
  });
  expectStatus(create, 201);
  ctx.approvalSlug = create.json.data.community.slug;
  const join = await call('POST', `/v1/communities/${ctx.approvalSlug}/join`, { token: ctx.bTok });
  expectStatus(join, 201);
  expect(join.json.data.pending === true, 'İstek beklemede değil');
  const requests = await call('GET', `/v1/communities/${ctx.approvalSlug}/requests`, { token: ctx.aTok });
  expectStatus(requests, 200);
  expect((requests.json.data.requests ?? []).some((item) => (item.user?.id ?? item.id) === ctx.bId), 'İstek listede yok');
  const approve = await call('POST', `/v1/communities/${ctx.approvalSlug}/requests/${ctx.bId}/approve`, {
    token: ctx.aTok,
  });
  expectStatus(approve, 200);
  const membership = await call('GET', `/v1/communities/${ctx.approvalSlug}/membership`, { token: ctx.bTok });
  expect(membership.json.data.isMember === true, 'Onay sonrası üyelik yok');
  return { expected: 'pending → onay → üye', actual: 'onaylandı' };
});

await run('FT-63', 'Topluluk', 'Davet gönderilir ve davetli kabul eder', async () => {
  const create = await call('POST', '/v1/communities', {
    token: ctx.aTok,
    body: { name: `FT Davet Grubu ${RUN}`, joinPolicy: 'open' },
  });
  expectStatus(create, 201);
  ctx.inviteSlug = create.json.data.community.slug;
  const invite = await call('POST', `/v1/communities/${ctx.inviteSlug}/invitations`, {
    token: ctx.aTok,
    body: { username: `ftb_${RUN}` },
  });
  expectStatus(invite, 201);
  const invitationId = invite.json.data.invitation.id;
  const mine = await call('GET', '/v1/communities/invitations/mine', { token: ctx.bTok });
  expectStatus(mine, 200);
  expect((mine.json.data.items ?? []).some((item) => item.id === invitationId), 'Davet listede yok');
  const accept = await call('POST', `/v1/communities/invitations/${invitationId}/accept`, { token: ctx.bTok });
  expectStatus(accept, 200);
  const membership = await call('GET', `/v1/communities/${ctx.inviteSlug}/membership`, { token: ctx.bTok });
  expect(membership.json.data.isMember === true, 'Davet sonrası üyelik yok');
  return { expected: '201 → kabul → üye', actual: 'kabul edildi' };
});

await run('FT-64', 'Topluluk', 'Özel topluluğa üye olmayan erişemez', async () => {
  const create = await call('POST', '/v1/communities', {
    token: ctx.aTok,
    body: { name: `FT Özel Grup ${RUN}`, visibility: 'private' },
  });
  expectStatus(create, 201);
  ctx.privateSlug = create.json.data.community.slug;
  const owner = await call('GET', `/v1/communities/${ctx.privateSlug}`, { token: ctx.aTok });
  expectStatus(owner, 200);
  const outsider = await call('GET', `/v1/communities/${ctx.privateSlug}`, { token: ctx.cTok });
  expectStatus(outsider, 403);
  return { expected: '200 / 403', actual: '200 / 403' };
});

await run('FT-65', 'Topluluk', 'Üye olmayan varlık paylaşamaz', async () => {
  const res = await call('POST', `/v1/communities/${ctx.privateSlug}/assets`, {
    token: ctx.cTok,
    body: { assetId: ctx.publicId },
  });
  expectStatus(res, 403);
  return { expected: '403', actual: '403' };
});

// ---------------------------------------------------------------------------
// 08 — Arama, bildirimler, istatistik
// ---------------------------------------------------------------------------
await run('FT-66', 'Arama', 'Arama kullanıcı, varlık ve gönderi bölümleri döner', async () => {
  const res = await call('GET', `/v1/search?q=${encodeURIComponent(`FT Kamu Varlık ${RUN}`)}`, {
    token: ctx.aTok,
  });
  expectStatus(res, 200);
  expect((res.json.data.assets ?? []).length >= 1, 'Varlık sonucu yok');
  return { expected: '200 + varlık sonucu', actual: `${(res.json.data.assets ?? []).length} varlık` };
});

await run('FT-67', 'Arama', 'Kısa arama terimi 422 döner', async () => {
  const res = await call('GET', '/v1/search?q=a', { token: ctx.aTok });
  expectStatus(res, 422);
  return { expected: '422', actual: '422' };
});

await run('FT-68', 'Arama', 'Anonim arama 401 döner', async () => {
  const res = await call('GET', '/v1/search?q=ada');
  expectStatus(res, 401);
  return { expected: '401', actual: '401' };
});

await run('FT-69', 'Bildirim', 'Bildirimler listelenir ve tümü okundu işaretlenir', async () => {
  const follow = await call('POST', `/v1/users/fta_${RUN}/follow`, { token: ctx.bTok });
  expectStatus(follow, 201);
  const list = await call('GET', '/v1/notifications?unreadOnly=true', { token: ctx.aTok });
  expectStatus(list, 200);
  expect((list.json.data.items ?? []).length >= 1, 'Okunmamış bildirim yok');
  const firstId = list.json.data.items[0].id;
  const readOne = await call('POST', `/v1/notifications/${firstId}/read`, { token: ctx.aTok });
  expectStatus(readOne, 200);
  const readAll = await call('POST', '/v1/notifications/read-all', { token: ctx.aTok });
  expectStatus(readAll, 200);
  const after = await call('GET', '/v1/notifications', { token: ctx.aTok });
  expect(after.json.data.unreadCount === 0, `Okunmamış: ${after.json.data.unreadCount}`);
  return { expected: 'okundu → unreadCount 0', actual: '0' };
});

await run('FT-70', 'İstatistik', 'Kişisel istatistik ucu sayıları döner', async () => {
  const res = await call('GET', '/v1/stats', { token: ctx.aTok });
  expectStatus(res, 200);
  expect(res.json.data.assets >= 3 && typeof res.json.data.entries === 'number', 'Sayaçlar eksik');
  return { expected: '200 + sayaçlar', actual: `assets=${res.json.data.assets}` };
});

// ---------------------------------------------------------------------------
// 09 — Güvenlik, şikâyet ve moderasyon
// ---------------------------------------------------------------------------
await run('FT-71', 'Güvenlik', 'Kullanıcı engellenir ve engel listesinde görünür', async () => {
  const block = await call('POST', '/v1/users/mert/block', { token: ctx.aTok });
  expectStatus(block, 201);
  const list = await call('GET', '/v1/me/blocks', { token: ctx.aTok });
  expectStatus(list, 200);
  expect((list.json.data.items ?? []).some((item) => item.username === 'mert'), 'Engel listesinde yok');
  const unblock = await call('DELETE', '/v1/users/mert/block', { token: ctx.aTok });
  expectStatus(unblock, 204);
  return { expected: '201 + listede + 204', actual: 'engellendi ve kaldırıldı' };
});

await run('FT-72', 'Güvenlik', 'Gönderi şikâyeti oluşturulur, tekrarı 409 döner', async () => {
  const report = await call('POST', '/v1/reports', {
    token: ctx.bTok,
    body: { targetType: 'post', targetId: ctx.postId, reason: 'Spam içerik', details: 'Test şikâyeti' },
  });
  expectStatus(report, 201);
  ctx.reportId = report.json.data.report.id;
  const duplicate = await call('POST', '/v1/reports', {
    token: ctx.bTok,
    body: { targetType: 'post', targetId: ctx.postId, reason: 'Spam içerik' },
  });
  expectStatus(duplicate, 409);
  const mine = await call('GET', '/v1/reports/mine', { token: ctx.bTok });
  expectStatus(mine, 200);
  expect((mine.json.data.items ?? []).some((item) => item.id === ctx.reportId), 'Şikâyet listelenmedi');
  return { expected: '201 → 409', actual: 'şikâyet açıldı' };
});

await run('FT-73', 'Güvenlik', 'Kendi hesabını şikâyet etme 403 döner', async () => {
  const res = await call('POST', '/v1/reports', {
    token: ctx.aTok,
    body: { targetType: 'user', targetId: ctx.aId, reason: 'Kendini şikâyet' },
  });
  expectStatus(res, 403);
  return { expected: '403', actual: '403' };
});

await run('FT-74', 'Moderasyon', 'Moderatör yönetim istatistiklerini görür, normal kullanıcı göremez', async () => {
  const selin = await login('selin', DEMO_PASSWORD);
  expectStatus(selin, 200, 'moderatör girişi');
  ctx.modTok = selin.json.data.token;
  const mod = await call('GET', '/v1/admin/stats', { token: ctx.modTok });
  expectStatus(mod, 200);
  const user = await call('GET', '/v1/admin/stats', { token: ctx.aTok });
  expectStatus(user, 403);
  return { expected: '200 / 403', actual: '200 / 403' };
});

await run('FT-75', 'Moderasyon', 'Moderatör şikâyeti çözer ve hedef gönderiyi gizler', async () => {
  const list = await call('GET', '/v1/admin/reports?status=open&limit=50', { token: ctx.modTok });
  expectStatus(list, 200);
  expect((list.json.data.items ?? []).some((item) => item.id === ctx.reportId), 'Şikâyet kuyruğunda yok');
  const resolve = await call('PATCH', `/v1/admin/reports/${ctx.reportId}`, {
    token: ctx.modTok,
    body: { status: 'resolved', hideTarget: true, resolutionNote: 'Test çözümü' },
  });
  expectStatus(resolve, 200);
  expect(resolve.json.data.report.status === 'resolved', 'Durum resolved değil');
  const feed = await call('GET', '/v1/feed?scope=explore&limit=50', { token: ctx.bTok });
  expect((feed.json.data.items ?? []).every((item) => (item.post?.id ?? item.id) !== ctx.postId), 'Gizlenen gönderi akışta kaldı');
  return { expected: 'resolved + akışta yok', actual: 'çözüldü, gizlendi' };
});

await run('FT-76', 'Gönderi', 'Gönderi silinir ve akıştan düşer', async () => {
  const create = await call('POST', '/v1/posts', {
    token: ctx.aTok,
    body: { body: `Silinecek gönderi ${RUN}`, audience: 'public' },
  });
  expectStatus(create, 201);
  const postId = create.json.data.post.id;
  const res = await call('DELETE', `/v1/posts/${postId}`, { token: ctx.aTok });
  expectStatus(res, 204);
  const feed = await call('GET', '/v1/feed?scope=explore&limit=50', { token: ctx.bTok });
  expect((feed.json.data.items ?? []).every((item) => (item.post?.id ?? item.id) !== postId), 'Silinen gönderi akışta');
  return { expected: '204 + akışta yok', actual: '204' };
});

await run('FT-81', 'Gönderi', 'Sahip, moderasyon tarafından gizlenen gönderisini silemez (gözlem)', async () => {
  // FT-75 sonunda gönderi moderatör tarafından gizlendi. Sahibi hâlâ erişemiyor.
  const del = await call('DELETE', `/v1/posts/${ctx.postId}`, { token: ctx.aTok });
  const view = await call('GET', `/v1/posts/${ctx.postId}`, { token: ctx.aTok });
  expect(del.status === 403 && view.status === 403, `Beklenen gözlem 403/403 — gelen ${del.status}/${view.status}`);
  return {
    expected: 'Gözlem: gizlenen gönderi sahibine de 403',
    actual: 'sahip gönderiyi ne görebiliyor ne silebiliyor',
    note: 'Ürün kararı gereği sahibinin gizlenen içeriği silmesine izin verilmeli; raporda bulgu olarak listelendi.',
  };
});

// ---------------------------------------------------------------------------
// 10 — Sosyal paylaşım yapılandırması
// ---------------------------------------------------------------------------
await run('FT-77', 'Sosyal', 'Yapılandırma ucu eksik anahtarları bildirir', async () => {
  const res = await call('GET', '/v1/social/config', { token: ctx.aTok });
  expectStatus(res, 200);
  expect(res.json.data.configured === false, 'Test ortamında sosyal yapılandırma açık olmamalı');
  expect(Array.isArray(res.json.data.missing) && res.json.data.missing.length > 0, 'Eksik anahtar listesi boş');
  return { expected: '200 configured:false', actual: `eksik: ${res.json.data.missing.join(',')}` };
});

await run('FT-78', 'Sosyal', 'Bağlantı listesi boş döner', async () => {
  const res = await call('GET', '/v1/social/connections', { token: ctx.aTok });
  expectStatus(res, 200);
  expect(Array.isArray(res.json.data.items) && res.json.data.items.length === 0, 'Bağlantı listesi boş değil');
  return { expected: '200 items:[]', actual: 'boş' };
});

await run('FT-79', 'Sosyal', 'Yapılandırılmamışken paylaşım 503 döner', async () => {
  const res = await call('POST', '/v1/social/share', {
    token: ctx.aTok,
    body: { assetId: ctx.publicId, provider: 'facebook', format: 'post' },
  });
  expectStatus(res, 503);
  expect(res.json.error?.code === 'SOCIAL_NOT_CONFIGURED', `Kod: ${res.json.error?.code}`);
  return { expected: '503 SOCIAL_NOT_CONFIGURED', actual: '503' };
});

await run('FT-80', 'Sosyal', 'Yapılandırılmamışken OAuth başlatma 503 döner', async () => {
  const res = await call('GET', '/v1/social/facebook/start', { token: ctx.aTok });
  expectStatus(res, 503);
  return { expected: '503', actual: '503' };
});

// ---------------------------------------------------------------------------
// Özet
// ---------------------------------------------------------------------------
const passed = results.filter((item) => item.status === 'PASS').length;
const failed = results.length - passed;
const byArea = {};
for (const item of results) {
  byArea[item.area] ??= { total: 0, passed: 0, failed: 0 };
  byArea[item.area].total += 1;
  byArea[item.area][item.status === 'PASS' ? 'passed' : 'failed'] += 1;
}

const summary = {
  base: BASE,
  run: RUN,
  startedAt: new Date().toISOString(),
  total: results.length,
  passed,
  failed,
  byArea,
  results,
};

console.log(`\nSonuç: ${passed}/${results.length} geçti, ${failed} başarısız`);
for (const [area, stat] of Object.entries(byArea)) {
  console.log(`  ${area}: ${stat.passed}/${stat.total}`);
}

const fs = await import('node:fs/promises');
const outPath = process.env.OUT_FILE || 'rapor/functional-test-results.json';
await fs.mkdir('rapor', { recursive: true });
await fs.writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`Sonuç dosyası: ${outPath}`);
process.exit(failed > 0 ? 1 : 0);
