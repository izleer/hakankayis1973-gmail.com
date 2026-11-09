# izleer — Güncel Proje Analizi

> **İnceleme tarihi:** 6 Kasım 2026  
> **İncelenen sürüm:** `46a0cfc` — “Varlık paylaşımına seçili kişiler ve herkese açık arkadaş varlıkları ekle” + çalışma ağacındaki commit edilmemiş değişiklikler  
> **Kapsam:** `api/`, `web/`, `android/`, `db/`, `infra/`, kök yapılandırma ve dokümantasyon  
> **Not:** Bu dosya, ürünün ilk tasarımını anlatan `ANALYSIS.md` dosyasından farklı olarak **kodun bugünkü gerçek durumunu** ve tespit edilen riskleri ele alır. `ANALYSIS.md` silinmemiş/ezilmemiştir.

> **Güncelleme (9 Kasım 2026):** Bu incelemeden sonra `23653cf` (mobil grup oluşturma + arayüz), `e09f844` (arkadaş kayıtları ve ölçüm görünürlüğü) ve `fa9a24e` (yeni varlık doğrulaması + kontrast) commit’leri eklendi. Aşağıdaki risk tablosu 6 Kasım durumunu yansıtır; güncel durum şöyledir:
>
> - **Kapatıldı:** Ölçüm sızıntısı (risk 1) ve `friends` kayıtlarının zaman çizelgesinde görünmemesi (risk 2). `entryVisibilitySql` ile varlık detayı, kayıt listesi ve ölçüm uç noktası aynı görünürlük kurallarını kullanıyor.
> - **Zaten yapılmış:** Android kayıt ekle’de tarih/saat, yeni varlıkta sabit kaydet çubuğu, yapılandırılmamış sosyal paylaşımın gizlenmesi, web `ink-faint` ve Android `Muted`/`Clay` kontrast düzeltmeleri.
> - **Bu turda eklendi:** Yeni varlık formunda tür/ad/seçili kişi için satır içi doğrulama, ilk hatalı alana kaydırma ve Android `Sage`/`SageInk` kontrastının AA seviyesine çekilmesi.
> - **Açık:** `/files/*` kimlik doğrulaması (risk 3), MIME/magic-byte doğrulaması (risk 4), `/v1/media/:id` erişim modeli (risk 5), test/CI kapsamı (risk 6) ve Android release sertleştirmesi (risk 7). Bunların en önceliklisi `/files/*` erişimidir.

> **Güncelleme (9 Kasım 2026 — P0 güvenilirlik turu):** Üretim öncesi P0 maddeleri kapatıldı:
>
> - **Gizlilik/görünürlük:** Engel kontrolü `canViewAsset` ve `postIsVisibleTo` içinde tüm görünürlüklere (public dahil) yayıldı; engelleme artık arkadaşlığı da kaldırıyor (B6). Arama, `canViewAsset` ile aynı koşullarla friends/selected varlıkları kapsıyor ve engellileri dışlıyor (B7). Erişim kuralları yalnızca `selected` görünürlükte anlam taşıyor; diğer görünürlüklerde eski kurallar temizleniyor ve `POST /v1/assets/:id/access` selected dışında 422 döndürüyor.
> - **Medya erişimi:** Yerel `/files/*` artık HMAC-SHA256 imzalı, süreli URL'lerle sunuluyor; `onRequest` kancasında imza doğrulaması + DB üzerinden iptal (silinmiş varlık/kayıt, gizli gönderi, hazır olmayan medya) kontrolü eklendi (B4). Yüklemelerde magic-byte doğrulaması ve katı base64 çözümü var (B5). `/v1/media/:id` ortak `canViewAsset`/`canViewEntry`/`postIsVisibleTo` fonksiyonlarına bağlandı (B3). Üretimde yerel sürücü için ≥32 karakter `MEDIA_SIGNING_SECRET` zorunlu.
> - **Paylaşım UX:** Web ve Android'de "Kimler görebilir?" kartı görünür kitleyi açıklıyor; kişi ekleme yalnızca `selected` görünürlükte gösteriliyor. Grup `all` kapsamı için uyarı + açık onay (web) eklendi (B8). Tüm yeni metinler tr/en/de/fr/es.
> - **Test:** Görünürlük matrisi ve medya güvenliği için 49 yeni birim testi eklendi (toplam 70, 5 dosya). API ve web typecheck temiz.
> - **Kalan sınırlılıklar:** İmzalı URL'ler süre bitene kadar taşınabilir (bearer tarzı); personel özel içeriği görebilir (moderasyon politikası). Görsel yeniden kodlama (sharp) bilinçli olarak ertelendi. Test/CI kapsamı (risk 6) ve Android release sertleştirmesi (risk 7) hâlâ açık.

---

## 1. Yönetici özeti

**izleer**, “yaşayan ve süreç içinde değişen şeylerin hafızası” fikri etrafında kurulmuş, uçtan uca çalışan bir v1 ürünüdür. Bonsai, bitki, evcil hayvan, tablo, heykel veya ev gibi varlıklar için profil, zaman çizelgesi, medya arşivi, bakım/ölçüm kayıtları, seçili kişilerle paylaşım, arkadaşlık, grup/topluluk ve hafif bir keşfet katmanı sunar.

Proje yalnızca bir prototip değil; **Fastify API + PostgreSQL + Next.js web + Kotlin/Compose Android + Docker/Caddy/Terraform** bileşenleriyle gerçek bir dağıtım hattına sahiptir. Kod tabanı **43 bin satırı aşan** bir büyüklüğe ulaşmıştır ve son commit’lerde arkadaşlık, grup kapsamları, rapor/PDF, harita ve çok dillilik gibi önemli yetenekler eklenmiştir.

### Güçlü yönler

- **Olgun veri modeli:** 6 migration, 25 tablo, 23 enum, 45 index; soft delete, sahiplik geçmişi, denetim kaydı ve görünürlük hiyerarşisi düşünülmüş.
- **Tutarlı güvenlik temelleri:** scrypt parola hash’i, SHA-256 ile saklanan opak oturum token’ı, AES-256-GCM ile şifrelenmiş Meta token’ları, HMAC imzalı OAuth state, Zod doğrulaması, CORS allowlist, hız sınırlama ve denetim günlüğü.
- **Web’de token sızıntısı yok:** httpOnly `vh_token` çerezi + sunucu tarafı BFF (`/api/vh/[...path]`) yaklaşımı doğru kurulmuş.
- **Çok dilli yapı gerçekten uçtan uca:** API `Accept-Language`, web katalogları, Android `values-<dil>` kaynakları ve veritabanındaki varlık türü çevirileri birlikte çalışıyor.
- **Dağıtım hattı hazır:** Docker Compose, Caddy TLS/ters vekil, güvenlik başlıkları, yedekleme betikleri ve Terraform alternatifi mevcut.

### En önemli riskler

| # | Risk | Önem |
|---|---|---|
| 1 | Ölçüm uç noktası, özel kayıtlara bağlı ölçümleri varlığı görebilen herkese açıyor | **Yüksek** |
| 2 | `friends` görünürlüklü kayıtlar varlık detayı ve zaman çizelgesi sorgularında filtrelenmiyor; arkadaşlar bu kayıtları göremiyor | **Orta** |
| 3 | Yerel `/files/*` depolaması kimlik doğrulamasız servis ediliyor; erişim yalnızca tahmin edilemez UUID’ye dayanıyor | **Orta** |
| 4 | Yükleme MIME türüne güveniyor; dosya içeriği (magic byte) doğrulanmıyor | **Orta** |
| 5 | Medya meta uç noktası `friends`/`selected` erişim modelini desteklemiyor | **Orta** |
| 6 | Test kapsamı çok dar: 3 test dosyası / 21 birim testi, entegrasyon veya E2E yok | **Orta** |
| 7 | Android release derlemesi imzasız, küçültme kapalı ve üretim API adresi elle verilmeli | **Orta** |

**Genel değerlendirme:** Ürün fikri, veri modeli ve mimari olgunluk açısından v1 için güçlü; ancak **gizlilik/görünürlük tutarlılığı**, **medya güvenliği** ve **otomatik test/CI** alanlarında üretime çıkmadan önce kapatılması gereken boşluklar var.

---

## 2. İnceleme kapsamı ve yöntem

İnceleme sırasında şunlar yapıldı:

- Tüm dizin yapısı, README, mevcut `ANALYSIS.md`, migration’lar, API rotaları, web sayfaları/bileşenleri, Android ekranları ve altyapı dosyaları okundu.
- `git log` ve `git status` ile mevcut commit ve commit edilmemiş çalışma ayrıştırıldı.
- API ve web için `tsc --noEmit`; API için `vitest` çalıştırıldı.
- Çeviri anahtarı eşitliği ve kod metrikleri betiklerle doğrulandı.

**Doğrulanan durum:**

- API testleri: **3 dosya / 21 test başarılı** (`social.test.ts` 4, `db-config.test.ts` 14, `access.test.ts` 3).
- API `tsc --noEmit`: **başarılı**.
- Web `tsc --noEmit`: **başarılı**.
- Web’de `next build`, Android’de `assembleDebug` bu incelemede yeniden çalıştırılmadı; README’de önceki başarılı sonuçlar kayıtlı.

> **Ortam notu:** Windows PowerShell execution policy nedeniyle `npm.ps1` çalıştırılamıyor; komutlar `cmd /c "npm ..."` biçiminde çalıştırılmalı.

### Commit edilmemiş çalışma

`git status`’a göre özellikle şu alanlarda devam eden bir çalışma var:

- Android: yeni `NewGroupScreen.kt`, `Models.kt`, `VhApi.kt`, `VhRepository.kt`, `VhViewModel.kt`, `GroupsScreen.kt`, `NewAssetScreen.kt`, tema ve grup çevirileri.
- Web: `ViewerPicker.tsx`, `globals.css`, dört dilin `common.ts` kataloğu.
- Depoda izlenmeyen çok sayıda ekran görüntüsü, `android/build-screens/` ve `api/storage-test/` var.

Bu dosyalar analizde “mevcut çalışma ağacı” olarak dikkate alındı; ancak commit edilmedikleri için üretim durumunun parçası sayılmamalıdır.

---

## 3. Ürün tanımı ve temel akışlar

### 3.1 Ürün konumu

izleer, klasik bir envanter veya sosyal medya uygulaması değildir. Üç katmanı birleştirir:

1. **Kişisel hafıza:** Bir varlığın kimliği, türü, konumu, edinme tarihi, sahiplik geçmişi ve zaman çizelgesi.
2. **Paylaşımlı hafıza:** Seçili kişilerle, arkadaşlarla veya herkese açık biçimde paylaşım; grup içinde ortak bağlam.
3. **Keşfet ve topluluk:** Herkese açık varlıklar, gönderiler, beğeni/yorum, takip, bildirim ve moderasyon.

### 3.2 Ana kullanıcı akışları

```text
Kayıt / giriş
   │
   ├─► Varlık oluştur (tür, ad, açıklama, konum, kapak, görünürlük)
   │      └─► Zaman çizelgesine kayıt ekle (not, fotoğraf, bakım, ölçüm, sağlık, belge…)
   │             └─► Medya yükle / ölçüm gir
   │
   ├─► Varlığı paylaş (private / selected / friends / public)
   │      ├─► Seçili kişiye erişim ver
   │      ├─► Arkadaş ekle / istek kabul et
   │      └─► Gruba ekle (summary / timeline / all kapsamı)
   │
   ├─► Keşfet: herkese açık varlıklar, gönderiler, gruplar
   │      └─► Beğen, yorum yap, takip et, şikâyet et, engelle
   │
   ├─► Rapor: varlık raporu görüntüle, yazdır / PDF’e kaydet
   │
   └─► Ayarlar: profil, dil, sosyal bağlantılar, veri dışa aktarma, hesap silme
```

### 3.3 Kullanıcı rolleri

- **user:** Kendi varlıklarını yönetir, paylaşır, sosyal etkileşime girer.
- **moderator:** Şikâyetleri ve gizlenmiş içerikleri yönetir; görünürlük kontrollerinde personel olarak geçer.
- **admin:** Varlık düzenleme dahil daha geniş yetkilere sahiptir; medya ekleme ve varlık düzenlemede `role === 'admin'` kontrolü ayrıca yapılır.

---

## 4. Mimari

### 4.1 Üst düzey mimari

```text
┌─────────────────────┐        ┌──────────────────────┐
│  Web (Next.js 15)   │        │ Android (Compose)    │
│  React 19           │        │ Kotlin 2.0           │
│  httpOnly çerez     │        │ Bearer token         │
│  BFF /api/vh/*      │        │ DataStore            │
└─────────┬───────────┘        └──────────┬───────────┘
          │                               │
          │  sunucu tarafı fetch          │  doğrudan HTTPS
          ▼                               ▼
┌───────────────────────────────────────────────────────┐
│                Fastify 5 API (Node 22)                │
│  /v1/auth  /v1/assets  /v1/entries  /v1/media         │
│  /v1/feed  /v1/posts   /v1/communities  /v1/users     │
│  /v1/social  /v1/admin  /v1/search  /v1/stats         │
│  Zod doğrulama · rate limit · audit · i18n            │
└───────────────┬───────────────────────────┬───────────┘
                │                           │
                ▼                           ▼
     ┌────────────────────┐      ┌──────────────────────┐
     │ PostgreSQL 17/18   │      │ Yerel disk veya S3   │
     │ 25 tablo           │      │ /files/* veya presign│
     └────────────────────┘      └──────────────────────┘

     Caddy: TLS, güvenlik başlıkları, /v1 ve /files ters vekil
```

### 4.2 Bileşenlerin sorumlulukları

| Bileşen | Sorumluluk | Kritik dosyalar |
|---|---|---|
| **API** | Kimlik doğrulama, iş kuralları, görünürlük, veri erişimi, medya, sosyal paylaşım | `api/src/app.ts`, `api/src/routes/*.ts`, `api/src/lib/access.ts` |
| **Web** | SSR sayfalar, BFF proxy, çerez tabanlı oturum, i18n, rapor yazdırma | `web/app/**`, `web/app/api/vh/[...path]/route.ts`, `web/components/**` |
| **Android** | Mobil istemci, kamera/konum, çevrimiçi CRUD, dil seçimi | `android/app/src/main/java/app/varlikhafizasi/**` |
| **DB** | Şema, kısıtlar, index’ler, trigger’lar, RLS kilidi | `db/migrations/001–006` |
| **Altyapı** | Konteynerler, TLS, yedekleme, Terraform | `docker-compose.yml`, `Caddyfile`, `infra/**` |

### 4.3 Web BFF akışı

Web tarayıcısı API’ye doğrudan gitmez:

1. Kullanıcı giriş yapar; API opak bearer token döner.
2. `web/app/api/session/login/route.ts` token’ı **httpOnly**, `SameSite=Lax`, üretimde `Secure` çerez olarak yazar.
3. Tarayıcıdan gelen `/api/vh/...` istekleri `web/app/api/vh/[...path]/route.ts` içinde yakalanır.
4. BFF, çerezdeki token’ı `Authorization: Bearer ...` başlığına çevirir, `Accept-Language` ve gövdeyi iletir.
5. API yanıtı tarayıcıya aktarılır; 401 durumunda çerez temizlenir.

Bu yaklaşım token’ın JavaScript’e görünmemesi açısından doğrudur. BFF yalnızca `GET/POST/PATCH/DELETE` yöntemlerini geçirir; `PUT` ve `OPTIONS` web katmanında kullanılmaz.

### 4.4 Dağıtım topolojisi

`docker-compose.yml` dört ana servis tanımlar:

- `db`: `postgres:17-alpine`, kalıcı `db-data` volume’ü, healthcheck.
- `api`: çok aşamalı Docker imajı, non-root kullanıcı, `media-data` volume’ü, `RUN_MIGRATIONS` desteği.
- `web`: Next.js standalone sunucu, `API_URL=http://api:4000`.
- `caddy`: 80/443, otomatik TLS, `/v1/*` ve `/files/*` için API’ye ters vekil.

Caddy ayrıca HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` ve `Permissions-Policy` başlıklarını ekler.

---

## 5. Teknoloji yığını

| Katman | Teknoloji | Sürüm / not |
|---|---|---|
| API çalışma zamanı | Node.js | `>=22` |
| API çerçevesi | Fastify | `^5.2.0` |
| API dili | TypeScript | `^5.7.2` |
| Doğrulama | Zod | `^3.24.1` |
| Veritabanı | PostgreSQL | 17 (compose), 18’de de doğrulandı |
| DB sürücüsü | `pg` | `^8.13.1` |
| Medya | Yerel disk / S3 uyumlu | `@aws-sdk/client-s3`, presigned PUT |
| Web | Next.js App Router | `^15.5.28` |
| Web UI | React | `19.1.0` |
| Android | Kotlin + Jetpack Compose | Kotlin 2.0, Material 3, Compose BOM 2024.12.01 |
| Android ağ | Retrofit + OkHttp + kotlinx.serialization | Retrofit 2.11, OkHttp 4.12 |
| Android görsel | Coil | 2.7.0 |
| Android depolama | DataStore Preferences | 1.1.1 |
| Altyapı | Docker Compose, Caddy, Terraform | Caddy 2.8, Terraform 1.9.8 |
| Test | Vitest | `^2.1.8` |

**Dikkat çeken nokta:** Web’de `@playwright/test` bağımlılığı var ancak Playwright yapılandırması ve test dosyası yok. Bu, E2E test altyapısının yarım kaldığını gösterir.

---

## 6. Kod tabanı envanteri

### 6.1 Ölçüler

| Alan | Dosya | Satır |
|---|---:|---:|
| `api/` | 48 | 8.423 |
| `web/` | 125 | 16.311 |
| Android Kotlin | 29 | 12.256 |
| Android XML | 60 | 2.984 |
| `db/` | 7 | 988 |
| `infra/` | 13 | 2.195 |
| **Toplam (yaklaşık)** | **282** | **43.157** |

### 6.2 En büyük dosyalar

| Satır | Dosya | Yorum |
|---:|---|---|
| 1.655 | `web/components/AssetDetail.tsx` | Varlık detayı, zaman çizelgesi, paylaşım ve medya yönetimini tek bileşende topluyor |
| 1.511 | `web/components/GroupDetail.tsx` | Grup üyeleri, davetler, varlık kapsamları ve akış |
| 1.097 | `android/.../ui/VhViewModel.kt` | Tüm ekranların durumunu yöneten merkezi ViewModel |
| 996 | `android/.../ui/screens/ProfileScreen.kt` | Profil, dil, sosyal bağlantılar, hesap işlemleri |
| 978 | `api/src/routes/communities.ts` | 22 uç nokta; projenin en yoğun rota dosyası |
| 872 | `api/src/routes/assets.ts` | 11 uç nokta; görünürlük ve paylaşım mantığının merkezi |
| 843 | `android/.../ui/screens/AssetDetailScreen.kt` | Mobil varlık detayı |
| 831 | `android/.../ui/screens/FriendsScreen.kt` | Arkadaş listesi, istekler, arama |
| 797 | `android/.../ui/screens/AddEntryScreen.kt` | Kayıt formu, medya, ölçüm, konum |
| 781 | `android/.../ui/screens/NewAssetScreen.kt` | Varlık oluşturma/düzenleme |

**Değerlendirme:** Özellikle `AssetDetail.tsx`, `GroupDetail.tsx`, `VhViewModel.kt` ve `ProfileScreen.kt` büyüklük açısından sürdürülebilirlik sınırına yaklaşmıştır. Bunların alt bileşenlere ve ayrı ViewModel/state parçalarına bölünmesi önerilir.

---

## 7. Veri modeli

### 7.1 Migration geçmişi

| Migration | İçerik |
|---|---|
| `001_init.sql` | Çekirdek şema: kullanıcı, oturum, varlık türü, topluluk, varlık, sahiplik, erişim kuralı, kayıt, ölçüm, medya, gönderi, beğeni, yorum, takip, üyelik, bildirim, engel, şikâyet, denetim |
| `002_groups.sql` | Grup kategorisi/kuralları/katılım politikası, bekleyen üyelik, `group_assets`, `group_invitations` |
| `003_social.sql` | Meta bağlantıları ve Facebook/Instagram paylaşım kayıtları |
| `004_i18n.sql` | `asset_type_translations` ve dil kısıtı |
| `005_supabase_rls.sql` | Supabase Data API kilidi: RLS, `anon`/`authenticated` yetkilerinin kaldırılması |
| `006_friendships.sql` | `friends` görünürlüğü ve `friendships` tablosu |

### 7.2 Tablolar (25)

**Kimlik ve oturum**
- `users`, `sessions`

**Varlık çekirdeği**
- `asset_types`, `asset_type_translations`
- `assets`, `ownerships`, `access_rules`
- `journal_entries`, `asset_measurements`
- `media`

**Sosyal grafik**
- `follows`, `friendships`, `blocks`

**Topluluk**
- `communities`, `memberships`, `group_assets`, `group_invitations`
- `posts`, `likes`, `comments`

**Bildirim ve moderasyon**
- `notifications`, `reports`, `audit_events`

**Sosyal paylaşım**
- `social_connections`, `social_shares`

### 7.3 Görünürlük modeli

`api/src/lib/access.ts` içinde dört seviyeli bir hiyerarşi tanımlıdır:

```ts
private = 0
selected = 1
friends = 2
public = 3
```

Kurallar:

- **private:** Yalnızca sahibi ve personel.
- **selected:** `access_rules` üzerinden açıkça yetkilendirilmiş kullanıcılar.
- **friends:** Kabul edilmiş arkadaşlığı olan ve engel ilişkisi bulunmayan kullanıcılar.
- **public:** Herkes.

**Kayıt (entry) görünürlüğü varlıktan daha açık olamaz.** `assertVisibilityAllowed` ile bu kural uygulanır. Bir kayıt, varlığın görünürlüğünden daha geniş bir kitleye açılamaz.

`access_rules` tablosu polimorfiktir (`resource_type = 'asset' | 'entry'`); `resource_id` için foreign key yoktur. Bu, esnekliği artırırken sahipsiz kayıt oluşma riskini de beraberinde getirir.

### 7.4 Veri bütünlüğü ve performans

**Olumlu yönler:**

- Soft delete (`deleted_at`) tutarlı biçimde kullanılıyor.
- `assets_location_pair` ve `entries_location_pair` ile enlem/boylam birlikte zorunlu.
- `ownerships_one_active_idx` ile bir varlığın tek aktif sahibi olması garanti.
- `friendships_pair_uidx` ile çift yönlü arkadaşlıkta tekrar engelleniyor.
- `group_invitations_one_pending_idx` ile aynı gruba bekleyen tek davet.
- `title` için trigram GIN index’i, zaman çizelgesi için bileşik index’ler mevcut.
- `touch_updated_at()` trigger’ları ile `updated_at` otomatik güncelleniyor.
- `005_supabase_rls.sql` ile Supabase’in Data API’si tamamen kapatılıyor; uygulama yalnızca kendi API’si üzerinden erişiyor.

**Dikkat edilmesi gerekenler:**

- `media.cover_media_id` ve `assets.cover_media_id` arasında açık bir FK tanımı yok; tutarlılık uygulama katmanına bırakılmış.
- `access_rules.resource_id` polimorfik olduğu için yetim kayıtlar otomatik temizlenmiyor.
- `notifications` mesajları `message_key` + parametre olarak saklanıyor; bu doğru bir tasarım, ancak yeni bildirim türlerinde katalog güncellemesi unutulmamalı.

---

## 8. API envanteri

### 8.1 Genel yapı

- **Toplam uç nokta:** 99
- **Kök:** `/v1`
- **Kimlik doğrulama:** `Authorization: Bearer <opaque-token>`
- **Hata biçimi:** `{ error: { code, message, details? } }`
- **Sayfalama:** cursor tabanlı (`nextCursor`), bazı listelerde offset/limit
- **Dil:** `Accept-Language` başlığı; desteklenen diller `tr, en, de, fr, es`

### 8.2 Rota grupları

| Grup | Prefix | Uç nokta | Kapsam |
|---|---|---:|---|
| Auth | `/v1/auth` | 4 | Kayıt, giriş, oturum, çıkış |
| Asset types | `/v1/asset-types` | 1 | Tür ağacı ve çevirileri |
| Assets | `/v1/assets` | 11 | CRUD, keşfet, paylaşılanlar, erişim yönetimi |
| Entries | `/v1` | 6 | Kayıt CRUD, kayıt medyası, ölçümler |
| Media | `/v1/media` | 5 | Yükleme, presign, tamamlama, listeleme, tek medya |
| Feed | `/v1/feed` | 1 | Ana akış / keşfet akışı |
| Posts | `/v1` | 9 | Gönderi, beğeni, yorum |
| Communities | `/v1/communities` | 22 | Grup, üyelik, davet, grup varlıkları |
| Users | `/v1` | 19 | Profil, takip, arkadaşlık, engel, dışa aktarma, silme |
| Notifications | `/v1/notifications` | 3 | Listeleme, okundu işaretleme |
| Safety | `/v1` | 4 | Engelleme, şikâyet |
| Admin | `/v1/admin` | 6 | İstatistik, şikâyet, gönderi gizleme, kullanıcılar |
| Search | `/v1/search` | 1 | Kullanıcı, varlık, grup, gönderi araması |
| Stats | `/v1/stats` | 1 | Kişisel özet ve son kayıtlar |
| Social | `/v1/social` | 6 | Meta bağlantısı, Facebook/Instagram paylaşımı |

### 8.3 Öne çıkan uç noktalar

**Varlıklar**

```text
GET    /v1/assets                      Kendi varlıkları
GET    /v1/assets/discover             Herkese açık varlıklar
POST   /v1/assets                      Varlık oluştur
GET    /v1/assets/shared               Benimle paylaşılanlar
GET    /v1/assets/:id                  Detay + kayıtlar + erişim bilgisi
GET    /v1/assets/:id/entries          Zaman çizelgesi (cursor)
PATCH  /v1/assets/:id                  Güncelle
DELETE /v1/assets/:id                  Soft delete
GET    /v1/assets/:id/access           Erişim listesi
POST   /v1/assets/:id/access           Seçili kişiye erişim ver
DELETE /v1/assets/:id/access/:userId   Erişimi kaldır
```

**Topluluklar**

```text
GET    /v1/communities
POST   /v1/communities
GET    /v1/communities/:slug
PATCH  /v1/communities/:slug
POST   /v1/communities/:slug/join
DELETE /v1/communities/:slug/join
GET    /v1/communities/:slug/members
GET    /v1/communities/:slug/requests
POST   /v1/communities/:slug/requests/:userId/approve
DELETE /v1/communities/:slug/requests/:userId
POST   /v1/communities/:slug/invitations
GET    /v1/communities/:slug/assets
POST   /v1/communities/:slug/assets
PATCH  /v1/communities/:slug/assets/:assetId
DELETE /v1/communities/:slug/assets/:assetId
GET    /v1/communities/:slug/assets/:assetId
```

**Sosyal**

```text
GET    /v1/social/config
GET    /v1/social/connections
GET    /v1/social/facebook/start
GET    /v1/social/facebook/callback
DELETE /v1/social/connections/:id
POST   /v1/social/share
```

### 8.4 Hız sınırları

| Kapsam | Limit |
|---|---|
| Global | 300 istek / dakika |
| Giriş | 20 / 15 dakika |
| Kayıt | 10 / 15 dakika |
| Sosyal paylaşım | 10 / dakika |

### 8.5 Hata yönetimi

`api/src/app.ts` içindeki merkezi hata yakalayıcı:

- `ApiError` → ilgili HTTP kodu ve yerelleştirilmiş mesaj.
- `ZodError` → `422 VALIDATION_ERROR` + alan bazlı detay.
- PostgreSQL `23505` → `409 CONFLICT`.
- PostgreSQL `23514` / `23503` → `422 INVALID_DATA`.
- `429` → `RATE_LIMITED`.
- Diğerleri → üretimde genel mesaj, geliştirmede gerçek hata.

Bu yapı tutarlı ve üretim için uygundur. Ancak 500 hatalarında `requestId` benzeri bir korelasyon kimliği yanıta eklenmiyor; log ile kullanıcı raporunu eşleştirmek zorlaşır.

---

## 9. Web uygulaması

### 9.1 Sayfalar (21)

**Kimlik doğrulama**

- `/giris`
- `/kayit`

**Uygulama**

- `/` — panel / ana sayfa
- `/varliklar` — varlık listesi
- `/varliklar/yeni` — yeni varlık
- `/varliklar/[id]` — varlık detayı
- `/varliklar/[id]/rapor` — varlık raporu
- `/arsiv` — medya arşivi
- `/kesfet` — keşfet
- `/bildirimler` — bildirimler
- `/arkadaslar` — arkadaşlar
- `/gruplar` — gruplar
- `/gruplar/yeni` — yeni grup
- `/gruplar/[slug]` — grup detayı
- `/gruplar/[slug]/varliklar/[assetId]` — grup bağlamında varlık
- `/profil` — kendi profil
- `/profil/[username]` — başka kullanıcı profili
- `/rapor` — rapor merkezi
- `/rapor/[id]` — rapor detayı
- `/ayarlar/sosyal` — Facebook/Instagram bağlantıları
- `/menu` — mobil menü / kısayollar

### 9.2 Bileşenler

Web’in en kritik bileşenleri:

- `AssetDetail.tsx`: varlık bilgisi, zaman çizelgesi, kayıt formu, medya, paylaşım, erişim listesi.
- `GroupDetail.tsx`: grup üyeleri, davetler, katılım istekleri, grup varlıkları ve kapsam yönetimi.
- `ViewerPicker.tsx`: seçili kişi/arkadaş seçimi.
- `AssetReport.tsx`: rapor düzeni.
- `ReportActions.tsx`: yazdırma / PDF akışı.
- `MapPreview`: konum önizlemesi.

### 9.3 Rapor / PDF akışı

`/varliklar/[id]/rapor` sayfası, varlık bilgilerini ve zaman çizelgesini yazdırılabilir bir düzende gösterir. “PDF indir” işlevi **sunucu taraflı PDF üretmez**; `window.print()` ile tarayıcının “PDF olarak kaydet” özelliğini kullanır.

Bu yaklaşım:

- **Avantaj:** Ek bağımlılık yok, yazdırma stilleriyle tutarlı.
- **Dezavantaj:** Dosya adı, sayfa numarası, tek tıkla indirme ve sunucu taraflı arşivleme garanti değil; tarayıcıya göre çıktı değişebilir.

### 9.4 Web BFF’in güvenlik değerlendirmesi

**Olumlu:**

- Token httpOnly çerezde; JavaScript erişemez.
- `SameSite=Lax` + üretimde `Secure`.
- API URL’si istemciye açılmaz.
- 401’de çerez temizlenir.
- `Accept-Language` ve gövde doğru iletilir.

**Dikkat:**

- BFF, `/v1/` altındaki tüm yolları geçirir; rota bazlı bir allowlist yok. API’nin kendi yetkilendirmesi son savunma hattı olduğu için bu kabul edilebilir, ancak savunma derinliği açısından allowlist düşünülebilir.
- `PUT` desteklenmiyor; API’de `PUT` kullanılmadığı için sorun oluşturmuyor.
- BFF yanıt başlıklarını yalnızca `Content-Type` ile sınırlıyor; `Cache-Control` gibi başlıklar kayboluyor. Hassas veriler için `no-store` davranışı `fetch` tarafında korunuyor.

---

## 10. Android uygulaması

### 10.1 Ekranlar ve yardımcılar (16 dosya)

Android’de 14 gerçek ekran ile 2 yardımcı dosya (`LocationSupport`, `MediaCapture`) bulunuyor:

| Ekran | Görev |
|---|---|
| `LoginScreen` | Giriş / kayıt |
| `HomeScreen` | Panel, özet, son kayıtlar |
| `AssetsScreen` | Varlık listesi |
| `AssetDetailScreen` | Varlık detayı ve zaman çizelgesi |
| `AddEntryScreen` | Kayıt ekleme/düzenleme, medya, ölçüm, konum |
| `NewAssetScreen` | Varlık oluşturma/düzenleme |
| `ArchiveScreen` | Medya arşivi |
| `ExploreScreen` | Keşfet |
| `GroupsScreen` | Gruplar |
| `GroupDetailScreen` | Grup detayı |
| `NewGroupScreen` | Yeni grup (commit edilmemiş) |
| `FriendsScreen` | Arkadaşlar, istekler, arama |
| `NotificationsScreen` | Bildirimler |
| `ProfileScreen` | Profil, dil, sosyal, hesap |
| `LocationSupport` | Konum yardımcıları |
| `MediaCapture` | Kamera / galeri yardımcıları |

### 10.2 Navigasyon

`VhApp.kt` içinde altı sekme:

```text
Ana sayfa · Varlıklar · Arşiv · Gruplar · Keşfet · Profil
```

Detay ekranları stack üzerinden açılır. `navigateTop` ile sekme geçişlerinde durum korunur (`saveState` / `restoreState`).

### 10.3 İzinler ve donanım

`AndroidManifest.xml`:

- `INTERNET`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`
- `FileProvider` (kamera dosyası paylaşımı için)

Kamera, `MediaCapture.kt` içinde `FileProvider` ile geçici URI üretilerek sistem kamera uygulamasına devrediliyor. Bu yaklaşımda `CAMERA` izni zorunlu değildir; `FileProvider` yapılandırması (`res/xml/file_paths.xml`) ve `cacheDir` temizliği periyodik olarak gözden geçirilmelidir.

### 10.4 Android’in mevcut sınırları

- **Belge/video yükleme yok** (README’de de belirtilmiş); web/API üzerinden mümkün.
- **Gönderi yorumları yok**; beğeni var.
- **Push bildirim yok**; bildirimler uygulama açıldığında çekiliyor.
- **Çevrimdışı mod yok**; tüm veri çevrimiçi.
- **Grup varlık kapsamı detayı** mobilde web kadar tam değil.
- **Release imzası ve küçültme yok:** `isMinifyEnabled = false`, `signingConfig` tanımlı değil, üretim `API_BASE_URL` yorum satırında.
- **Sürüm 1.0.0 / versionCode 1:** Mağaza yayını için sürümleme stratejisi netleştirilmeli.

### 10.5 Android güvenlik notları

- Token DataStore’da saklanıyor; Android Keystore ile şifrelenmiş depolama (EncryptedSharedPreferences / DataStore + Keystore) değil. Cihaz root’luysa token okunabilir.
- `network_security_config.xml` incelenmeli; üretimde cleartext trafiğe izin verilmemeli.
- `allowBackup="true"`; oturum token’ının yedeğe dahil olup olmadığı kontrol edilmeli. Mümkünse token backup’tan hariç tutulmalı.

---

## 11. Çok dillilik

### 11.1 Desteklenen diller

`tr` (varsayılan), `en`, `de`, `fr`, `es`.

### 11.2 Katmanlar

| Katman | Mekanizma |
|---|---|
| Web | `web/lib/i18n/messages/<dil>/` katalogları; `vh_locale` çerezi; `?lang=` parametresi; SSR’de `<html lang>` |
| API | `api/src/lib/i18n/<dil>.ts`; `Accept-Language`; `asset_type_translations` tablosu; bildirimlerde `message_key` |
| Android | `res/values-<dil>/strings*.xml`; `AppLanguage`; sistem diline eşleme; isteklerde `Accept-Language` |

### 11.3 Anahtar eşitliği

Yapılan kontrol:

- `en`: **629 anahtar**
- `de`: **628**
- `es`: **628**
- `fr`: **628**
- Eksik anahtar: yalnızca `'Bulunamadı'` (diğer dillerde karşılığı var, `tr` kataloğunda doğal olarak yok).

Bu, çeviri disiplininin yüksek olduğunu gösterir. Yine de yeni özelliklerde (özellikle `NewGroupScreen` ve grup çevirileri) commit edilmemiş çalışma nedeniyle anahtar kayması olabilir; CI’da otomatik anahtar karşılaştırması önerilir.

### 11.4 Çeviri mimarisiyle ilgili not

Web’de Türkçe kaynak metinler doğrudan anahtar olarak kullanılıyor; diğer dillerde karşılıkları var, yoksa İngilizce’ye, o da yoksa Türkçe’ye düşülüyor. Bu pratik bir yaklaşım, ancak:

- Anahtar olarak uzun Türkçe cümleler kullanmak katalog diff’lerini zorlaştırır.
- Metin değişikliği tüm dillerde anahtar kaybına yol açabilir.
- Uzun vadede `asset.create.title` gibi semantik anahtarlara geçiş önerilir.

---

## 12. Güvenlik ve gizlilik analizi

### 12.1 Olumlu kontroller

| Alan | Uygulama | Kanıt |
|---|---|---|
| Parola | scrypt (N/r/p parametreli), sabit zamanlı karşılaştırma | `api/src/lib/password.ts` |
| Oturum token’ı | 32 byte rastgele, DB’de SHA-256 hash | `api/src/lib/session.ts` |
| Meta token’ları | AES-256-GCM, rastgele IV | `api/src/lib/crypto.ts` |
| OAuth state | HMAC-SHA256 + süre + timing-safe karşılaştırma | `api/src/lib/crypto.ts` |
| Girdi doğrulama | Zod şemaları, boyut sınırları | tüm rota dosyaları |
| Hız sınırlama | Global + uç noktaya özel | `api/src/app.ts`, `auth.ts`, `social.ts` |
| CORS | Ortam değişkeninden allowlist | `api/src/app.ts` |
| Denetim | `audit_events` kaydı | `api/src/lib/audit.ts` |
| Soft delete | `deleted_at` ile geri alınabilir silme | migration’lar |
| RLS | Supabase Data API tamamen kilitli | `005_supabase_rls.sql` |
| Web token | httpOnly + SameSite=Lax + Secure (prod) | `web/app/api/session/*` |
| Altyapı | Non-root API konteyneri, Caddy güvenlik başlıkları | `api/Dockerfile`, `Caddyfile` |

### 12.2 Tespit edilen bulgular

#### B1 — Ölçüm uç noktası özel kayıt ölçümlerini sızdırıyor (Yüksek)

**Konum:** `api/src/routes/entries.ts:290–312`

```ts
app.get('/assets/:id/measurements', async (req) => {
  const asset = await getAsset(id);
  const allowed = await canViewAsset(viewer, asset);
  if (!allowed) forbidden();
  const rows = await query(
    `SELECT * FROM asset_measurements WHERE asset_id = $1 ORDER BY measured_at DESC`,
    [id],
  );
  ...
});
```

**Sorun:** `asset_measurements` tablosunda `entry_id` var (`001_init.sql:192`). Bir ölçüm, özel bir kayda bağlı olabilir. Uç nokta yalnızca **varlık** görünürlüğünü kontrol ediyor; kayıt görünürlüğünü kontrol etmiyor. Varlığı görebilen bir kullanıcı, özel kayıtlara ait ölçümleri de görebilir.

**Etki:** Gizlilik ihlali; ölçümler sağlık, fiyat, konum gibi hassas veriler içerebilir.

**Öneri:** Ölçümleri `entry_id` üzerinden `journal_entries` ile birleştirip `canViewEntry()` uygulayın; `entry_id IS NULL` olan varlık düzeyi ölçümler için varlık görünürlüğü yeterli olsun.

#### B2 — `friends` görünürlüklü kayıtlar varlık detayında görünmüyor (Orta)

**Konum:** `api/src/routes/assets.ts:524–542` ve `611–651`

Sorgularda şu koşullar var:

```sql
OR je.visibility = 'public'
OR (je.visibility = 'selected' AND (...))
```

Ancak `je.visibility = 'friends'` koşulu yok. Oysa `canViewEntry()` (`api/src/lib/access.ts:95–97`) arkadaşların bu kayıtları görmesine izin veriyor.

**Etki:** Bir varlık `friends` olarak paylaşıldığında, arkadaş varlığı görebiliyor ama zaman çizelgesindeki `friends` kayıtlarını göremiyor. Doğrudan kayıt uç noktası (`GET /v1/entries/:id`) çalıştığı için tutarsız bir deneyim oluşuyor.

**Öneri:** İki sorguya da `je.visibility = 'friends' AND areFriends(...)` koşulu ekleyin veya görünürlük filtresini tek bir SQL yardımcı fonksiyonunda birleştirin.

#### B3 — Medya meta uç noktası arkadaş/seçili erişimini desteklemiyor (Orta)

> **Durum (9 Kasım P0): Kapatıldı.** `GET /v1/media/:id` artık ortak `canViewAsset`/`canViewEntry`/`postIsVisibleTo` fonksiyonlarıyla görünürlük denetliyor; sahip/personel istisnası korunuyor.

**Konum:** `api/src/routes/media.ts:311–330`

```ts
const visible =
  row.owner_id === viewer.id ||
  viewer.role === 'admin' ||
  (row.asset_visibility === 'public' && row.asset_owner) ||
  (row.post_id && row.post_audience === 'public');
```

`friends` ve `selected` görünürlüklü varlıklara bağlı medya için bu kontrol yetersiz. Varlık detayı üzerinden medya URL’si dönebildiği için dosya erişilebilir, ancak `/v1/media/:id` meta uç noktası 403 verir. Bu, istemci tarafında kırılganlığa yol açar.

**Öneri:** `canViewAsset()` ve `canViewEntry()` üzerinden ortak bir medya görünürlük kontrolü kullanın.

#### B4 — Yerel `/files/*` kimlik doğrulamasız (Orta)

> **Durum (9 Kasım P0): Kapatıldı.** `/files/*` adresleri HMAC-SHA256 imzalı ve süreli (varsayılan 6 saat, pencereye yuvarlanmış önbellek dostu). `app.ts` `onRequest` kancası imzayı doğrular ve DB'den iptal durumunu (silinmiş varlık/kayıt, gizli gönderi, hazır olmayan medya) kontrol eder; `seed/` demo anahtarları imzalıdır ama DB denetiminden muaftır. Yanıt `Cache-Control: private` + `nosniff`. Kalıcı sızıntıya karşı URL süre bitiminde ölür.

**Konum:** `api/src/app.ts:136–145`, `api/src/lib/storage.ts:111–117`

Yerel depolamada medya URL’si `/files/media/YYYY/MM/<uuid>.<ext>` biçiminde döner ve `@fastify/static` ile **oturum kontrolü olmadan** servis edilir. Erişim, UUID’nin tahmin edilemezliğine dayanır.

**Etki:**

- URL’yi ele geçiren herkes (log, tarayıcı geçmişi, paylaşılan ekran görüntüsü, referrer) dosyaya erişebilir.
- Silinen veya görünürlüğü değiştirilen medya, URL biliniyorsa erişilebilir kalır.
- CDN/önbellek katmanı eklenirse erişim kontrolü tümüyle kaybolur.

**Öneri:**

- Kısa vadede: `/files/*` için imzalı URL veya süreli token kullanın.
- Orta vadede: medya erişimini API üzerinden yapın (`/v1/media/:id/content` gibi) ve `canViewAsset`/`canViewEntry` uygulayın.
- S3’e geçişte presigned GET URL’lerinin süresini kısa tutun.

#### B5 — Yükleme MIME türüne güveniyor (Orta)

> **Durum (9 Kasım P0): Kapatıldı (kısmi).** `media-validation.ts` magic-byte doğrulaması (JPEG/PNG/GIF/WEBP/AVIF/MP4/PDF) ve katı base64 çözümü (alfabe + uzunluk + dolgu + boyut ön kontrolü) ekler; hem upload hem complete uçlarında uygulanır. **Ertelendi:** sunucu tarafı görsel yeniden kodlama (sharp) — ayrı bir iş olarak ele alınmalı.

**Konum:** `api/src/routes/media.ts:91–139`, `api/src/lib/storage.ts`

- `assertMime(body.mimeType)` yalnızca istemcinin bildirdiği türe bakar.
- `Buffer.from(base64, 'base64')` geçersiz base64’te hata fırlatmaz; `try/catch` yanıltıcıdır.
- Dosya içeriği (magic byte) doğrulanmaz.
- Görsel yeniden kodlama yapılmaz.

**Etki:** Zararlı içerik, yanlış uzantı/MIME ile depolanabilir; depolama kötüye kullanılabilir. `nosniff` ve sabit `Content-Type` riski azaltır ama ortadan kaldırmaz.

**Öneri:**

- Magic byte doğrulaması (`file-type` benzeri) ekleyin.
- Görselleri sunucu tarafında yeniden kodlayın (sharp).
- Base64 çözümlemesini katı biçimde doğrulayın (regex + uzunluk kontrolü).
- Boyut sınırını yalnızca çözülmüş buffer’a değil, istek gövdesine de uygulayın.

#### B6 — Engel kontrolü tüm erişim yollarında tutarlı değil (Düşük/Orta)

> **Durum (9 Kasım P0): Kapatıldı.** `canViewAsset` engeli tüm görünürlüklerden önce denetler (public dahil); `postIsVisibleTo` public ve grup gönderilerinde engeli uygular. `POST /v1/users/:username/block` artık takiplerin yanında her iki yöndeki arkadaşlığı da kaldırır. Ürün kararı: engel doğrudan erişimi her koşulda kapatır.

**Konum:** `api/src/lib/access.ts:64–81`, `83–103`; `api/src/routes/safety.ts:52–62`

İki ayrı tutarsızlık var:

1. `canViewAsset()` içinde engel kontrolü yalnızca `friends` dalında yapılıyor; `public` varlık için doğrudan `true` dönülüyor. Herkese açık bir varlığın sahibini engelleyen kullanıcı, varlığa ID ile erişebilir. Feed ve arama sorguları engeli dikkate alıyor; doğrudan erişim almıyor.
2. `POST /v1/users/:username/block` takipleri siliyor ancak **arkadaşlığı silmiyor**. `canViewEntry()` içindeki `friends` dalı da engel kontrolü yapmıyor. Bu nedenle engellenen ama arkadaşlığı devam eden bir kullanıcı, public bir varlığın `friends` görünürlüklü kayıtlarını görebilir.

**Öneri:**

- Public dalında da `isBlocked(viewer.id, asset.owner_id)` kontrolü yapın; ürün kararı “public herkese açıktır” ise bunu açıkça dokümante edin.
- Engelleme sırasında arkadaşlık kaydını da kaldırın veya `friendships.status`’u `blocked`/`ended` gibi bir duruma çekin.
- `canViewEntry()` içindeki `friends` dalına `isBlocked()` kontrolü ekleyin.

#### B7 — Arama, arkadaş/seçili varlıkları kapsamıyor (Düşük)

> **Durum (9 Kasım P0): Kapatıldı.** Arama sorgusu `canViewAsset` ile aynı koşulları kullanır: kendi varlığı, seçili + erişim kuralı, friends/public + engel yok + (public veya kabul edilmiş arkadaşlık).

**Konum:** `api/src/routes/search.ts:38–46`

```sql
AND (a.visibility = 'public' OR a.owner_id = $2)
```

`friends` ve `selected` varlıklar aramada çıkmıyor. Bu bir güvenlik açığı değil, keşfedilebilirlik tutarsızlığıdır.

**Öneri:** `canViewAsset` ile aynı görünürlük koşullarını arama sorgusuna ekleyin veya ürün kararı olarak yalnızca public/own aramayı belgeleyin.

#### B8 — Grup `scope='all'` özel kayıtları grup üyelerine açıyor (Tasarım notu)

> **Durum (9 Kasım P0): Kapatıldı (web).** `all` kapsamı seçildiğinde özel kayıtların açılacağı uyarısı + zorunlu onay kutusu gösterilir; mevcut kapsam `all`'a çevrilirken `confirm` istenir. Android'de grup kapsamı kavramı henüz yok; eklenirse aynı onay akışı taşınmalı.

**Konum:** `002_groups.sql:40`, `api/src/routes/communities.ts`, `api/src/routes/feed.ts:48–53`

Bir varlık gruba `all` kapsamıyla eklenirse, grup üyeleri varlığın özel kayıtlarını görebilir. Bu, varlık sahibinin **açık tercihi** olduğu için tasarım hatası değildir; ancak kullanıcıya bu sonuç net anlatılmalı ve `all` seçimi için ek onay istenmelidir.

**Öneri:** `all` kapsamı seçildiğinde “Bu varlığın özel kayıtları grup üyeleriyle paylaşılacak” uyarısı gösterin.

#### B9 — PDF indirme gerçek PDF değil (Düşük)

**Konum:** `web/components/ReportActions.tsx`

`window.print()` kullanılıyor. Sunucu taraflı PDF yok.

**Etki:** Kullanıcı deneyimi ve otomasyon (e-posta, arşiv) sınırlı.

**Öneri:** Kısa vadede yazdırma stillerini iyileştirin; orta vadede Playwright/Puppeteer veya React-PDF ile sunucu taraflı PDF üretin.

#### B10 — Android release sertleştirmesi eksik (Orta)

**Konum:** `android/app/build.gradle.kts:27–37`

- `isMinifyEnabled = false`
- `signingConfig` yok
- Üretim `API_BASE_URL` yorum satırında
- `versionCode = 1`

**Öneri:**

- Release için R8/ProGuard açın.
- Keystore ve imza yapılandırmasını CI’ya bağlayın.
- Üretim URL’sini build flavor veya ortam değişkeniyle yönetin.
- `network_security_config` ile cleartext’i kapatın.
- Token’ı Android Keystore ile koruyun ve yedeklemeden hariç tutun.

#### B11 — Test ve CI boşluğu (Orta)

- Yalnızca 3 test dosyası / 21 test.
- Entegrasyon testi yok; API’nin gerçek PostgreSQL ile uçtan uca testi yok.
- Web ve Android için otomatik test yok.
- GitHub Actions / CI yapılandırması yok.
- ESLint / Prettier yapılandırması yok.

**Etki:** Görünürlük kuralları gibi kritik mantık, yalnızca manuel doğrulamaya ve dar birim testlerine dayanıyor. B1/B2 gibi hataların otomatik yakalanmaması bunun kanıtı.

**Öneri:**

- Görünürlük matrisi için tablo tabanlı birim testleri.
- Testcontainers veya geçici PostgreSQL ile entegrasyon testleri.
- Playwright ile web E2E (giriş, varlık oluşturma, paylaşım, arkadaş erişimi).
- CI’da `typecheck`, `test`, `build`, `lint`.

#### B12 — `access_rules` polimorfik ve FK’sız (Düşük)

**Konum:** `001_init.sql:146–156`

`resource_id` için FK yok. Varlık/kayıt silindiğinde erişim kuralları yetim kalabilir.

**Öneri:** Periyodik temizlik işi veya tetikleyici; ya da ayrı `asset_access_rules` / `entry_access_rules` tabloları.

### 12.3 KVKK / veri yaşam döngüsü

**Olumlu:**

- `GET /v1/users/me/export` ile veri dışa aktarma.
- `DELETE /v1/users/me` ile hesap silme.
- `audit_events` ile kritik işlem kaydı.
- Soft delete ile geri alma imkânı.

**Eksikler:**

- Hesap silmede verinin ne kadarının anonimleştirildiği, ne kadarının fiziksel silindiği dokümante edilmeli.
- Medya dosyalarının silme politikası (DB soft delete sonrası disk/S3 temizliği) net değil.
- Yedeklerdeki kişisel verilerin saklama süresi ve silme prosedürü tanımlı değil.
- Açık rıza / aydınlatma metni ve çerez politikası kodda değil, ürün dokümanında ele alınmalı.

---

## 13. Test ve doğrulama durumu

### 13.1 Mevcut testler

| Dosya | Test sayısı | Kapsam |
|---|---:|---|
| `api/tests/access.test.ts` | 3 | Görünürlük hiyerarşisi ve temel erişim kuralları |
| `api/tests/db-config.test.ts` | 14 | Veritabanı URL/pooler/SSL yapılandırması |
| `api/tests/social.test.ts` | 4 | Meta OAuth state ve sosyal paylaşım mantığı |

### 13.2 Yapılan doğrulamalar

- API `tsc --noEmit`: başarılı.
- Web `tsc --noEmit`: başarılı.
- API `vitest`: 21/21 başarılı.
- Çeviri anahtarı karşılaştırması: yalnızca 1 eksik anahtar.
- Kod metrikleri: yukarıdaki envanter.

### 13.3 Kapsam dışı kalanlar

- Gerçek PostgreSQL ile uçtan uca API testi.
- Web tarayıcı testi (Playwright kurulu ama test yok).
- Android UI testi / instrumentation testi.
- Yük testi (rate limit ve DB bağlantı havuzu davranışı).
- Güvenlik taraması (bağımlılık zafiyetleri, SAST).
- Yedekleme/geri yükleme tatbikatı.

### 13.4 Önerilen test piramidi

```text
        E2E (Playwright, birkaç kritik akış)
       ─────────────────────────────────────
      Entegrasyon (API + PostgreSQL, görünürlük matrisi)
     ───────────────────────────────────────────────
    Birim (access, crypto, password, serializer, i18n)
```

Öncelikli entegrasyon senaryoları:

1. `private` varlık: sahibi görür, başkası göremez.
2. `selected` varlık: erişim verilen görür, verilmeyen göremez.
3. `friends` varlık: arkadaş görür, arkadaş olmayan göremez; engel varsa göremez.
4. `public` varlık: herkes görür; engel davranışı ürün kararına göre doğrulanır.
5. Kayıt görünürlüğü varlıktan daha açık olamaz.
6. Özel kayda bağlı ölçümler, varlığı gören ama kaydı göremeyen kullanıcıya görünmez.
7. Grup `summary` / `timeline` / `all` kapsamları.
8. Medya erişimi: sahip, arkadaş, seçili, public, yabancı.

---

## 14. Teknik borç ve riskler

### 14.1 Yüksek öncelikli

| Alan | Sorun | Etki |
|---|---|---|
| Gizlilik | Ölçüm uç noktası özel kayıt verisini sızdırıyor (B1) | Hassas veri ifşası |
| Görünürlük tutarlılığı | `friends` kayıtlar zaman çizelgesinde yok (B2) | Özellik çalışmıyor gibi görünüyor |
| Medya | `/files/*` kimlik doğrulamasız (B4) | URL sızarsa kalıcı erişim |
| Test | Görünürlük matrisi test edilmiyor (B11) | Regresyon riski yüksek |
| Android | Release imzası/küçültme yok (B10) | Mağaza yayınına hazır değil |

### 14.2 Orta öncelikli

| Alan | Sorun |
|---|---|
| Medya | MIME/magic byte doğrulaması yok (B5) |
| Medya | `/v1/media/:id` arkadaş/seçili desteklemiyor (B3) |
| Web | PDF çıktısı tarayıcıya bağımlı (B9) |
| Kod sağlığı | Dev bileşenler ve ViewModel’ler (1.000+ satır) |
| Altyapı | CI, lint, format yok |
| Dokümantasyon | README’deki “v1” sınırları ile kod arasında kısmi farklar |
| Depo hijyeni | Ekran görüntüleri, `build-screens/`, `storage-test/`, `.env.local` gibi izlenmeyen dosyalar |

### 14.3 Düşük öncelikli

| Alan | Sorun |
|---|---|
| Arama | `friends`/`selected` varlıklar aramada yok (B7) |
| Engel | Public varlıkta engel kontrolü yok (B6) |
| DB | `access_rules` polimorfik, FK yok (B12) |
| i18n | Web’de Türkçe cümleler anahtar; semantik anahtar yok |
| Android | Yorum, belge/video, push, çevrimdışı yok |
| Gözlemlenebilirlik | 500 hatalarında korelasyon kimliği yok |

### 14.4 Depo hijyeni

`git status`’ta görülen izlenmeyen dosyalar:

- Çok sayıda Android ekran görüntüsü (`android/*.png`, `android/build-screens/`).
- `api/storage-test/`.
- `web/.env.local` (`.gitignore` kapsamında olmalı; yine de varlığı doğrulanmalı).

**Öneri:** Ekran görüntülerini `docs/screenshots/` altında bilinçli olarak saklayın veya `.gitignore`’a ekleyin; test çıktılarını depo dışında tutun.

---

## 15. Önceliklendirilmiş öneriler

> **Durum (9 Kasım P0 turu):** Kapatılan maddeler: 1 (B1), 2 (B2), 3 (görünürlük matrisi — 26 birim senaryosu), 4 (imzalı/süreli medya erişimi), 6 (B3), 7 (B5 — magic byte + katı base64; sharp yeniden kodlama ertelendi), 10 (B6/B7). **Açık kalan P0:** 5 (Android release). **Açık P1:** 8 (CI), 9 (lint/format), 11 (depo hijyeni). Aşağıdaki liste 6 Kasım önceliklendirmesini korur; güncel durum için üstteki güncelleme notlarına bakın.

### P0 — Üretim öncesi zorunlu

1. **B1’i düzelt:** Ölçüm uç noktasında kayıt görünürlüğünü uygula.
2. **B2’yi düzelt:** `friends` kayıtlarını varlık detayı ve zaman çizelgesi sorgularına ekle.
3. **Görünürlük entegrasyon testlerini yaz:** En az 8 senaryo (bkz. 13.4).
4. **Medya erişimini gözden geçir:** `/files/*` için imzalı/süreli erişim veya API üzerinden akış.
5. **Android release yapılandırmasını tamamla:** imza, R8, üretim URL’si, cleartext kapatma.

### P1 — Kısa vadede (1–2 sprint)

6. **B3’ü düzelt:** Medya meta görünürlüğünü ortak erişim fonksiyonuna bağla.
7. **B5’i düzelt:** Magic byte doğrulaması + görsel yeniden kodlama + katı base64 kontrolü.
8. **CI kur:** `typecheck`, `test`, `build`, lint; PR’larda zorunlu.
9. **ESLint/Prettier ekle:** Özellikle web ve API için.
10. **B6/B7 için ürün kararı ver:** Public varlıkta engel davranışı ve aramada arkadaş/seçili kapsamı.
11. **Depo hijyenini düzelt:** Ekran görüntüleri ve test çıktıları için `.gitignore`/`docs` düzeni.

### P2 — Orta vadede

12. **Sunucu taraflı PDF** üretimi (Playwright/Puppeteer veya React-PDF).
13. **Android’e yorum, belge/video yükleme, push ve çevrimdışı önbellek** ekle.
14. **Büyük bileşenleri böl:** `AssetDetail`, `GroupDetail`, `VhViewModel`, `ProfileScreen`.
15. **Semantik i18n anahtarlarına geçiş** ve CI’da anahtar eşitliği kontrolü.
16. **Gözlemlenebilirlik:** yapılandırılmış log, request ID, hata izleme (Sentry benzeri).
17. **KVKK dokümantasyonu:** veri saklama, silme, yedek politikası.
18. **Yük testi:** 300 istek/dk sınırı, DB pool ve medya yükleme davranışı.

---

## 16. Yol haritası önerisi

### Faz 1 — Güvenlik ve tutarlılık (2–3 hafta)

- B1, B2, B3, B4, B5 düzeltmeleri.
- Görünürlük entegrasyon testleri.
- CI + lint.
- Android release imzası ve R8.

**Çıkış kriteri:** Görünürlük matrisi testleri yeşil; medya erişimi yetkilendirilmiş; release APK imzalı.

### Faz 2 — Ürün tamamlama (3–4 hafta)

- Android’de belge/video, yorum, push.
- Sunucu taraflı PDF.
- Arama kapsamının genişletilmesi.
- Büyük bileşenlerin refaktörü.

**Çıkış kriteri:** Web ve Android özellik paritesi; PDF tek tıkla indirilebilir.

### Faz 3 — Ölçek ve operasyon (2–3 hafta)

- S3’e geçiş ve CDN.
- Yönetilen PostgreSQL / Supabase üretim provası.
- Yedekleme/geri yükleme tatbikatı.
- Gözlemlenebilirlik ve alarmlar.
- Yük testi ve kapasite planı.

**Çıkış kriteri:** Üretim benzeri ortamda yedekten dönüş ve yük altında kararlılık kanıtlanmış.

---

## 17. Sonuç

izleer, v1 için beklenenin üzerinde bir olgunluğa sahip: veri modeli düşünülmüş, güvenlik temelleri sağlam, web ve Android istemcileri ile API gerçekten çalışıyor ve dağıtım hattı hazır. Özellikle görünürlük hiyerarşisi, arkadaşlık, grup kapsamları ve çok dillilik gibi sonradan eklenen katmanlar, projenin yalnızca bir demo değil, sürdürülebilir bir ürün olma yolunda olduğunu gösteriyor.

Buna karşılık **görünürlük kurallarının tüm okuma yollarında tutarlı uygulanmaması** ve **medya erişiminin URL gizliliğine dayanması**, üretim öncesi mutlaka ele alınmalı. Bu iki alan, ürünün en temel vaadi olan “kontrol bende” hissini doğrudan etkiliyor.

Önerilen sıra nettir: önce **gizlilik ve görünürlük tutarlılığı**, sonra **otomatik test ve CI**, ardından **mobil özellik paritesi** ve **ölçek/operasyon**. Bu sırayla ilerlenirse proje, teknik borcunu büyütmeden üretime taşınabilir.

---

## Ek A — Hızlı referans: kritik dosyalar

| Konu | Dosya |
|---|---|
| API kayıt ve middleware | `api/src/app.ts` |
| Görünürlük kuralları | `api/src/lib/access.ts` |
| Varlık rotaları | `api/src/routes/assets.ts` |
| Kayıt ve ölçüm rotaları | `api/src/routes/entries.ts` |
| Medya rotaları | `api/src/routes/media.ts` |
| Medya depolama | `api/src/lib/storage.ts` |
| Topluluk rotaları | `api/src/routes/communities.ts` |
| Sosyal paylaşım | `api/src/routes/social.ts` |
| Şema | `db/migrations/001–006` |
| Web BFF | `web/app/api/vh/[...path]/route.ts` |
| Web oturum | `web/app/api/session/*` |
| Varlık detayı | `web/components/AssetDetail.tsx` |
| Grup detayı | `web/components/GroupDetail.tsx` |
| Rapor | `web/components/AssetReport.tsx`, `ReportActions.tsx` |
| Android navigasyon | `android/.../ui/navigation/VhApp.kt` |
| Android ViewModel | `android/.../ui/VhViewModel.kt` |
| Android yapılandırma | `android/app/build.gradle.kts` |
| Dağıtım | `docker-compose.yml`, `Caddyfile`, `infra/README.md` |

## Ek B — Doğrulama komutları

```powershell
# API
cd api
cmd /c "npm test"
cmd /c "npm run typecheck"

# Web
cd ..\web
cmd /c "npm run typecheck"
cmd /c "npm run build"

# Android
cd ..\android
gradle assembleDebug
```

> PowerShell execution policy `.ps1` dosyalarını engelliyorsa `cmd /c "npm ..."` kullanın.
