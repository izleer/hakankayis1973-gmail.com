# izleer — Proje Analizi

> **İnceleme tarihi:** 25 Kasım 2026
> **İncelenen sürüm:** `f948d3b` (`supabase-v2` ve `main` dalları)
> **Kapsam:** `api/`, `web/`, `android/`, `db/`, `infra/`, `docker/`, dağıtım yapılandırmaları
> **Yöntem:** Kaynak kod incelemesi, veritabanı migration taraması, rota envanteri, web/API typecheck, Android `assembleDebug` ve canlı ortam (Render + Supabase) doğrulamaları

---

## İçindekiler

1. [Yönetici özeti](#1-yönetici-özeti)
2. [Ürün tanımı ve kapsam](#2-ürün-tanımı-ve-kapsam)
3. [Sürüm, dal ve çalışma durumu](#3-sürüm-dal-ve-çalışma-durumu)
4. [Mimari](#4-mimari)
5. [Teknoloji yığını](#5-teknoloji-yığını)
6. [Kod tabanı envanteri](#6-kod-tabanı-envanteri)
7. [Veri modeli](#7-veri-modeli)
8. [API envanteri](#8-api-envanteri)
9. [Web uygulaması](#9-web-uygulaması)
10. [Android uygulaması](#10-android-uygulaması)
11. [Plan ve kota sistemi](#11-plan-ve-kota-sistemi)
12. [Reklam altyapısı](#12-reklam-altyapısı)
13. [Çok dillilik](#13-çok-dillilik)
14. [Güvenlik ve gizlilik](#14-güvenlik-ve-gizlilik)
15. [Test ve doğrulama](#15-test-ve-doğrulama)
16. [Performans ve ölçeklenebilirlik](#16-performans-ve-ölçeklenebilirlik)
17. [Teknik borç ve riskler](#17-teknik-borç-ve-riskler)
18. [Yol haritası önerileri](#18-yol-haritası-önerileri)
19. [Sözlük](#19-sözlük)
20. [Ek: komutlar ve ortam değişkenleri](#20-ek-komutlar-ve-ortam-değişkenleri)

---

## 1. Yönetici özeti

**izleer**, "yaşayan ve dönüşen her şeyin izi" fikri üzerine kurulmuş, uçtan uca çalışan bir hafıza/günlük ürünüdür. Bonsai, bitki, evcil hayvan, sanat eseri, koleksiyon veya ev gibi **varlıklar** için profil, zaman çizelgesi, medya arşivi, bakım/ölçüm kayıtları, hatırlatmalar, seçili kişilerle paylaşım, arkadaşlık, topluluk (grup) ve keşfet katmanı sunar.

Ürün bir prototip değil; **Fastify API + PostgreSQL (Supabase) + Next.js web + Kotlin/Compose Android** bileşenleriyle gerçek bir dağıtım hattına sahiptir. Kod tabanı **289 dosya / ~59.300 satır** (ts, tsx, kt, sql) büyüklüğündedir.

### Öne çıkan sayılar

| Gösterge | Değer |
|---|---|
| Toplam commit | 42 (27 Ekim – 24 Kasım 2026) |
| Kod dosyası | 289 |
| Kod satırı | ~59.270 |
| API rota tanımı | 121 |
| Veritabanı tablosu | 28 |
| Enum tipi | 24 |
| Migration | 18 |
| Web sayfası/route | 24 |
| Android ekranı | 18 (bulut) + 13 (yerel mod) |
| Desteklenen dil | 5 (tr, en, de, fr, es) |
| Plan | 3 (Free, Premium, Plus) |
| API birim test dosyası | 7 |

### Güçlü yönler

- **Olgun veri modeli:** 18 migration, 28 tablo, 24 enum; soft delete, sahiplik geçmişi, denetim kaydı (`audit_events`), erişim kuralları ve görünürlük hiyerarşisi birlikte tasarlanmış.
- **Tutarlı güvenlik temelleri:** scrypt parola özeti, SHA-256 ile saklanan opak oturum token'ı, AES-256-GCM ile şifrelenmiş sosyal medya token'ları, HMAC imzalı OAuth `state`, Zod doğrulaması, CORS allowlist, hız sınırlama, denetim günlüğü.
- **Web'de token sızıntısı yok:** httpOnly `vh_token` çerezi + sunucu tarafı BFF (`/api/vh/[...path]`) yaklaşımı doğru kurulmuş; tarayıcı API token'ını hiç görmez.
- **Medya güvenliği:** Yerel `/files/*` yolu HMAC-SHA256 imzalı ve süreli URL'lerle sunulur; imza geçerli olsa bile silinmiş/gizlenmiş içerik DB kontrolüyle kapatılır. Yüklemelerde magic-byte doğrulaması vardır.
- **Uçtan uca çok dillilik:** API `Accept-Language`, web katalogları, Android `values-*` kaynakları ve veritabanındaki varlık türü çevirileri birlikte çalışır.
- **Ticari katman hazır:** Free/Premium/Plus planları, veritabanından yönetilen kotalar, kullanıcı bazlı limit override'ları, yükseltme talep/onay akışı ve Free'ye özel reklam altyapısı (AdSense + AdMob) tamamlanmış.
- **Çevrimdışı mod (Android):** Hesapsız kullanım için SQLite tabanlı yerel mod ve buluta taşıma (migrasyon) akışı bulunur.
- **Dağıtım hattı hazır:** Docker Compose, Caddy TLS/ters vekil, güvenlik başlıkları, yedekleme betikleri ve Render Blueprint (`render.yaml`) mevcut.

### En önemli riskler (özet)

| # | Risk | Etki |
|---|---|---|
| 1 | Otomatik test/CI kapsamı sınırlı (7 test dosyası, CI hattı yok) | Regresyon riski |
| 2 | Render free tier: 15 dk hareketsizlikte uyku, soğuk başlangıç ~1 dk | İlk kullanıcı deneyimi |
| 3 | Dev verisi ve demo hesapların üretimde bulunma ihtimali | Güvenlik/veri hijyeni |
| 4 | Büyük istemci bileşenleri (`AssetDetail.tsx` 2.312 satır) | Bakım maliyeti |
| 5 | Reklam kimlikleri varsayılan olarak Google test ID'leri | Yayın öncesi gelir kaybı |
| 6 | Medya imzalı URL'lerin süresi dolana kadar taşınabilmesi | Sınırlı erişim sızıntısı |

---

## 2. Ürün tanımı ve kapsam

### 2.1 Problem

İnsanlar sahip oldukları anlamlı şeylerin (bitki, hayvan, koleksiyon, eşya, mekân) bakımını, geçmişini ve hikâyesini dağınık biçimde tutar: fotoğraf galerisi, not uygulaması, mesajlar, kağıt belgeler. Bu dağınıklık hem hatırlamayı hem de paylaşmayı zorlaştırır.

### 2.2 Değer önerisi

- Her varlık için **tek bir hafıza**: künye, zaman çizelgesi, fotoğraf/belge arşivi.
- **Bakım ve ölçüm** kayıtlarıyla geçmişe dönük izlenebilirlik.
- **Hatırlatmalar** ile bakımın aksatılmaması.
- **Kontrollü paylaşım**: yalnızca ben → seçili kişiler → arkadaşlar → herkese açık.
- **Topluluk**: aynı ilgi alanındaki kişilerle grup ve ortak varlık yönetimi.
- **Keşfet**: başkalarının hafızalarından ilham.

### 2.3 Varlık (asset) tanımı

Sahibi olunan, zaman içinde değişen ve kayıt tutulmaya değer her şey. Sistemde varlık türleri hiyerarşiktir (`asset_types` + `asset_type_translations`); türler kategori şablonları ve dinamik alan şemaları (`attributes_schema`) taşıyabilir. Özel olarak **`canli-bitki-bonsai`** türü, kayıt eklerken tek birleşik "işlem/tür" menüsü kullanır.

### 2.4 Kapsam içi (v1)

- Kimlik: kayıt, giriş, oturum, profil, avatar, dil, veri indirme, hesap silme
- Varlık: oluşturma, düzenleme, silme, kapak, konum, görünürlük, seçili kişi erişimi
- Kayıtlar: 9 tür (not, fotoğraf, bakım, edinme, ölçüm, sağlık, dönüm noktası, belge, hatırlatma)
- Medya: görsel, video, belge; plana göre adet/boyut kotası
- Hatırlatma: tarih/saat, bildirim ve mobil alarm
- Sosyal: takip, arkadaşlık, gönderi, beğeni, yorum, engelleme, şikâyet
- Topluluk: grup oluşturma, katılım politikası, davet, üyelik isteği, roller, ortak varlık kapsamları
- Keşfet: genel akış, kişi önerileri, arama
- Arşiv ve analiz: yıl bazlı arşiv, istatistikler, karşılaştırma
- Rapor: yazdırılabilir/PDF varlık raporu (Plus)
- Planlar: Free/Premium/Plus, kota ve yetkiler, yükseltme talebi
- Yönetim: kullanıcı/plan yönetimi, limit kuralları, moderasyon kuyruğu
- Reklam: yalnızca Free planda, sayfa ortasında
- Android yerel (hesapsız) mod

### 2.5 Bilinçli olarak kapsam dışı

- Gerçek ödeme entegrasyonu (planlar admin onayı/ataması ile yönetilir)
- Native iOS uygulaması
- E-posta doğrulama / şifre sıfırlama akışı (API'de yok)
- Çok kiracılı kurumsal yapı
- Görsel yeniden kodlama (sharp) — ertelendi
- Otomatik yedekten geri dönüş (restore) otomasyonu

---

## 3. Sürüm, dal ve çalışma durumu

| Alan | Değer |
|---|---|
| Çalışma dalı | `supabase-v2` |
| Üretim dalı | `main` |
| Son commit | `f948d3b` — "Giris ekranlarindan demo hesap bilgisini kaldir" |
| Önceki önemli commit | `5c2a9e5` — sayfa ortası reklam alanları |
| Remote | `github.com/izleer/hakankayis1973-gmail.com` |
| Web | `https://izleer-web.onrender.com` |
| API | `https://izleer-api.onrender.com` |
| Sağlık uçları | `/api/health` (web), `/health` (API) |
| Veritabanı | Supabase PostgreSQL |
| Medya | Supabase Storage (S3 uyumlu) |

### Son dönemde tamamlanan işler

| Konu | Durum |
|---|---|
| Free/Premium/Plus plan sistemi, kotalar, entitlement'lar | Tamamlandı |
| Kullanıcı bazlı limit override'ları ve kural yönetimi | Tamamlandı |
| Yükseltme talebi → admin onayı akışı | Tamamlandı |
| Admin panelde kullanıcı arama + plan değiştirme | Tamamlandı |
| Asset/entry silme (web + Android) | Tamamlandı |
| Bonsai birleşik işlem/tür menüsü | Tamamlandı |
| Free planda sayfa ortası reklam alanları (web + Android) | Tamamlandı |
| Giriş ekranlarından demo hesap bilgisinin kaldırılması | Tamamlandı |
| Android yerel (hesapsız) mod | Tamamlandı (önceki sürüm) |

### Doğrulama durumu (bu inceleme)

| Kontrol | Sonuç |
|---|---|
| `web` typecheck (`tsc --noEmit`) | ✅ Temiz |
| `api` typecheck (`tsc --noEmit`) | ✅ Temiz |
| Android `gradle assembleDebug` | ✅ Başarılı |
| Web commit doğrulaması | ✅ `/api/health` → `f948d3b` |
| Free plan reklam görünürlüğü | ✅ 8 sayfada 1'er alan, sayfa ortasında |
| Premium/Plus reklam gizleme | ✅ 0 alan |
| Admin plan değiştirme (`free→premium→plus→free`) | ✅ Çalışıyor |
| Demo metin temizliği (`/giris`) | ✅ 0 eşleşme |

---

## 4. Mimari

### 4.1 Üst düzey mimari

```
┌────────────────────┐        ┌────────────────────┐
│  Android (Compose) │        │   Web (Next.js)    │
│  - bulut modu      │        │   - RSC + BFF      │
│  - yerel mod       │        │   - httpOnly çerez │
└─────────┬──────────┘        └─────────┬──────────┘
          │ Bearer token                 │ /api/vh/* (BFF)
          │                              │
          └──────────────┬───────────────┘
                         ▼
              ┌────────────────────┐
              │   Fastify API      │  /v1/*
              │  Zod + rate limit  │
              │  görünürlük/plan   │
              └───────┬─────┬──────┘
                      │     │
        ┌─────────────▼─┐ ┌─▼──────────────────┐
        │ PostgreSQL    │ │ Medya deposu       │
        │ (Supabase)    │ │ local | S3         │
        │ 28 tablo      │ │ imzalı /files/*    │
        └───────────────┘ └────────────────────┘
```

### 4.2 Bileşen sorumlulukları

| Bileşen | Sorumluluk |
|---|---|
| `api/` | İş kuralları, yetkilendirme, görünürlük, plan/kota denetimi, medya imzalama, i18n mesajları |
| `web/` | Sunucu bileşenleriyle veri çekme, BFF ile çerez↔token dönüşümü, SSR sayfalar, AdSense |
| `android/` | Compose UI, ViewModel, Repository, yerel SQLite modu, AdMob, cihaz özellikleri (kamera, konum, alarm) |
| `db/` | Idempotent migration'lar, seed, plan kuralları |
| `docker/`, `infra/` | Yerel/üretim dağıtımı, Caddy, yedekleme, Terraform alternatifi |

### 4.3 Web BFF akışı

1. Kullanıcı `/giris` formunu gönderir.
2. Next.js route handler (`/api/session/login`) API'nin `/v1/auth/login` ucunu çağırır.
3. API opak token döner; web bunu **httpOnly, SameSite** `vh_token` çerezine yazar.
4. Sunucu bileşenleri ve tarayıcı istekleri `/api/vh/[...path]` üzerinden gider; BFF çerezi `Authorization: Bearer` başlığına çevirir.
5. Tarayıcı JS'i hiçbir aşamada token'ı görmez.

### 4.4 Medya akışı

1. İstemci `POST /v1/media/upload` (veya S3 için `presign` + `complete`) çağırır.
2. API MIME + magic-byte doğrular, `media` satırı oluşturur (`status='ready'`).
3. İstemciye göreli `/files/<key>?exp=…&sig=…` adresi döner.
4. İstek geldiğinde API imzayı ve **DB görünürlüğünü** doğrular; geçerliyse yerel dosyayı sunar veya S3'e 302 yönlendirir.

### 4.5 Dağıtım topolojisi

- **Render:** `izleer-api` (Docker, health `/health`), `izleer-web` (Docker, health `/api/health`), otomatik deploy.
- **Supabase:** PostgreSQL (transaction pooler 6543, migration için session pooler 5432) + Storage.
- **Alternatif:** `docker-compose.yml` + `Caddyfile` ile kendi sunucusunda TLS'li kurulum; `infra/` altında yedekleme ve Terraform alternatifi.

---

## 5. Teknoloji yığını

| Katman | Teknoloji | Sürüm / not |
|---|---|---|
| API | Node.js + Fastify | Fastify 5, TypeScript |
| Doğrulama | Zod | 3.24 |
| Veritabanı | PostgreSQL | `pg` 8.13, Supabase |
| Depolama | S3 uyumlu / yerel | AWS SDK v3, presigned URL |
| Web | Next.js App Router | 15.5, React 19.1 |
| Stil | Saf CSS | `globals.css`, `plan.css`, `ads.css` |
| Android | Kotlin + Jetpack Compose | BOM 2024.12.01, Navigation 2.8.5 |
| Android min/target | 26 / 35 | `compileSdk 35`, `versionName 1.0.0` |
| Android yerel | SQLite (`SQLiteOpenHelper`) | `data/local` |
| Android görsel | Coil | 2.7.0 |
| Reklam | Google AdSense (web), AdMob (Android) | Free plana özel |
| Dağıtım | Docker, Render, Caddy | `render.yaml`, `docker-compose.yml` |

---

## 6. Kod tabanı envanteri

| Alan | Dosya | Satır |
|---|---:|---:|
| API (`api/src`) | 55 | 11.182 |
| Web sayfaları (`web/app`) | 43 | 13.745 |
| Web bileşenleri (`web/components`) | 40 | 9.800 |
| Web kütüphaneleri (`web/lib`) | 69 | 6.564 |
| Android (`android/.../java`) | 57 | 22.431 |
| Veritabanı (`db/migrations`) | 18 | 929 |
| **Toplam** | **289** | **~59.270** |

### En büyük dosyalar

| Satır | Dosya |
|---:|---|
| 2.312 | `web/components/AssetDetail.tsx` |
| 1.733 | `android/.../ui/VhViewModel.kt` |
| 1.577 | `web/components/GroupDetail.tsx` |
| 1.565 | `android/.../screens/GroupDetailScreen.kt` |
| 1.344 | `android/.../screens/AssetDetailScreen.kt` |
| 1.182 | `android/.../screens/AddEntryScreen.kt` |
| 1.148 | `android/.../screens/NewAssetScreen.kt` |
| 1.110 | `api/src/routes/communities.ts` |
| 1.098 | `android/.../screens/ProfileScreen.kt` |
| 1.046 | `api/src/routes/assets.ts` |

> **Değerlendirme:** API ve web tarafı modüler; Android'de tek ViewModel (`VhViewModel`) ve birkaç büyük ekran dosyası büyümüş durumda. Bölünme eşiği aşılmış olsa da derleme ve okunabilirlik hâlâ yönetilebilir.

---

## 7. Veri modeli

### 7.1 Migration geçmişi

| # | Dosya | İçerik |
|---|---|---|
| 001 | `001_init.sql` | Çekirdek: kullanıcı, varlık, kayıt, medya, gönderi, topluluk, bildirim, rapor |
| 002 | `002_groups.sql` | Grup katılım politikası, üyelik, grup varlığı, davet |
| 003 | `003_social.sql` | Sosyal bağlantı ve paylaşım tabloları |
| 004 | `004_i18n.sql` | Varlık türü çevirileri |
| 005 | `005_supabase_rls.sql` | Supabase RLS politikaları |
| 006 | `006_friendships.sql` | Arkadaşlık ve `friends` görünürlüğü |
| 007 | `007_reminders.sql` | Hatırlatma kayıt türü ve alanları |
| 008 | `008_shared_assets.sql` | Ortak varlık / grup kapsamı |
| 009 | `009_category_templates.sql` | Kategori şablonları ve nitelik şemaları |
| 010 | `010_group_overview.sql` | Grup özet sayaçları |
| 011 | `011_bonsai_type.sql` | Bonsai türü |
| 012 | `012_plans.sql` | `user_plan`, plan başlangıcı |
| 013 | `013_plan_limit_rules.sql` | Kural tablosu ve ilk limitler |
| 014 | `014_plan_storage_enforcement.sql` | Depolama kullanımı denetimi |
| 015 | `015_user_limit_overrides.sql` | Kullanıcı bazlı limit override |
| 016 | `016_plan_plus_enum.sql` | `plus` planının enum'a eklenmesi |
| 017 | `017_plan_requests.sql` | Yükseltme talepleri |
| 018 | `018_plan_plus_limits.sql` | Üç planın kota değerleri |

### 7.2 Tablolar (28)

**Kimlik ve oturum:** `users`, `sessions`, `social_connections`
**Varlık:** `assets`, `asset_types`, `asset_type_translations`, `journal_entries`, `asset_measurements`, `ownerships`, `access_rules`
**Medya:** `media`
**Sosyal:** `posts`, `comments`, `likes`, `follows`, `friendships`, `blocks`, `notifications`
**Topluluk:** `communities`, `memberships`, `group_assets`, `group_invitations`
**Güvenlik/mod:** `reports`, `audit_events`
**Plan:** `plan_limit_rules`, `plan_requests`, `user_limit_overrides`
**Diğer:** `social_shares`

### 7.3 Enum tipleri (24)

`visibility`, `asset_status`, `ownership_status`, `entry_type`, `media_kind`, `media_status`, `content_status`, `post_audience`, `community_role`, `community_visibility`, `community_join_policy`, `membership_status`, `group_asset_scope`, `group_asset_status`, `invitation_status`, `notification_type`, `report_target_type`, `report_status`, `access_resource_type`, `user_role`, `user_plan`, `social_provider`, `social_share_format`, `social_share_status`

### 7.4 Görünürlük modeli

| Değer | Anlam | Kim görür |
|---|---|---|
| `private` | Yalnızca ben | Sahip |
| `selected` | Seçili kişiler | `access_rules` ile erişim verilenler |
| `friends` | Arkadaşlar | Kabul edilmiş arkadaşlar |
| `public` | Herkese açık | Profil ve keşfet akışı |

Kurallar tek yerde toplanmıştır (`canViewAsset`, `canViewEntry`, `postIsVisibleTo`); engelleme tüm görünürlük seviyelerinde geçerlidir. Grup kapsamları: `summary` (özet), `timeline` (zaman çizelgesi), `all` (tam).

### 7.5 Bütünlük ve performans

- Soft delete (`deleted_at`, `status`) ile geri izlenebilirlik.
- Sahiplik geçmişi (`ownerships`) ile devir kaydı.
- `audit_events` ile yönetici işlemleri.
- Yabancı anahtarlar ve CHECK kısıtları; çakışma → 409, kural ihlali → 422.
- Sık sorgular için bileşik indeksler (feed, varlık listesi, üyelik).

---

## 8. API envanteri

### 8.1 Genel yapı

- Taban: `/v1/*`, sağlık: `/health`, kök: `/`
- Kimlik: `Authorization: Bearer <token>`
- Hata gövdesi: `{ error: { code, message, details? } }`
- Hız sınırı: global **300 istek/dakika**; gövde limiti 16 MB
- Yerelleştirme: `Accept-Language` → `req.locale`
- Plan limitleri 60 saniyelik önbellekle tazelenir

### 8.2 Rota grupları

| Prefix | Dosya | Kapsam |
|---|---|---|
| `/v1/auth` | `auth.ts` | Kayıt, giriş, çıkış, oturum |
| `/v1/asset-types` | `asset-types.ts` | Tür ağacı, şablonlar |
| `/v1/assets` | `assets.ts` | Varlık CRUD, erişim, yönetici, ölçüm |
| `/v1` | `entries.ts` | Kayıt CRUD, hatırlatmalar, medya listesi |
| `/v1/media` | `media.ts` | Upload, presign, tamamlama |
| `/v1/feed` | `feed.ts` | Akış, keşfet |
| `/v1` | `posts.ts` | Gönderi, beğeni, yorum |
| `/v1/communities` | `communities.ts` | Grup, üyelik, davet, ortak varlık, akış |
| `/v1` | `users.ts` | Profil, takip, arkadaş, plan, dışa aktarma, silme |
| `/v1/notifications` | `notifications.ts` | Bildirim listesi, okundu |
| `/v1` | `safety.ts` | Engelleme, şikâyet |
| `/v1/admin` | `admin.ts` | Moderasyon, kullanıcı, plan, limit yönetimi |
| `/v1/admin/asset-types` | `admin-asset-types.ts` | Tür yönetimi |
| `/v1/plans` | `plans.ts` | Plan tanımları |
| `/v1/search` | `search.ts` | Kişi/varlık arama |
| `/v1/stats` | `stats.ts` | Özet, arşiv, analiz |
| `/v1/social` | `social.ts` | Sosyal hesap bağlantıları, paylaşım |

### 8.3 Öne çıkan uçlar

**Kimlik**
- `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET /v1/auth/session`

**Varlık**
- `GET/POST /v1/assets`
- `GET/PATCH/DELETE /v1/assets/:id`
- `PUT /v1/assets/:id/manager`
- `GET/POST /v1/assets/:id/access`, `DELETE /v1/assets/:id/access/:userId`
- `GET /v1/assets/:id/measurements`

**Kayıt**
- `GET/POST /v1/assets/:id/entries`
- `GET/PATCH/DELETE /v1/entries/:id`
- `GET /v1/reminders`

**Topluluk**
- `GET/POST /v1/communities`, `GET /v1/communities/discover`
- `GET/PATCH /v1/communities/:slug`, `POST/DELETE /v1/communities/:slug/join`
- `GET /v1/communities/:slug/members`, `PATCH/DELETE /v1/communities/:slug/members/:userId`
- `GET /v1/communities/:slug/requests`, `POST .../requests/:userId/approve`, `DELETE .../requests/:userId`
- `POST /v1/communities/:slug/invitations`, `GET /v1/communities/invitations/mine`
- `GET/POST /v1/communities/:slug/assets`, `GET/PATCH/DELETE .../assets/:assetId`

**Kullanıcı / plan**
- `PATCH /v1/me`, `GET /v1/me/summary`, `GET /v1/me/plan`
- `POST/DELETE /v1/me/plan-request`
- `PATCH /v1/me/plan` → **403** (kullanıcı kendi planını değiştiremez)
- `GET /v1/me/export`, `DELETE /v1/me`
- `GET /v1/me/blocks`

**Yönetim**
- `GET /v1/admin/stats`, `GET /v1/admin/reports`, `PATCH /v1/admin/reports/:id`
- `POST /v1/admin/posts/:id/hide|unhide`
- `GET /v1/admin/users`, `PATCH /v1/admin/users/:id/plan`
- `GET/PATCH /v1/admin/plan-limits`, `GET /v1/admin/plan-limits/history`
- `GET/PATCH/DELETE /v1/admin/users/:id/limit-overrides`
- `GET /v1/admin/plan-requests`, `PATCH /v1/admin/plan-requests/:id`

> Not: `PATCH /v1/admin/users/:id/plan` gövdesi `{"plan":"free|premium|plus"}`; enum parametresi `$2::user_plan` olarak cast edilir (canlıda `42P08` hatası bu şekilde giderildi).

### 8.4 Hız sınırları ve hata yönetimi

- Global 300/dk; aşımda `429 RATE_LIMITED`.
- `ApiError` → yerelleştirilmiş mesaj.
- `ZodError` → `422 VALIDATION_ERROR` + alan detayları.
- PostgreSQL `23505` → `409 CONFLICT`; `23514/23503` → `422 INVALID_DATA`.
- Üretimde 500 mesajı genelleştirilir, ayrıntı log'a yazılır.

---

## 9. Web uygulaması

### 9.1 Sayfalar (24 route)

**Herkese açık:** `/giris`, `/kayit`
**Uygulama içi:**

| Route | İşlev |
|---|---|
| `/` | Panel: özet, anı şeridi, grup özeti, son varlıklar |
| `/varliklar` | Varlık listesi, arama, tür/durum filtresi |
| `/varliklar/yeni` | Yeni varlık |
| `/varliklar/[id]` | Varlık detayı + zaman çizelgesi + kayıt ekleme |
| `/varliklar/[id]/rapor` | Yazdırılabilir varlık raporu |
| `/analiz` | Gelişmiş analiz (Premium+) |
| `/arsiv` | Yıl bazlı arşiv galerisi |
| `/arkadaslar` | Arkadaşlar, istekler, paylaşılanlar, arama |
| `/kesfet` | Akış, kişi önerileri |
| `/gruplar` | Gruplarım + keşfet |
| `/gruplar/yeni` | Yeni grup |
| `/gruplar/[slug]` | Grup detayı: akış, üyeler, istekler, varlıklar |
| `/gruplar/[slug]/varliklar/[assetId]` | Grupta paylaşılan varlık |
| `/rapor`, `/rapor/[id]` | Rapor merkezi (Plus) |
| `/bildirimler` | Bildirimler |
| `/profil`, `/profil/[username]` | Profil, varlıklar, gönderiler |
| `/plan` | Plan, kota, yükseltme |
| `/ayarlar/sosyal` | Sosyal hesap bağlantıları |
| `/menu` | Mobil "daha fazla" menüsü |
| `/yonetim` | Admin paneli |

### 9.2 Bileşenler

`AdSlot`, `AppShell`, `ArchiveGallery`, `AssetCard`, `AssetDetail` (2.312 satır), `AssetReport`, `AuthForm`, `EmptyState`, `FeedCard`, `FollowButton`, `FriendButton`, `GroupCard`, `GroupDetail`, `GroupInvites`, `GroupPostCard`, `HeroReel`, `Icons`, `LocaleSwitcher`, `LogoutButton`, `MediaImage`, `MiniMap`, `NewAssetForm`, `NewGroupForm`, `NotificationsList`, `PlanActions`, `PlanLimitEditor`, `PlanRequestQueue`, `PremiumGate`, `ProfileAvatarEditor`, `ProfileScreen`, `ProfileSocial`, `ReminderAlert`, `ReportActions`, `SideNav`, `SocialSettings`, `SocialShareModal`, `TemplateFieldsEditor`, `UserLimitOverrides`, `ViewerPicker`.

### 9.3 Navigasyon

- Masaüstü: sol sabit menü (`SideNav`) — Hafıza, Varlıklar, Analiz, Arkadaşlar, Rapor, Gruplar, Arşiv, Keşfet, Bildirimler, Bağlantılar.
- Mobil: alt bar — Hafıza, Varlık, Ekle, Gruplar, Daha fazla.
- Analiz ve Rapor için kilit ikonu (ücretsiz planda).

### 9.4 Reklam yerleşimleri (Free)

| Sayfa | Konum |
|---|---|
| `/` | Grup özetinden sonra |
| `/varliklar` | Grid ortasında (ikiye bölünmüş) |
| `/varliklar/yeni` | Formda açıklamadan sonra |
| Varlık detayı | Kayıt formunda not alanından sonra |
| `/gruplar` | Gruplarım ile Keşfet arasında |
| `/gruplar/yeni` | Kategori bölümünden sonra |
| `/kesfet` | Akışın 3. gönderisinden sonra |
| `/profil` | Varlıklar ile gönderiler arasında |
| `/arkadaslar`, grup detayı, ortak varlık | Mevcut yerleşim (Free) |

---

## 10. Android uygulaması

### 10.1 Bulut modu ekranları (18)

`LoginScreen`, `HomeScreen`, `AssetsScreen`, `AssetDetailScreen`, `NewAssetScreen`, `AddEntryScreen`, `GroupsScreen`, `GroupDetailScreen`, `GroupAssetScreen`, `NewGroupScreen`, `ExploreScreen`, `FriendsScreen`, `NotificationsScreen`, `ProfileScreen`, `PlanScreen`, `ArchiveScreen`, `MediaCapture`, `LocationSupport`

### 10.2 Yerel (hesapsız) mod — 13 ekran

`LocalOnboardingScreen`, `LocalHomeScreen`, `LocalAssetsScreen`, `LocalAssetScreen`, `LocalAssetFormScreen`, `LocalEntryFormScreen`, `LocalRemindersScreen`, `LocalSettingsScreen`, `LocalCloudLoginScreen`, `LocalUpgradeScreen`, `LocalNavigator`, `LocalUi`, `LocalViewModel`

- Depolama: SQLite (`LocalStore`), fotoğraflar uygulama özel `local-media` dizininde.
- Limitler: 5 varlık, varlık başına 10 kayıt, kayıt başına 1 medya.
- Buluta taşıma: `LocalMigrator` + `LocalCloudLoginScreen`; isteğe bağlı dışa aktarma (`LocalExporter`).

### 10.3 Navigasyon

`Routes`: `home`, `assets`, `archive`, `explore`, `groups`, `profile`, `friends`, `notifications`, `plan`, `newAsset`, `newGroup`, `asset/{id}`, `group/{slug}?tab={tab}`, `group/{slug}/asset/{assetId}`, `editAsset/{id}`, `addEntry/{assetId}`, `editEntry/{assetId}/{entryId}`

### 10.4 Reklam yerleşimleri (Free, AdMob banner)

| Ekran | Konum |
|---|---|
| Panel | Gruplardan sonra |
| Varlıklar | 3. kartdan sonra |
| Yeni varlık | Açıklamadan sonra |
| Yeni kayıt | Not alanından sonra |
| Gruplar | Gruplarım ile Keşfet arasında |
| Yeni grup | Kategori bölümünden sonra |
| Keşfet | Öneriler ile akış arasında |
| Profil | Arkadaş kartından sonra |

### 10.5 Build

- `gradle assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`
- Varsayılan API: `https://izleer-api.onrender.com/` (`-PAPI_BASE_URL` ile değiştirilebilir)
- AdMob varsayılanları Google test kimlikleridir (`-PadmobAppId`, `-PadmobBannerUnit` ile üretimde değiştirilmeli)

---

## 11. Plan ve kota sistemi

### 11.1 Planlar

| Alan | Free | Premium | Plus |
|---|---:|---:|---:|
| Varlık sayısı | 5 | 50 | 250 |
| Varlık başına kayıt | 10 | 100 | 500 |
| Kayıt başına medya | 1 | 10 | 25 |
| Varlık başına medya | 25 | 500 | 2.000 |
| Depolama | 500 MB | 5 GB | 25 GB |
| Tek dosya boyutu | `MAX_UPLOAD_MB` (10 MB) | aynı | aynı |
| Reklam | Var | Yok | Yok |
| Fotoğraf geçmişi | Temel | Gelişmiş | Gelişmiş |
| Fotoğraf karşılaştırma | Yok | Temel | Gelişmiş |
| Ölçüm grafikleri | Yok | Temel | Gelişmiş |
| Hatırlatmalar | Temel | Gelişmiş | Gelişmiş |
| PDF/rapor | Yok | Yok | Var |
| Toplu dışa aktarma | Yok | Yok | Var |
| Analiz | Temel | Gelişmiş | Tam |
| Bulut erişimi | Sınırlı | Standart | Tam |

### 11.2 Limit kuralları

- Kalıcı kaynak: `plan_limit_rules` (plan × limit anahtarı × kapsam).
- Modlar: `enforce` (engelle), `warn` (uyar), `shadow` (yalnızca izle).
- `warning_pct` ile eşik uyarısı (varsayılan %80).
- Kapsamlar: `all`, `image`, `video`, `document`.
- Önbellek: 60 saniye; DB erişilemezse `DEFAULT_LIMITS` yedeği.
- Kullanıcı bazlı sapmalar: `user_limit_overrides` (admin panelden).

### 11.3 Yükseltme akışı

1. Kullanıcı `/plan` sayfasından talep oluşturur (`POST /v1/me/plan-request`).
2. Talep `plan_requests` tablosuna `pending` olarak düşer.
3. Admin `/yonetim` → plan talepleri kuyruğunda onaylar/reddeder (`PATCH /v1/admin/plan-requests/:id`).
4. Onayda kullanıcı planı güncellenir; reddedilirse not iletilir.
5. Admin ayrıca kullanıcı aramasından doğrudan plan atayabilir (`PATCH /v1/admin/users/:id/plan`).
6. Kullanıcı kendi planını değiştiremez (`PATCH /v1/me/plan` → 403).

### 11.4 Arayüz kapıları

- Web: `showsAds`, `isPremium`, `isPlus`, `reachedAssetLimit`, `reachedEntryLimit`, `mediaLimitFor`.
- Android: `Plans.normalize`, `Plans.isPremium`, `Plans.maxMedia`, `Plans.entryLimitReached`.
- Kesin yetki her zaman API'de; istemci kontrolleri yalnızca deneyim içindir.

---

## 12. Reklam altyapısı

### 12.1 İlke

Reklam **yalnızca Free** planda ve **sayfa içeriğinin ortasında** gösterilir. Premium ve Plus reklamsızdır. Web'de AdSense betiği Free dışında hiç yüklenmez; Android'de banner bileşeni plan kapısının arkasındadır.

### 12.2 Web (AdSense)

- Yapılandırma: `ADSENSE_CLIENT` + `ADSENSE_SLOT_*`.
- Yerleşimler: `home`, `assets`, `assetDetail`, `entry`, `groups`, `friends`, `profile`.
- Ortam değişkeni yoksa **nötr yer tutucu** gösterilir, üçüncü taraf isteği oluşmaz.
- `ads.txt` route'u dinamik üretilir.
- `AdSlot` bileşeni `next/script` ile bir kez yüklenir.

### 12.3 Android (AdMob)

- `BannerAd` bileşeni `BuildConfig.ADMOB_BANNER_UNIT` kullanır.
- Varsayılanlar Google test kimlikleridir:
  - Uygulama: `ca-app-pub-3940256099942544~3347511713`
  - Banner: `ca-app-pub-3940256099942544/6300978111`
- Üretim için derleme parametreleri: `-PadmobAppId`, `-PadmobBannerUnit`.

### 12.4 Uyum notları

- Reklam alanı "REKLAM" etiketiyle işaretlenir.
- Free plan notu 5 dilde "Premium veya Plus ile reklamsız" olarak güncellendi.
- Kişiselleştirilmiş reklam/onay (consent) akışı henüz yok; AB/UK yayını öncesi değerlendirilmeli.

---

## 13. Çok dillilik

| Katman | Uygulama |
|---|---|
| API | `Accept-Language` → `req.locale`; hata mesajları `lib/i18n/{tr,en,de,fr,es}` |
| Web | `lib/i18n/messages/<dil>/*.ts`, sunucu `getT`, istemci `useT` |
| Android | `res/values`, `values-en`, `values-de`, `values-fr`, `values-es` |
| Veritabanı | `asset_type_translations`, `ensureTaxonomy(locale)` |
| Tarih/sayı | `localeTags`, `Intl` tabanlı biçimlendirme |

Kapsanan diller: **Türkçe, İngilizce, Almanca, Fransızca, İspanyolca**. Yeni metin eklerken beş dilin birlikte güncellenmesi gerekir; eksik anahtar Türkçe metne düşer.

---

## 14. Güvenlik ve gizlilik

### 14.1 Olumlu kontroller

- Parola: scrypt + tuz; düz metin saklanmaz.
- Oturum: opak token, DB'de SHA-256 özeti; iptal (`revokeAllSessions`) desteklenir.
- Web: httpOnly çerez + BFF; token tarayıcıya sızmaz.
- CORS: allowlist; kimlik bilgisi destekli.
- Hız sınırı: global 300/dk.
- Girdi doğrulama: her uçta Zod şeması; gövde limiti 16 MB.
- Medya: imzalı+süreli URL, magic-byte doğrulaması, DB görünürlük kontrolü, `X-Content-Type-Options: nosniff`.
- Görünürlük: merkezi `canView*` fonksiyonları; engelleme her seviyede etkili.
- Sosyal token: AES-256-GCM; OAuth `state` HMAC imzalı.
- Denetim: `audit_events` ile yönetici işlemleri.
- KVKK: `GET /v1/me/export` (JSON dışa aktarma), `DELETE /v1/me` (soft delete + oturum iptali).

### 14.2 Açık konular

| Konu | Durum / öneri |
|---|---|
| E-posta doğrulama, şifre sıfırlama | Yok; üretim öncesi eklenmeli |
| Reklam onayı (consent) | Yok; AB yayını öncesi gerekli |
| Görsel yeniden kodlama | Ertelendi (EXIF/gizli veri riski) |
| İmzalı URL taşınabilirliği | Süre dolana kadar paylaşılabilir; süre kısaltılabilir |
| Destek ekibinin özel içeriği görmesi | Moderasyon politikası ile sınırlandırılmalı |
| Demo hesaplar | Üretimde silinmeli veya şifreleri değiştirilmeli |

---

## 15. Test ve doğrulama

### 15.1 Mevcut otomatik testler (`api/tests`)

| Dosya | Kapsam |
|---|---|
| `access.test.ts` | Erişim kuralları |
| `visibility.test.ts` | Görünürlük matrisi |
| `media-security.test.ts` | Medya imza/magic-byte |
| `social.test.ts` | Sosyal akış kuralları |
| `reminders.test.ts` | Hatırlatma hesapları |
| `templates.test.ts` | Şablon alanları |
| `db-config.test.ts` | Veritabanı yapılandırması |

### 15.2 Bu dönemde yapılan doğrulamalar

- `web` ve `api` typecheck temiz.
- Android `assembleDebug` başarılı (APK üretildi).
- Canlı plan değiştirme: `free → premium → plus → free` (enum hatası düzeltildi).
- Canlı reklam kontrolü: Free'de 8 sayfada 1'er alan; Premium/Plus'ta 0.
- Reklam konumu: HTML içinde ~%27–45 (sayfa ortası).
- `/giris` sayfasında demo metni: 0 eşleşme.

### 15.3 Önerilen test piramidi

1. **Birim:** Görünürlük, plan kapıları, medya imzası, i18n anahtar eşitliği.
2. **Entegrasyon:** Fastify + geçici PostgreSQL ile uçtan uca API senaryoları.
3. **E2E (web):** Playwright ile giriş → varlık → kayıt → paylaşım → plan yükseltme.
4. **E2E (Android):** Compose UI testleri + kritik akışlar için emülatör.
5. **CI:** GitHub Actions ile typecheck + test + Android derleme; `main` korumalı dal.

---

## 16. Performans ve ölçeklenebilirlik

### 16.1 Mevcut durum

- Render free tier: 15 dk hareketsizlikte uyku; ilk istek ~1 dk.
- DB bağlantı havuzu: üretimde 5 (Supabase pooler).
- Plan limitleri 60 sn önbellekli; her istekte DB'ye gidilmez.
- Feed ve listeler sayfalı (`limit`, `cursor`/`page`).
- Medya doğrudan S3'ten sunulur (API yalnızca imza doğrular).

### 16.2 Riskler ve öneriler

| Risk | Öneri |
|---|---|
| Soğuk başlangıç | Ücretli instance veya periyodik ping (kullanıcı deneyimi için) |
| Tek API instance | Yatay ölçekleme + paylaşımlı önbellek (Redis) |
| Ağır sorgular (feed/keşfet) | `EXPLAIN` analizi, bileşik indeks, gerekirse materialized view |
| Büyük medya | Yükleme öncesi istemci sıkıştırma, sunucu tarafı yeniden kodlama |
| Arama | `pg_trgm` indeksleri veya harici arama servisi |

---

## 17. Teknik borç ve riskler

### 17.1 Yüksek öncelik

1. **CI ve test kapsamı:** Otomasyon yok; her sürüm manuel doğrulamaya bağlı.
2. **Üretim verisi hijyeni:** Demo kullanıcılar (`@demo.local`) ve seed içerik üretimde bulunmamalı.
3. **Kimlik akışı eksikleri:** E-posta doğrulama ve şifre sıfırlama yok.
4. **Reklam üretim kimlikleri:** AdSense/AdMob gerçek kimlikleri tanımlanmalı; aksi halde gelir yok.

### 17.2 Orta öncelik

5. **Büyük istemci dosyaları:** `AssetDetail.tsx` (2.312), `VhViewModel.kt` (1.733), `GroupDetail.tsx` (1.577) bölünmeli.
6. **Plan yetkilerinin istemci kopyaları:** Web `lib/plan.ts` ve Android `Plans.kt`, API ile elle senkron; ortak şema/üretim önerilir.
7. **Analiz/Rapor kapı tutarsızlığı:** Menüde "Premium" kilidi görünürken rapor fiilen Plus'a özel; metin ve kapı hizalanmalı.
8. **Bildirim altyapısı:** Yalnızca uygulama içi; push/e-posta yok.
9. **Yedekleme doğrulaması:** Restore tatbikatı yok.

### 17.3 Düşük öncelik

10. **Depo hijyeni:** Kök dizinde geçici ekran görüntüleri/loglar (`.tmp-*`, `.device-shots`); `.gitignore` kapsamı doğrulanmalı.
11. **Dokümantasyon dağınıklığı:** `ANALYSIS.md`, `PROJE_ANALIZI.md`, `README.md` ve `docs/` birlikte yaşıyor; tek giriş noktası belirlenmeli.
12. **Test/QA hesapları:** README'de demo hesap tablosu duruyor (arayüzden kaldırıldı).

---

## 18. Yol haritası önerileri

### Kısa vade (0–2 hafta)

- GitHub Actions: `api`/`web` typecheck + test, Android `assembleDebug`.
- Üretim ortamında demo hesapları silme ve seed'i kapatma.
- Gerçek AdSense/AdMob kimliklerinin tanımlanması, `ads.txt` doğrulaması.
- E-posta doğrulama + şifre sıfırlama.
- `/rapor` ve `/analiz` kilitleme metinlerinin planlarla hizalanması.

### Orta vade (1–2 ay)

- Push bildirimleri (FCM) ve e-posta özetleri.
- Görsel yeniden kodlama + EXIF temizliği.
- Feed/arama için indeks ve önbellek iyileştirmeleri.
- Büyük bileşenlerin modülerleştirilmesi, ortak plan şeması üretimi.
- E2E testleri (Playwright + Compose UI).

### Uzun vade (3–6 ay)

- Gerçek ödeme/abonelik entegrasyonu (planların otomatik yönetimi).
- iOS uygulaması veya çok platformlu istemci.
- Kurumsal/ajans özellikleri (çoklu kullanıcı, devir, ekip).
- Gelişmiş analitik ve dışa aktarma (CSV/PDF, plana bağlı).
- Yatay ölçekleme, gözlemlenebilirlik (metrik/izleme/alarm).

---

## 19. Sözlük

| Terim | Anlam |
|---|---|
| Varlık (asset) | Hafızası tutulan nesne (bitki, hayvan, eser, ev…) |
| Kayıt (entry) | Varlığa eklenen zaman damgalı olay/not/ölçüm |
| Görünürlük | `private` / `selected` / `friends` / `public` |
| Kapsam (scope) | Grup varlığında `summary` / `timeline` / `all` |
| Plan | Free / Premium / Plus |
| Kota | Plana bağlı sayısal sınır |
| Entitlement | Plana bağlı özellik yetkisi (rapor, analiz, reklamsızlık…) |
| Override | Kullanıcıya özel limit sapması |
| BFF | Backend-for-Frontend; web'in API vekili |
| RLS | Row Level Security (Supabase) |

---

## 20. Ek: komutlar ve ortam değişkenleri

### 20.1 Geliştirme komutları

```bash
# API
cd api
npm install
npm run dev            # geliştirme sunucusu
npm run typecheck
npm test

# Web
cd web
npm install
npm run dev
npm run typecheck

# Android
cd android
gradle assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk

# Veritabanı (Supabase)
cd api
$env:DOTENV_CONFIG_PATH="./.env.supabase"
npm.cmd run db:migrate
```

### 20.2 API ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Uygulama bağlantısı (pooler) |
| `DATABASE_MIGRATION_URL` | Migration bağlantısı (session pooler) |
| `DATABASE_SSL`, `DATABASE_POOL_MAX` | SSL ve havuz boyutu |
| `PUBLIC_API_URL`, `CORS_ORIGINS` | Genel adres ve izinli kaynaklar |
| `SESSION_TTL_DAYS` | Oturum ömrü (varsayılan 30) |
| `MAX_UPLOAD_MB` | Tek dosya sınırı (varsayılan 10) |
| `STORAGE_DRIVER` | `local` veya `s3` |
| `S3_*` | Bucket, bölge, kimlik bilgileri |
| `MEDIA_SIGNING_SECRET` | Yerel medya imzası (üretimde zorunlu) |
| `RUN_MIGRATIONS` | Açılışta migration çalıştır |

### 20.3 Web ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `API_URL` | Sunucu tarafı API adresi |
| `ADSENSE_CLIENT` | `ca-pub-…` yayıncı kimliği |
| `ADSENSE_SLOT_HOME` | Panel reklam birimi |
| `ADSENSE_SLOT_ASSETS` | Varlık listesi / yeni varlık |
| `ADSENSE_SLOT_ASSET_DETAIL` | Varlık detayı |
| `ADSENSE_SLOT_ENTRY` | Yeni kayıt formu |
| `ADSENSE_SLOT_GROUPS` | Gruplar / yeni grup |
| `ADSENSE_SLOT_FRIENDS` | Arkadaşlar / keşfet |
| `ADSENSE_SLOT_PROFILE` | Profil |

### 20.4 Android derleme parametreleri

| Parametre | Açıklama |
|---|---|
| `-PAPI_BASE_URL` | API taban adresi |
| `-PadmobAppId` | AdMob uygulama kimliği |
| `-PadmobBannerUnit` | AdMob banner birimi |

---

> **Belge bakımı:** Bu doküman `f948d3b` sürümünü yansıtır. Yeni migration, plan kuralı veya ekran eklendiğinde ilgili bölümler güncellenmelidir.
