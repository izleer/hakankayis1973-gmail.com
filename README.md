# Varlık Hafızası

Yaşayan ve süreç içinde değişen şeylerin hafızası: bonsai, evcil hayvan, bitki, heykel, tablo, ev… Her varlık için profil, zaman çizelgesi, fotoğraf/belge arşivi, bakım ve ölçüm kayıtları; seçili kişilerle paylaşım ve hafif bir keşfet katmanı.

Bu depo, ürünün **v1** sürümünü uçtan uca içerir: analiz, PostgreSQL şeması ve demo verisi, Fastify API, Next.js web, Kotlin/Jetpack Compose Android ve bulut bağımsız üretim altyapısı.

| Bileşen | Yol | Teknoloji |
| --- | --- | --- |
| Ürün ve teknik analiz | [`ANALYSIS.md`](ANALYSIS.md) | — |
| API | [`api/`](api) | Fastify 5, TypeScript, PostgreSQL 17 |
| Web | [`web/`](web) | Next.js 15 App Router, React 19 |
| Android | [`android/`](android) | Kotlin 2.0, Jetpack Compose, Material 3 |
| Veritabanı | [`db/`](db) | PostgreSQL migration + seed |
| Altyapı | [`docker-compose.yml`](docker-compose.yml), [`infra/`](infra) | Docker Compose, Caddy, Terraform |

## Neler var?

- **Hesap ve oturum:** kayıt, giriş (e-posta veya kullanıcı adı), opak bearer oturum, 30 günlük geçerlilik, çıkış.
- **Varlıklar:** tür ağacı, ad/açıklama, kapak görseli, görünürlük (`private`, `selected`, `public`), arşivleme, sahiplik geçmişi.
- **Zaman çizelgesi:** not, fotoğraf, bakım, edinme, ölçüm, sağlık, olay, belge türlerinde kayıtlar; medya ekleri; ölçüm serileri.
- **Arşiv:** tüm medyayı tür ve arama ile tarama, varlık/kayıt bağlamıyla görüntüleme.
- **Seçili paylaşım:** varlık bazında kullanıcıya erişim verme/kaldırma; görünürlük kuralları (kayıt, varlıktan daha açık olamaz).
- **Keşfet ve sosyal:** herkese açık varlıklar, gönderiler, beğeni, yorum (web/API), takip, bildirimler.
- **Güvenlik ve KVKK:** hız sınırlama, denetim günlüğü, moderasyon, engelleme/şikâyet, veri dışa aktarma ve hesap silme uçları.
- **Medya:** 10 MB'a kadar base64 yükleme; yerel disk veya S3 uyumlu depolama (presign).

## Hızlı başlangıç (yerel)

Gereksinimler: **Node.js 22+**, **PostgreSQL 17+**. Android için ayrıca JDK 17 ve Android SDK 35 (Android Studio ya da komut satırı araçları).

### 1. Veritabanı

```sql
-- psql -U postgres
CREATE ROLE vh_app LOGIN PASSWORD 'guclu-bir-sifre';
CREATE DATABASE varlik_hafizasi OWNER vh_app;
```

### 2. API

```bash
cd api
cp .env.example .env
# .env içinde DATABASE_URL'i kendi kullanıcı/parolanıza göre düzenleyin
npm install
npm run db:migrate
npm run db:seed
npm run dev            # http://localhost:4000
```

Sağlık kontrolü: `curl http://localhost:4000/health`

### 3. Web

```bash
cd web
cp .env.example .env.local     # API_URL=http://127.0.0.1:4000
npm install
npm run dev                    # http://localhost:3000
```

### 4. Android

`android/` klasörünü Android Studio'da açın. Komut satırından derlemek için JDK 17 ve SDK 35 hazır olmalı; `android/local.properties` içine `sdk.dir` yazın ve `cd android && gradle assembleDebug` çalıştırın. Ayrıntılar, emülatör adresi ve APK yolu için [`android/README.md`](android/README.md).

### Demo hesaplar

| E-posta | Şifre | Rol |
| --- | --- | --- |
| `ada@demo.local` | `Demo1234!` | Kullanıcı |
| `mert@demo.local` | `Demo1234!` | Kullanıcı |
| `selin@demo.local` | `Demo1234!` | Moderatör |
| `deniz@demo.local` | `Demo1234!` | Kullanıcı |

Demo verisi yalnızca geliştirme içindir; üretimde hesapları silin veya şifrelerini değiştirin.

## Mimari özeti

```
web (Next.js) ── /api/vh BFF ──► api (Fastify) ──► PostgreSQL 17
android (Compose) ── bearer ───────┘        └──► yerel disk / S3
                      Caddy: TLS, /v1 ve /files ters vekil
```

- Web, tarayıcıya API token'ı sızdırmaz: httpOnly `vh_token` çerezi ve sunucu tarafı BFF kullanır.
- Android, API'ye doğrudan bearer token ile bağlanır; token DataStore'da saklanır.
- API oturumları veritabanında tutulduğu için yatay ölçeklenebilir; medya S3'ye taşınabilir.
- Ayrıntılı veri modeli, uç sözleşmeleri, güvenlik ve NFR'ler: [`ANALYSIS.md`](ANALYSIS.md).

## Üretim

Docker Compose ile tek sunucu:

```bash
cp .env.production.example .env.production
# DOMAIN, ACME_EMAIL, POSTGRES_PASSWORD düzenleyin
docker compose --env-file .env.production up -d --build
```

Terraform (SSH üzerinden Docker sağlayıcısı) alternatifi, DNS/TLS, yedekleme/geri yükleme, S3 geçişi ve güvenlik kontrol listesi: [`infra/README.md`](infra/README.md).

Yedekler:

```bash
./infra/scripts/backup.sh
./infra/scripts/restore.sh db backups/db-....dump.gz
```

## Doğrulama durumu

- API: `tsc --noEmit`, `tsup` derlemesi ve `vitest` (3 test) başarılı; uçtan uca giriş, okuma, yükleme, varlık/kayıt/ölçüm oluşturma ve silme curl ile doğrulandı.
- Web: `tsc --noEmit` ve `next build` (17 rota) başarılı; standalone sunucu `/api/health` ile ayağa kalktı; giriş, panel, varlıklar, arşiv, keşfet, profil, bildirimler ve varlık detayı oturumlu olarak 200 döndü.
- Altyapı: `docker compose config` ve `terraform validate` (Terraform 1.9.8, Docker sağlayıcısı 3.9.0) başarılı; Caddyfile `caddy validate` ile doğrulandı.
- Android: Temurin JDK 17, Android SDK 35 (build-tools 35.0.0) ve Gradle 8.9 ile `assembleDebug` başarılı; debug APK üretildi ve `apksigner`/`aapt` ile imza, paket ve SDK bilgileri doğrulandı. Uygulama emülatör veya fiziksel cihazda çalıştırılmadı.
- Docker motoru bu ortamda bulunmadığından imajlar çalıştırılmadı; TLS ve yedek geri yükleme uçtan uca denenmedi.

## Bilinen sınırlar (v1)

- E-posta doğrulama, parola sıfırlama, push bildirim, çevrimdışı mod, yapay zekâ ve ödeme yok.
- Android'de belge/video yükleme ve gönderi yorumları yok (beğeni var); bunlar web/API üzerinden kullanılabilir.
- Yedekleme betikleri tek sunucu varsayar; yönetilen PostgreSQL kullanılıyorsa sağlayıcının yedeklerini ayrıca açın.
- Ölçekleme için dış yük dengeleyici, S3 ve yönetilen veritabanı gerekir; compose tek sunucu içindir.

## Komut özeti

| Komut | Açıklama |
| --- | --- |
| `cd api && npm run dev` | API geliştirme sunucusu |
| `cd api && npm run db:migrate` / `db:seed` | Şema / demo verisi |
| `cd api && npm test` | API testleri |
| `cd web && npm run dev` | Web geliştirme sunucusu |
| `cd web && npm run build` | Üretim derlemesi |
| `cd android && gradle assembleDebug` | Android debug APK |
| `docker compose --env-file .env.production up -d --build` | Üretim yığını |
| `./infra/scripts/backup.sh` | Yedek al |
| `cd infra/terraform && terraform plan` | Altyapı planı |
