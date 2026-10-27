# Varlık Hafızası — v1 Ürün ve Teknik Analiz

> **Tek cümle:** Sahip olduğunuz canlı, dönüşen ve süreç içeren her şeyin bakımını, fotoğraflarını, belgelerini ve hikâyesini tek bir zamansal hafızada toplayan; web ve Android'de çalışan arşiv odaklı bir uygulama.

Sürüm: **v1.0 (MVP)** · Dil: Türkçe · Tarih: Ekim 2026

---

## 1. Yönetici özeti

İnsanların hayatında "sahip olunan" ama klasik envanter uygulamalarına sığmayan şeyler vardır: bir bonsai, bir köpek, bir çiçek, bir tablo, bir heykel, bir ev. Bunların ortak paydası **zaman içinde değişmeleri** ve **bakım/olay geçmişi** taşımalarıdır. Bugün bu geçmiş; telefon galerisi, WhatsApp sohbetleri, not defterleri, e-postalar ve klasörler arasında dağınık durur. Kaybolur, bağlamını yitirir, paylaşılması zordur.

**Varlık Hafızası**, her varlık için bir profil ve kesintisiz bir zaman çizelgesi kurar. Kullanıcı bir anı, bakımı, ölçümü, sağlık notunu, satın alma belgesini veya fotoğrafı tek akışta kaydeder. Varlık ister özel kalsın ister seçili kişilerle ya da herkese açık paylaşılsın; arşiv sahibinin kontrolündedir.

MVP'nin odağı kullanıcı kararıyla **belge ve fotoğraf arşivi** olarak belirlendi. Sosyal katman (keşfet, beğeni, yorum, takip, topluluk) bu arşivi besleyen ve görünür kılan **destekleyici** katmandır; ürünün merkezi değildir.

**v1 kapsamında teslim edilenler:**

| Katman | Durum | Özet |
|---|---|---|
| Ürün analizi | ✅ | Bu belge |
| PostgreSQL şeması + demo veri | ✅ | 19 tablo, enum'lar, indeksler, tetikleyiciler |
| REST API (Fastify + TypeScript) | ✅ | Kimlik, varlık, zaman çizelgesi, medya, arşiv, sosyal, bildirim, moderasyon, KVKK |
| Web (Next.js 15 + React 19) | ✅ | Giriş, panel, varlık liste/detay/yeni, arşiv, keşfet, bildirim, profil, 404 |
| Android (Kotlin + Compose) | ✅ | Aynı API'yi kullanan istemci; derleme talimatları `android/README.md` |
| Altyapı (Docker + Terraform) | ✅ | Üretim compose, Caddy, yedekleme, bulut bağımsız Terraform |

> Not: Android, Temurin JDK 17 ve Android SDK 35 kurularak `assembleDebug` ile derlendi; debug APK'nın imzası ve manifest bilgileri doğrulandı, ancak uygulama emülatör/cihazda çalıştırılmadı. Altyapı için `terraform validate`, `docker compose config` ve `caddy validate` başarılıdır; Docker motoru bulunmadığından imajlar çalıştırılmadı, TLS ve yedek geri yükleme uçtan uca denenmedi. Ayrıntılar ilgili README'lerde.

---

## 2. Problem ve fırsat

### 2.1 Problem

1. **Dağınıklık:** Bir varlığın geçmişi galeri, mesaj, not ve bulut klasörlerine bölünür.
2. **Bağlam kaybı:** Fotoğrafın hangi tarihte, hangi bakımdan sonra çekildiği unutulur.
3. **Süreklilik yokluğu:** Bakım aralıkları, sağlık olayları ve ölçümler (boy, ağırlık, sulama) takip edilemez.
4. **Paylaşım kaba:** Tüm galeriyi paylaşmak yerine yalnızca bir varlığın seçili bölümünü paylaşmak zordur.
5. **Devir/geçmiş:** Bir eser veya bitki el değiştirdiğinde geçmişi yeni sahibine geçmez.

### 2.2 Fırsat

- "Yaşayan varlık" sahipleri (bonsai, evcil hayvan, bitki) tutkulu niş topluluklardır ve düzenli içerik üretir.
- Arşiv değeri zamanla artar: uygulama bir alışkanlık (ritüel) haline gelir, veri değiştirme maliyeti yükselir.
- Aynı veri modeli; koleksiyon, ev bakımı, aile arşivi gibi komşu kullanım alanlarına genişler.

### 2.3 Değer önerisi

- **Sizin için:** "Baktığım her şeyin tek bir hafızası."
- **Yakınlarınız için:** "Seçtiğiniz kişiyle sadece o varlığın hikâyesini paylaşın."
- **Meraklılar için:** "Benzer varlıkların gerçek süreçlerini görün; ilham alın."

---

## 3. "Varlık" tanımı

Varlık; **sahiplenilen, zaman içinde değişen ve kayıt altına alınmaya değer bir süreç taşıyan** herhangi bir şeydir.

| Kategori | Örnekler | Tipik zaman çizelgesi olayları |
|---|---|---|
| Canlı — bitki | Bonsai, orkide, sukulent | Sulama, budama, saksı değişimi, çiçeklenme, ölçüm |
| Canlı — hayvan | Köpek, kedi, kuş | Aşı, veteriner, kilo, eğitim, doğum günü |
| Sanat / obje | Tablo, heykel, saat, enstrüman | Edinme, restorasyon, sergileme, sigorta belgesi |
| Mekân | Ev, bahçe, atölye | Tadilat, bakım, fatura, garanti belgesi |
| Diğer | Koleksiyon, araç, bisiklet | Servis, muayene, modifiye, satış |

**Varlık tipi** (`asset_types`) hiyerarşiktir ve her tip bir `attributes_schema` (JSONB) taşır. Böylece ileride tipe özel alanlar (ör. bonsai için `tür`, `saksı`) kod değişikliği olmadan eklenebilir.

---

## 4. Personalar

### P1 — Ada, 34, bonsai meraklısı (birincil)
Haftada birkaç kez bonsaisine bakıyor. Süreci fotoğraflıyor, budama notlarını bir yere yazıyor ama kayboluyor. **İhtiyaç:** hızlı kayıt, tarihli akış, önce/sonra karşılaştırması, meraklılarla paylaşım. **Başarı:** "3 yıllık gelişimi tek ekranda görebiliyorum."

### P2 — Mert, 41, köpek sahibi (birincil)
Luna'nın aşıları, vet kontrolleri ve kilosu önemli. Aile bireyleriyle ortak erişim ister. **İhtiyaç:** sağlık kaydı, hatırlatma (v1.1), seçili paylaşım, belge arşivi. **Başarı:** "Veterinerdeyken tüm geçmiş elimde."

### P3 — Selin, 29, sanat koleksiyoncusu (ikincil)
Aldığı eserlerin provenansını ve belgelerini saklamak istiyor; herkese açık paylaşmak istemiyor. **İhtiyaç:** özel arşiv, belge yükleme, düzenli kürasyon. **Başarı:** "Eserin hikâyesi ve evrakları tek yerde."

### P4 — Deniz, 26, meraklı (okuyucu)
Kendi varlığı yok ya da az; keşfet akışında süreçleri izliyor, beğeniyor, yorum yapıyor, ilham alıyor. **İhtiyaç:** kaliteli keşfet, takip, bildirim. **Başarı:** "İlgilendiğim süreçleri kaçırmıyorum."

### P5 — Moderatör (operasyon)
Şikâyetleri inceler, içeriği gizler, kullanıcıyı askıya alır. **İhtiyaç:** kuyruk, denetim izi, gerekçe.

---

## 5. Kullanıcı yolculukları

### 5.1 İlk kurulum (onboarding)
1. Kayıt (e-posta, kullanıcı adı, görünen ad, şifre) → oturum açılır.
2. İlgi alanları seçilir (bonsai, evcil hayvan, sanat…).
3. "İlk varlığını oluştur" yönlendirmesi → tip seçimi, ad, açıklama, kapak fotoğrafı.
4. Varlık detayına düşer; ilk not/fotoğraf ekleme çağrısı görür.
5. İlk kayıttan sonra panelde varlıklar, son hareketler ve arşiv özeti görünür.

### 5.2 Günlük kayıt (ürünün kalbi)
1. Panelden veya varlık detayından "Kayıt ekle".
2. Tür seçilir: not, fotoğraf, bakım, sağlık, ölçüm, edinme, belge, olay.
3. Metin + tarih + görünürlük + isteğe bağlı medya.
4. Kayıt zaman çizelgesine düşer; kapak ve arşiv otomatik güncellenir.
5. İsteğe bağlı olarak kayıt "keşfet"te post olarak paylaşılır.

### 5.3 Arşivde arama
1. Arşiv sekmesi → tüm görseller/belgeler/videolar.
2. Tür filtresi + serbest metin arama.
3. Görsele tıklama → lightbox; belge → yeni sekmede açılır.
4. Sonsuz kaydırma (cursor) ile ilerleme.

### 5.4 Seçili paylaşım
1. Varlık detayı → "Paylaşım" sekmesi.
2. Kullanıcı adıyla kişi ekle → yalnızca o kişi görüntüleyebilir.
3. Erişim listesi görünür; kaldırma tek tıkla.
4. Varlık `selected` görünürlüğüne alınır.

### 5.5 Keşfet ve etkileşim
1. Keşfet akışında herkese açık varlık kayıtları.
2. Beğeni, yorum, takip; bildirim üretimi.
3. Topluluk akışı (bonsai severler vb.) — v1'de topluluk API'si hazır, web'de temel akış.

### 5.6 Veri hakları
1. Profil → "Verilerimi indir" → JSON dışa aktarım.
2. Hesabı sil → oturumlar iptal, kişisel içerik pasifleştirilir; denetim kaydı korunur.

---

## 6. MVP kapsamı

### 6.1 İçeride (v1)

**Çekirdek arşiv**
- E-posta/kullanıcı adı + şifre ile kimlik; 30 günlük opak oturum.
- Varlık profili: tip, ad, açıklama, kapak, konum adı, edinme tarihi, görünürlük, durum.
- Zaman çizelgesi: not, fotoğraf, bakım, edinme, ölçüm, sağlık, olay, belge.
- Fotoğraf/video/belge yükleme (10 MB, base64 API; S3 presign desteği).
- Kapak fotoğrafı seçimi; otomatik arşiv kaydı.
- Ölçümler (metrik + değer + birim + tarih) ve detay ekranında listeleme.
- Arşiv sayfası: tür filtresi, arama, cursor tabanlı sonsuz liste, lightbox.
- Seçili paylaşım: kullanıcı bazlı görüntüleme izni.

**Destekleyici sosyal**
- Herkese açık varlıklarda keşfet akışı.
- Post oluşturma (varlık/kayıt/topluluk bağlantılı), beğeni, yorum.
- Takip et / takibi bırak, önerilen kişiler.
- Bildirim kutusu; okundu işaretleme.
- Profil: istatistikler, varlıklar, postlar.
- Topluluklar: listeleme, katılma/ayrılma, üye listesi, topluluk akışı.

**Güvenlik ve uyum**
- Şifre hash'leme (scrypt), oturum token'ı yalnızca hash olarak saklanır.
- Rate limit, Zod doğrulama, merkezi hata formatı, denetim olayları.
- Engelleme, şikâyet, moderasyon kuyruğu.
- KVKK: veri dışa aktarma, hesap silme, gizlilik ilkeleri.

### 6.2 Dışarıda (bilinçli olarak v1'de yok)

| Özellik | Neden ertelendi |
|---|---|
| Push bildirim | Mobil altyapı ve izin akışı ayrı iş; v1.1 |
| Bakım hatırlatıcıları / takvim | Zamanlanmış iş kuyruğu gerektirir; v1.1 |
| Çevrimdışı kayıt ve senkron | Çakışma çözümü ve yerel DB karmaşıklığı; v1.1 |
| Video transkodlama / streaming | Depolama ve işlem maliyeti; v1'de doğrudan oynatma |
| Yapay zekâ ile bitki/hastalık teşhisi | Veri ve model olgunluğu; v2 |
| Uçtan uca şifreleme | Paylaşım ve arama ile çelişir; v2'de isteğe bağlı kasa |
| Ödeme / abonelik | Önce kullanım kanıtı; v2 |
| Gerçek zamanlı sohbet | Sosyal katman yeterli; v2 |
| Çoklu sahiplik / ekip | Şema `ownerships` ile hazır; arayüz v1.2 |
| Varlık devri (provenans) | Şema hazır; akış v1.2 |

### 6.3 Sürüm planı

- **v1.0 (bu teslim):** arşiv çekirdeği + destekleyici sosyal + web + Android + altyapı.
- **v1.1:** push, hatırlatıcılar, çevrimdışı taslak, kapak kırpma, gelişmiş arama.
- **v1.2:** ortak sahiplik, varlık devri, topluluk yönetimi, web'de tam topluluk deneyimi.
- **v2.0:** yapay zekâ destekli bakım önerileri, abonelik, aile/ekip planı, gelişmiş gizlilik.

---

## 7. Bilgi mimarisi ve ekranlar

### 7.1 Web (Next.js App Router)

```
/giris                     Giriş (ayrı auth düzeni, görsel + form)
/                          Panel: selamlama, özet sayaçlar, varlıklar, son hareketler
/varliklar                 Tüm varlıklar: filtre, arama, ızgara
/varliklar/yeni            Yeni varlık formu (tip, ad, kapak, görünürlük)
/varliklar/[id]            Detay: kapak, özet, zaman çizelgesi, arşiv, ölçümler, paylaşım
/arsiv                     Arşiv: görsel/belge/video, arama, sonsuz liste, lightbox
/kesfet                    Keşfet: akış, öne çıkan varlıklar, kişi önerileri
/bildirimler               Bildirim kutusu
/profil                    Kendi profili
/profil/[username]         Başka kullanıcı profili
```

- **Yerleşim:** masaüstünde koyu yeşil yan menü + krem "kâğıt" içerik; mobilde alt/üst gezinme.
- **Tasarım dili:** arşiv/editoryal; serif başlıklar, toprak tonları, kemerli kapak görseli, ince çizgiler.
- **Veri erişimi:** Sunucu bileşenleri API'yi httpOnly `vh_token` çereziyle çağırır. Tarayıcıdan yapılan işlemler `/api/vh/*` BFF proxy'sinden geçer; token tarayıcı JS'ine verilmez.

### 7.2 Android (Jetpack Compose)

```
Giriş                     E-posta/kullanıcı adı + şifre
Panel                     Özet + varlık kartları + son hareketler
Varlıklar                 Liste + arama
Varlık detayı             Kapak, sekmeler: Zaman çizelgesi / Arşiv / Ölçümler / Paylaşım
Yeni varlık               Tip seçimi, ad, açıklama, kapak, görünürlük
Kayıt ekle                Tür, metin, tarih, medya, görünürlük
Arşiv                     Medya ızgarası, tür filtresi, arama
Keşfet                    Akış, beğeni, yorum
Bildirimler               Okundu işaretleme
Profil                    İstatistik, varlıklar, çıkış
```

- **Teknoloji:** Kotlin 2.x, Compose BOM, Material 3, Navigation Compose, Retrofit + kotlinx.serialization, OkHttp, Coil, DataStore.
- **Taban adres:** emülatörde `http://10.0.2.2:4000`; üretimde HTTPS API.
- **Medya:** API göreli `/files/...` döner; istemci taban adresle çözer.
- **Oturum:** token DataStore'da; 401'de giriş ekranına dönüş.

---

## 8. Veri modeli

PostgreSQL 17. Tüm kimlikler `uuid` (varsayılan `gen_random_uuid()`); zamanlar `timestamptz`; yumuşak silme `deleted_at`.

### 8.1 Tablolar

| Tablo | Amaç | Önemli alanlar / kurallar |
|---|---|---|
| `users` | Hesap | `email`/`username` citext tekil, `password_hash`, `role`, `interests[]`, `onboarded_at` |
| `sessions` | Oturum | `token_hash` tekil, `expires_at`, `revoked_at`, IP/UA |
| `asset_types` | Varlık tipi ağacı | `id` metin, `parent_id`, `attributes_schema` JSONB |
| `assets` | Varlık profili | `owner_id`, `type_id`, `visibility`, `status`, `attributes` JSONB, konum, `acquired_at` |
| `ownerships` | Sahiplik geçmişi | Varlık başına **tek aktif** sahip (partial unique) |
| `access_rules` | Seçili paylaşım | `resource_type` (asset/entry), `resource_id`, `user_id`, `permission=view` |
| `journal_entries` | Zaman çizelgesi | `type`, `title`, `body`, `occurred_at`, `visibility`, `attributes` |
| `asset_measurements` | Ölçümler | `metric`, `value`, `unit`, `measured_at`, opsiyonel `entry_id` |
| `media` | Dosya meta | `kind`, `status`, `storage_key`, boyut/çözünürlük, `asset_id`/`entry_id`/`post_id` |
| `posts` | Sosyal paylaşım | `audience`, `community_id`, `asset_id`/`entry_id`, durum |
| `likes` | Beğeni | `(user_id, post_id)` PK |
| `comments` | Yorum | Post başına, yumuşak silme |
| `follows` | Takip | `(follower_id, following_id)` |
| `memberships` | Topluluk üyeliği | `role`, `community_id`, `user_id` |
| `communities` | Topluluk | `slug` tekil, görünürlük, kapak |
| `notifications` | Bildirim | `type`, `message`, `read_at`, hedef |
| `blocks` | Engelleme | Yönlü |
| `reports` | Şikâyet | Hedef türü, durum, moderatör notu |
| `audit_events` | Denetim izi | Aktör, eylem, varlık, IP, meta |

### 8.2 Numaralandırmalar

`user_role`, `visibility` (private/selected/public), `asset_status`, `ownership_status`, `entry_type` (note/photo/maintenance/acquisition/measurement/health/event/document), `media_kind`, `media_status`, `content_status`, `post_audience`, `community_role`, `community_visibility`, `notification_type`, `report_target_type`, `report_status`, `access_resource_type`.

### 8.3 Görünürlük ve erişim kuralı

Bir varlık veya kayıt şu durumda görüntülenebilir:

1. **Sahibi** ise (veya aktif ortak sahibi ise) — her zaman.
2. Varlık `public` ise ve kayıt `public` ise — herkes.
3. Varlık `selected` ise ve kullanıcı için `access_rules` kaydı varsa — o kullanıcı.
4. Varlık `private` ise — yalnızca sahibi.

> Uygulama detayında kayıt düzeyi görünürlük de dikkate alınır: özel bir varlığın herkese açık tek bir kaydı, varlığı herkese açmaz.

### 8.4 İndeks stratejisi

- Zaman çizelgesi: `(asset_id, occurred_at DESC, id DESC)` — cursor sayfalama için.
- Akış: `posts(created_at DESC, id DESC)` kısmi indeks (`status='visible'`).
- Arşiv: `media(owner_id)`, `media(asset_id)`, `media(entry_id)`.
- Arama: `pg_trgm` GIN indeksleri (`assets.title`, `communities.name`).
- Bildirim: okunmamışlar için kısmi indeks.
- Sahiplik: varlık başına tek aktif satır için partial unique.

### 8.5 Bütünlük

- Tüm yabancı anahtarlar açık; kullanıcı silme çoğu yerde `RESTRICT` (denetim ve içerik korunur).
- `updated_at` tetikleyicileri.
- `assets_ownership` tetikleyicisi: varlık oluşturulunca sahiplik kaydı açılır.
- `posts_has_content` ve `posts_audience_target` CHECK kısıtları.

---

## 9. API sözleşmesi

**Temel:** `GET /health` (DB + depolama durumu). Tüm iş uçları `/v1` altında.

**Zarf:**

```json
{ "data": { } }
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "fields": {} } } }
```

**Kimlik:** `Authorization: Bearer <token>`. Token yalnızca giriş/kayıtta bir kez döner; sunucuda SHA-256 hash'i saklanır. Web'de httpOnly çerez → BFF proxy.

**Sayfalama:** Cursor tabanlı; yanıtta `nextCursor`. Varsayılan limit 20–36 arası uca göre değişir.

### 9.1 Uçlar

| Alan | Yöntem ve yol | Not |
|---|---|---|
| Sağlık | `GET /health` | 503: DB erişilemiyor |
| Kayıt | `POST /v1/auth/register` | 10/15 dk limit |
| Giriş | `POST /v1/auth/login` | E-posta **veya** kullanıcı adı |
| Oturum | `GET /v1/auth/session` | Geçerli kullanıcı |
| Çıkış | `POST /v1/auth/logout` | Oturumu iptal eder |
| Tipler | `GET /v1/asset-types` | Ağaç yapısı |
| Varlıklar | `GET /v1/assets` | `status`, `type`, `q`, cursor |
| Keşfet varlıkları | `GET /v1/assets/discover` | `sort=recent\|popular`, limit |
| Varlık oluştur | `POST /v1/assets` | Sahiplik otomatik |
| Varlık detay | `GET /v1/assets/:id` | `asset`, `entries`, `ownerships`, `access` |
| Zaman çizelgesi | `GET /v1/assets/:id/entries` | Cursor |
| Varlık güncelle | `PATCH /v1/assets/:id` | Sahip |
| Varlık sil | `DELETE /v1/assets/:id` | Yumuşak silme |
| Erişim listesi | `GET /v1/assets/:id/access` | Sahip |
| Erişim ver | `POST /v1/assets/:id/access` | Kullanıcı adı ile |
| Erişim kaldır | `DELETE /v1/assets/:id/access/:userId` | 204 |
| Kayıt ekle | `POST /v1/assets/:id/entries` | Medya kimlikleri ile |
| Kayıt oku | `GET /v1/entries/:id` | Erişim denetimli |
| Kayıt güncelle/sil | `PATCH`/`DELETE /v1/entries/:id` | Yazar/sahip |
| Kayıt medyası | `GET /v1/entries/:id/media` | |
| Ölçümler | `GET /v1/assets/:id/measurements` | |
| Medya yükle | `POST /v1/media/upload` | base64, ≤10 MB |
| Presign | `POST /v1/media/presign` | S3/MinIO |
| Yükleme tamamla | `POST /v1/media/:id/complete` | |
| Arşiv | `GET /v1/media` | `kind`, `q`, `assetId`, cursor |
| Medya detay | `GET /v1/media/:id` | |
| Akış | `GET /v1/feed` | `scope=home\|explore`, `author`, `community`, `q` |
| Post oluştur | `POST /v1/posts` | Varlık/kayıt/topluluk |
| Post oku/güncelle/sil | `GET`/`PATCH`/`DELETE /v1/posts/:id` | |
| Beğeni | `POST`/`DELETE /v1/posts/:id/like` | `{liked, likeCount}` |
| Yorumlar | `GET`/`POST /v1/posts/:id/comments` | |
| Yorum sil | `DELETE /v1/comments/:id` | |
| Topluluklar | `GET`/`POST /v1/communities` | |
| Topluluk detay | `GET`/`PATCH /v1/communities/:slug` | |
| Üyelik | `POST`/`DELETE /v1/communities/:slug/join` | |
| Üyeler | `GET /v1/communities/:slug/members` | |
| Profil | `GET /v1/users/:username` | İstatistik + varlıklar |
| Kullanıcı varlıkları | `GET /v1/users/:username/assets` | |
| Takipçiler | `GET /v1/users/:username/followers` / `following` | |
| Takip | `POST`/`DELETE /v1/users/:username/follow` | |
| Öneriler | `GET /v1/users/suggestions` | |
| Profilim | `PATCH /v1/me` · `GET /v1/me/summary` | |
| Onboarding | `POST /v1/me/onboarding` | İlgi alanları |
| Veri dışa aktar | `GET /v1/me/export` | JSON |
| Hesap sil | `DELETE /v1/me` | |
| Engeller | `GET /v1/me/blocks` · `POST`/`DELETE /v1/users/:username/block` | |
| Bildirimler | `GET /v1/notifications` · `POST /read-all` · `POST /:id/read` | |
| Şikâyet | `POST /v1/reports` · `GET /v1/reports/mine` | |
| Arama | `GET /v1/search` | Varlık/kullanıcı/topluluk |
| İstatistik | `GET /v1/stats` | Panel sayaçları + son kayıtlar |
| Moderasyon | `GET /v1/admin/...` | Moderatör/admin |

### 9.2 Örnek: kayıt oluşturma

```http
POST /v1/assets/6f9c.../entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "maintenance",
  "title": "İlkbahar budaması",
  "body": "Ana gövdeden iki dal alındı; tel yönü güncellendi.",
  "occurredAt": "2026-10-12T09:30:00.000Z",
  "visibility": "private",
  "mediaIds": ["0b7e..."]
}
```

Yanıt `201` + `{ "data": { "entry": { … , "media": [ … ] } } }`. Kapak boşsa ilk görsel kapak olarak atanır.

### 9.3 Hata kodları

| HTTP | Kod | Anlam |
|---|---|---|
| 401 | `UNAUTHORIZED` | Oturum yok/geçersiz |
| 403 | `FORBIDDEN` | Yetki yok |
| 404 | `NOT_FOUND` | Kayıt yok veya görünmez |
| 409 | `CONFLICT` | Tekil alan çakışması |
| 422 | `VALIDATION_ERROR` / `INVALID_DATA` | Alan veya kural ihlali |
| 429 | `RATE_LIMITED` | Dakikada 300 istek (uç bazlı daha sıkı) |
| 500 | `INTERNAL_ERROR` | Üretimde ayrıntı sızdırılmaz |

---

## 10. Mimari

```
┌────────────────────┐        ┌────────────────────┐
│  Android (Compose) │        │  Web (Next.js 15)  │
│  Retrofit + Coil   │        │  RSC + BFF proxy   │
└─────────┬──────────┘        └─────────┬──────────┘
          │ HTTPS Bearer                │ httpOnly çerez
          │                             │ /api/vh/* → API
          ▼                             ▼
   ┌──────────────────────────────────────────┐
   │        Fastify 5 API (TypeScript)        │
   │  auth · assets · entries · media · feed  │
   │  posts · users · notifications · safety  │
   │  Zod · rate-limit · audit · CORS         │
   └───────┬──────────────────────┬───────────┘
           │ pg                   │ local / S3
           ▼                      ▼
   ┌───────────────┐      ┌────────────────────┐
   │ PostgreSQL 17 │      │ Dosya deposu       │
   │ (birincil)    │      │ ./storage | S3/MinIO│
   └───────────────┘      └────────────────────┘
```

### 10.1 Neden bu mimari?

- **Tek API, iki istemci:** Web ve Android aynı sözleşmeyi kullanır; iş kuralları tek yerde.
- **Web'de BFF:** Token tarayıcı JS'ine hiç girmez; CORS ve çerez yönetimi tek noktada.
- **Sunucu bileşenleri:** İlk boyama hızlı, veri sunucuda çekilir; etkileşimli parçalar küçük client bileşenleri.
- **Depolama soyutlaması:** Geliştirmede yerel disk, üretimde S3 uyumlu (MinIO dahil) — aynı kod.
- **Bulut bağımsız:** Docker imajları + Terraform; herhangi bir VM/VPS veya yönetilen PostgreSQL'e taşınabilir.

### 10.2 Medya akışı

**Küçük dosyalar (≤10 MB):**
1. İstemci dosyayı base64'e çevirir → `POST /v1/media/upload` (hedef: asset/entry/post).
2. API boyut ve MIME doğrular, depoya yazar, `media` satırı (`status=ready`) oluşturur.
3. URL göreli döner: `/files/<key>`.
4. Web'de `/files` rewrite ile API'ye; Android'de taban adresle çözülür.

**Büyük dosyalar / S3:**
1. `POST /v1/media/presign` → imzalı PUT URL + medya kimliği.
2. İstemci doğrudan depoya yükler.
3. `POST /v1/media/:id/complete` → durum `ready`.

**Güvenlik:** Sahiplik ve hedef erişimi doğrulanır; depolama anahtarı tahmin edilemez; yalnızca izinli türler.

### 10.3 Teknoloji sürümleri

| Katman | Sürüm |
|---|---|
| Node.js | 22 LTS |
| Fastify | 5.x |
| PostgreSQL | 17 |
| Next.js | 15.5.x |
| React | 19.1 |
| TypeScript | 5.7 |
| Kotlin / Compose | 2.x / BOM (bkz. Android README) |
| Ters vekil | Caddy 2 |
| Altyapı | Docker Compose + Terraform ≥1.7 |

---

## 11. Güvenlik ve KVKK

### 11.1 Kimlik ve oturum

- Şifre: scrypt (tuzlu); düz metin asla saklanmaz.
- Oturum: 32 baytlık rastgele token; DB'de SHA-256 hash; 30 gün TTL; çıkışta iptal.
- Web: httpOnly, `SameSite=Lax`, üretimde `Secure` çerez.
- Giriş/kayıt uçlarında sıkı rate limit; hatalı girişte kullanıcı/şifre ayrımı yapılmaz.

### 11.2 Yetkilendirme

- Her uçta kaynak sahipliği ve görünürlük denetimi.
- Erişim kararları tek yardımcı katmanda (`lib/access.ts`); API ve detay yanıtı aynı kuralı kullanır.
- Silme işlemleri yumuşak; denetim kaydı tutulur.
- Admin/moderation uçları rol kontrolü.

### 11.3 Girdi ve çıktı

- Tüm gövdeler Zod ile doğrulanır; bilinmeyen alanlar reddedilir.
- Boyut limitleri: gövde 16 MB, dosya 10 MB.
- MIME + uzantı kontrolü; SVG gibi aktif içerikler kabul edilmez.
- React/Compose otomatik kaçış; kullanıcı metni HTML olarak yorumlanmaz.
- CORS yalnızca tanımlı kaynaklar.

### 11.4 KVKK / gizlilik

- **Veri minimizasyonu:** Konum opsiyonel; yalnızca kullanıcı girerse saklanır.
- **Amaç sınırlaması:** İçerik yalnızca arşiv ve kullanıcının seçtiği paylaşım için kullanılır.
- **Erişim hakkı:** `GET /v1/me/export` ile makine okunur JSON.
- **Silme hakkı:** `DELETE /v1/me`; oturumlar iptal, profil pasif, içerik erişilemez.
- **Saklama:** Denetim ve güvenlik kayıtları yasal süre boyunca; sonra anonimleştirme.
- **Çocuklar:** 18 yaş altı için hedefli değil; kayıt sırasında yaş beyanı v1.1.
- **Aydınlatma:** Giriş ve profil ekranlarında gizlilik özeti; tam metin yayın öncesi hukuk incelemesi gerektirir.

### 11.5 Operasyonel güvenlik

- Secret'lar yalnızca ortam değişkeni / secret manager; repoda `.env` yok (yalnızca örnek).
- Ters vekilde TLS, HSTS, güvenlik başlıkları.
- DB dışarıya kapalı; yalnızca iç ağ.
- Yedekler erişim kısıtlı dizinde tutulur; üretimde şifreleme ve sunucu dışı kopya önerilir; geri yükleme tatbikatı çeyreklik.
- Denetim olayları ve yapılandırılmış loglar; kişisel veri loglanmaz.
- Bağımlılık taraması (`npm audit`) ve düzenli güncelleme.

---

## 12. PostgreSQL ve bulut altyapısı

### 12.1 Üretim topolojisi (tek sunucu başlangıcı)

```
İnternet
   │ 443
   ▼
Caddy (TLS, güvenlik başlıkları, ters vekil)
   ├── /            → web:3000  (Next.js standalone)
   ├── /api/vh/*    → web:3000  (BFF)
   ├── /v1/*        → api:4000
   └── /files/*     → api:4000  (veya doğrudan S3/CDN)
        │
        ├── api (Fastify) ── PostgreSQL 17 (volume, iç ağ)
        └── harici S3 / MinIO (opsiyonel, S3 uyumlu)
```

- **Compose servisleri:** `db`, `api`, `web`, `caddy`, isteğe bağlı `seed`; sağlık kontrolleri ve `depends_on: condition: service_healthy`.
- **Kalıcılık:** `vh-db-data`, `vh-media-data`, `vh-caddy-data`/`vh-caddy-config` birimleri; yedekler sunucuda `backups/` dizininde.
- **Yedek:** günlük `pg_dump` + medya senkronu; 14 günlük döngü; `restore.sh` ile doğrulama.
- **Gözlemlenebilirlik:** `/health` uçları, container logları, disk/DB uyarıları (v1.1'de Prometheus/Grafana).
- **Ölçekleme yolu:** API yatay çoğaltma (oturum DB'de), medya S3/CDN'e taşıma, PostgreSQL yönetilen hizmete geçiş.

### 12.2 Bulut bağımsız Terraform

- Sağlayıcı: Docker (SSH üzerinden uzak motor) — AWS/GCP/Azure/Hetzner fark etmeksizin çalışır.
- Kaynaklar: ağ, volume'ler, imajlar, container'lar, Caddy yapılandırması.
- Güvenlik duvarı ve DNS bulut konsolu/`ufw` ile ayrıca yönetilir (yalnızca 22/80/443).
- Değişkenler: alan adı, SSH anahtarı, imaj etiketleri, DB parolası (secret), depolama seçimi.
- Durum dosyası uzak backend'de (S3 uyumlu) tutulur; örnek yapılandırma sağlanır.
- Yönetilen PostgreSQL'e geçiş için `DATABASE_URL` yeterlidir; şema aynı kalır.

### 12.3 Ortam değişkenleri

**API:** `NODE_ENV`, `HOST`, `PORT`, `PUBLIC_API_URL`, `DATABASE_URL`, `DATABASE_SSL`, `CORS_ORIGINS`, `SESSION_TTL_DAYS`, `STORAGE_DRIVER` (`local|s3`), `STORAGE_DIR`, `MAX_UPLOAD_MB`, `S3_*`.

**Web:** `API_URL` (sunucu tarafı; tarayıcıya sızmaz).

**Kurallar:** Üretimde `CORS_ORIGINS` yalnızca gerçek alan adı; `DATABASE_SSL=true` yönetilen DB'de; S3 kullanılıyorsa `local` depolama kapatılır.

### 12.4 Yedekleme ve felaket planı

| Senaryo | Müdahale | Hedef |
|---|---|---|
| Container çökmesi | Yeniden başlatma + sağlık kontrolü | < 1 dk |
| DB bozulması | Son `pg_dump` geri yükleme | RPO 24 saat, RTO 2 saat |
| Disk kaybı | Volume snapshot + medya yedeği | RPO 24 saat |
| Bölge kaybı | Yeni VM'de Terraform + yedek | RTO 4 saat |
| Sızıntı şüphesi | Oturumları iptal, secret rotasyonu, log incelemesi | < 30 dk |

---

## 13. Fonksiyonel olmayan gereksinimler

| Alan | Hedef (v1) |
|---|---|
| İlk yükleme (web, 4G) | LCP < 2,5 sn |
| API yanıtı (p95) | < 300 ms (medya hariç) |
| Zaman çizelgesi sayfası | 50 kayıt < 150 ms |
| Kullanılabilirlik | %99,5 aylık |
| Erişilebilirlik | WCAG 2.1 AA hedefi; klavye, kontrast, odak |
| Mobil | Android 8.0+ (API 26), Compose; düşük veri modu v1.1 |
| Kapasite (v1) | 10 bin kullanıcı, 1 milyon medya satırı |
| Veri bütünlüğü | Tüm yazmalar transaction; FK + CHECK |
| Gözlemlenebilirlik | Yapılandırılmış log, sağlık uçları, denetim izi |
| Yerelleştirme | Türkçe; metinler tek yerde, tarih/sayı `tr-TR` |
| Tarayıcı desteği | Son 2 sürüm Chrome/Edge/Firefox/Safari |

---

## 14. Başarı metrikleri

**Aktivasyon**
- Kayıt → ilk varlık oluşturma: **%60**
- İlk varlık → 7 gün içinde ≥3 kayıt: **%40**

**Bağlılık**
- Haftalık aktif kullanıcı / aylık: **> %45**
- Kullanıcı başına aylık kayıt: **≥6**
- Medya yükleyen kullanıcı oranı: **> %70**

**Değer**
- 30 gün sonra hâlâ aktif arşiv: **%50**
- "Arşivden bir şey buldum" anketi: **> %80**

**Sosyal (destekleyici)**
- Keşfet → profil/varlık tıklaması: **> %15**
- Paylaşılan varlık oranı: **> %25**

**Teknik**
- p95 API gecikmesi, hata oranı (<%0,5), yükleme başarısı (>%99), yedek doğrulama başarısı.

---

## 15. Riskler ve önlemler

| Risk | Etki | Önlem |
|---|---|---|
| Arşiv doldurma yükü (kullanıcı kayıt girmeye üşenir) | Yüksek | 2 dokunuşla hızlı kayıt, taslak, hatırlatma, örnek şablonlar |
| Medya maliyeti | Orta | 10 MB limit, S3 yaşam döngüsü, küçük önizlemeler (v1.1) |
| Gizlilik ihlali (yanlış görünürlük) | Yüksek | Varsayılan `private`, görünürlük uyarısı, erişim testleri |
| Sosyal katmanın çekirdeği gölgelemesi | Orta | Keşfet ikincil; ana gezinmede arşiv önce |
| Android parçalanması | Orta | Tek modül, Compose, API 26+, sürüm matrisi |
| Tek sunucu arızası | Orta | Günlük yedek, IaC ile yeniden kurulum, yönetilen DB yolu |
| Kötüye kullanım/spam | Orta | Rate limit, şikâyet, engelleme, moderasyon kuyruğu |
| Kapsam şişmesi | Yüksek | v1 dışı liste bağlayıcı; her özellik metriğe bağlı |
| KVKK uyumsuzluğu | Yüksek | Dışa aktarma/silme, aydınlatma, saklama politikası, hukuk kontrolü |

---

## 16. MVP "bitti" tanımı

- [x] Şema sıfırdan kurulur, seed yüklenir; tüm kısıtlar ve indeksler aktif.
- [x] API uçları kimlik doğrulamalı; hata zarfı tutarlı; tip denetimi ve testler geçer.
- [x] Web'de giriş, panel, varlık oluşturma/detay, kayıt ekleme, arşiv, keşfet, bildirim, profil akışları çalışır.
- [x] Görünürlük ve seçili paylaşım uçtan uca doğrulanır.
- [x] Mobilde aynı akışlar (giriş, liste, detay, kayıt, arşiv) mevcut.
- [x] Üretim compose'u tek komutla ayağa kalkar; sağlık kontrolleri ve yedek betiği vardır.
- [x] Terraform planı gözden geçirilebilir; değişkenler örneklenmiş.
- [x] KVKK dışa aktarma ve silme çalışır.
- [x] README'ler kurulum, demo hesaplar ve bilinen sınırları içerir.

**Demo hesaplar:** `ada@demo.local`, `mert@demo.local`, `selin@demo.local`, `deniz@demo.local` — şifre `Demo1234!` (yalnızca demo verisinde).

---

## 17. Ek: Ekran–uç eşlemesi (web)

| Ekran | Birincil uçlar |
|---|---|
| Giriş | `POST /v1/auth/login`, `POST /v1/auth/register` |
| Panel | `GET /v1/stats`, `GET /v1/assets` |
| Varlıklar | `GET /v1/assets`, `GET /v1/asset-types` |
| Yeni varlık | `GET /v1/asset-types`, `POST /v1/assets`, `POST /v1/media/upload` |
| Varlık detayı | `GET /v1/assets/:id`, `GET /v1/assets/:id/entries`, `GET /v1/assets/:id/measurements`, `POST /v1/assets/:id/entries`, `POST /v1/assets/:id/access` |
| Arşiv | `GET /v1/media`, `GET /v1/stats` |
| Keşfet | `GET /v1/feed?scope=explore`, `GET /v1/assets/discover`, `GET /v1/users/suggestions` |
| Bildirimler | `GET /v1/notifications`, `POST /v1/notifications/read-all` |
| Profil | `GET /v1/users/:username`, `GET /v1/feed?author=` |

Bu eşleme, istemci ile sunucu arasındaki sözleşmenin tek kaynağıdır; yeni ekran eklenirken önce uç ve görünürlük kuralı tanımlanır.
