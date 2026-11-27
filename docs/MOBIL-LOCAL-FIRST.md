# İzleer Mobil — Yerel Öncelikli Mimari ve Aktarım Merkezi

> **Sürüm:** 0.1.0 · **Durum:** Aşama 1 + 2 tamamlandı, Aşama 3 planlandı
> **Son güncelleme:** 27 Kasım 2026
>
> **Kaynak notu:** Bu belge, `izleer mobil merkezli tasarım.pdf` analizinin uygulanabilir
> teknik şartnamesidir. PDF'teki tablo ve şema sayfaları (özellikle s. 194–233, 258–269,
> 300–330) metin katmanı olmadan dışa aktarıldığı için boş görünmektedir. Aşağıdaki
> tablolar, PDF'in anlatı metninden ve çalışan kod tabanından **yeniden oluşturulmuştur**;
> yeni özellik eklenirken gözden geçirilmelidir.

---

## 1. Kapsam ve temel ilkeler

İzleer'in mobil sürümü, mevcut web ve Kotlin/Android ürününden **ayrı** bir uygulamadır.
Mobil uygulama ana üründür; cihazdaki SQLite veritabanı tek doğruluk kaynağıdır.

1. **Yerel öncelik:** Varlık, kayıt, ölçüm, hatırlatma, fotoğraf ve rapor işlemleri
   internet olmadan çalışır.
2. **Kullanıcı kontrolü:** Bilgisayara aktarımı kullanıcı başlatır. Aktarım tamamlanmadan
   kaynak dosyalar silinmez.
3. **Veri rehin alınmaz:** Kendi verisini dışa aktarma ve yedekleme her planda ücretsizdir.
   Abonelik bitince veriler silinmez.
4. **Güvenli geri yükleme:** Yedek doğrulanmadan hiçbir veri değiştirilmez; geri yükleme
   öncesinde mevcut arşivin güvenlik yedeği alınır.
5. **Dürüst durum gösterimi:** `SHARED`, dosyanın bilgisayara kaydedildiğini değil, yalnızca
   işletim sistemi paylaşım ekranına teslim edildiğini gösterir.

---

## 2. Uygulama durumu

### 2.1. Çalışan ekranlar

| Ekran | Yol | Durum | Not |
|---|---|---|---|
| Ana ekran | `app/(tabs)/index.tsx` | ✅ | Özet, yaklaşan hatırlatmalar, son kayıtlar, son yedek |
| Varlıklar | `app/(tabs)/assets.tsx` | ✅ | Arama, tür filtresi, aktif/arşiv |
| Varlık ekle | `app/asset/new.tsx` | ✅ | 25 tür, konum, edinme tarihi |
| Varlık detay | `app/asset/[id]/index.tsx` | ✅ | Kapak, galeri, zaman çizelgesi, arşiv/sil |
| Varlık düzenle | `app/asset/[id]/edit.tsx` | ✅ | |
| Varlık fotoğrafları | `app/asset/[id]/photos.tsx` | ✅ | Galeri/kamera, kapak, sil |
| Kayıt ekle/düzenle | `app/asset/[id]/entry.tsx`, `app/entry/[id]/edit.tsx` | ✅ | 9 kayıt türü, ölçüm, hatırlatma, fotoğraf |
| Kayıt detay | `app/entry/[id]/index.tsx` | ✅ | Ölçüm, not, hatırlatma durumu |
| Hatırlatmalar | `app/reminders.tsx` | ✅ | Bekleyen/tamamlanan |
| Aktarım merkezi | `app/(tabs)/transfer.tsx` | ✅ | 4 aktarım türü, son işler |
| Rapor oluştur | `app/transfer/report.tsx` | ✅ | PDF / CSV / XLSX |
| Fotoğraf arşivi | `app/transfer/photos.tsx` | ✅ | Klasörlü ZIP + metadata |
| Tam yedek | `app/transfer/backup.tsx` | ✅ | `.izleer` arşivi |
| Geri yükle | `app/transfer/restore.tsx` | ✅ | Önizleme, doğrulama, birleştirme |
| Aktarım işleri | `app/transfer/jobs.tsx` | ✅ | Filtre, paylaş, kayıt/dosya sil |
| Ayarlar | `app/(tabs)/settings.tsx` | ✅ | Plan, depolama, önbellek, hakkında |

### 2.2. Çalışan servisler

| Servis | Dosya | Görev |
|---|---|---|
| Veri erişimi | `src/db/repo.ts` | Varlık, kayıt, medya, rapor, iş ve meta sorguları |
| Şema | `src/db/schema.ts` | SQLite v1 şeması, 25 tür tohumu, migration |
| Medya | `src/services/media.ts` | Seçim, kopyalama, kapak, silme, data-URI |
| Rapor | `src/services/report.ts` | PDF/CSV/XLSX, fotoğraf bütçesi, iş takibi |
| Fotoğraf arşivi | `src/services/photos.ts` | Klasör yapısı, ZIP, `metadata/` |
| Yedek/geri yükleme | `src/services/backup.ts` | Anlık görüntü, manifest, SHA-256, ATTACH + UPSERT |
| Paylaşım | `src/services/share.ts` | İşletim sistemi paylaşım ekranı |
| Dosya yolları | `src/lib/paths.ts` | `media/`, `exports/`, `izleer-work/` |
| ZIP | `src/lib/zip.ts` | JSZip sarmalayıcı |
| XLSX | `src/lib/xlsx.ts` | Bağımlılıksız minimal OOXML üretici |
| PDF HTML | `src/lib/reporthtml.ts` | Yazdırmaya hazır rapor HTML/CSS |

---

## 3. Teknoloji ve klasör yapısı

| Katman | Teknoloji |
|---|---|
| Çalışma ortamı | Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 |
| Yönlendirme | Expo Router (dosya tabanlı, sekmeler) |
| Veritabanı | `expo-sqlite` (WAL, foreign keys) |
| Dosya sistemi | `expo-file-system` yeni `File` / `Directory` / `Paths` API'si |
| PDF | `expo-print` (HTML → PDF) |
| Paylaşım | `expo-sharing` |
| Seçiciler | `expo-document-picker`, `expo-image-picker` |
| Görsel | `expo-image` |
| ZIP | `jszip` |
| Test | Vitest |

```
mobile/
├── app/                     # Expo Router ekranları
│   ├── (tabs)/              # Ana, Varlıklar, Aktarım, Ayarlar
│   ├── asset/[id]/          # Varlık detay, düzenle, kayıt, fotoğraf
│   ├── entry/[id]/          # Kayıt detay, düzenle
│   └── transfer/            # Rapor, fotoğraf, yedek, geri yükle, işler
├── components/              # Paylaşılan arayüz bileşenleri
├── src/
│   ├── db/                  # schema, bağlantı, repo
│   ├── hooks/               # useAsyncData
│   ├── lib/                 # format, slug, csv, zip, xlsx, reporthtml, paths
│   ├── services/            # media, report, photos, backup, share
│   ├── theme.ts             # Renk, boşluk, tipografi
│   └── types.ts             # Alan tipleri
└── app.json                 # izleer / app.izleer.mobile
```

**Depolama yerleşimi**

| Klasör | Konum | İçerik |
|---|---|---|
| `media/` | Uygulama belgeleri | Orijinal fotoğraflar, `varlik-slug/tarih_baslik/foto_001.jpg` |
| `exports/` | Uygulama belgeleri | Üretilen PDF, CSV, XLSX, ZIP, `.izleer` |
| `izleer-work/` | Uygulama önbelleği | Geçici ZIP parçaları, geri yükleme çalışma alanı |
| `izleer.db` | Uygulama belgeleri | SQLite veritabanı (WAL) |

---

## 4. Yerel SQLite veri modeli

Şema sürümü: **1** (`PRAGMA user_version`). Şema `CREATE TABLE IF NOT EXISTS` ile
kurulur; ileride sürüm artırıldığında migration adımları `SCHEMA_VERSION` ile sıralanır.

### 4.1. `meta`

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| `key` | TEXT | PK | Ayar anahtarı |
| `value` | TEXT | NOT NULL | Değer |

Kullanım: son geri yükleme arşiv kimliği, cihaz tercihleri.

### 4.2. `asset_types`

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| `slug` | TEXT | PK | Kararlı kimlik (`canli-bitki-bonsai`) |
| `name` | TEXT | NOT NULL | Görünen ad |
| `parent_slug` | TEXT | NULL | Üst tür |
| `sort` | INTEGER | NOT NULL, default 0 | Sıralama |

Tohum: 25 tür, 3 seviye. Kökler: Canlılar, Taşınabilir varlıklar, Gayrimenkul,
Koleksiyon ve sanat, Diğer.

### 4.3. `assets`

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `name` | TEXT | NOT NULL | Varlık adı |
| `type_slug` | TEXT | NULL | `asset_types.slug` |
| `description` | TEXT | NULL | Açıklama |
| `location` | TEXT | NULL | Konum |
| `acquired_on` | TEXT | NULL | ISO 8601 edinme tarihi |
| `cover_path` | TEXT | NULL | `media/` göreli kapak yolu |
| `visibility` | TEXT | NOT NULL, default `private` | `private`, `selected`, `friends`, `public` |
| `status` | TEXT | NOT NULL, default `active` | `active`, `archived` |
| `created_at` | TEXT | NOT NULL | ISO 8601 |
| `updated_at` | TEXT | NOT NULL | ISO 8601 |
| `deleted_at` | TEXT | NULL | Yumuşak silme |

İndeksler: `(status, updated_at DESC)`, `(type_slug)`.

### 4.4. `entries`

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `asset_id` | TEXT | NOT NULL, FK → `assets(id)` ON DELETE CASCADE | |
| `type` | TEXT | NOT NULL | 9 tür (aşağıda) |
| `title` | TEXT | NOT NULL | Başlık |
| `note` | TEXT | NULL | Serbest not |
| `occurred_at` | TEXT | NOT NULL | Olay zamanı (ISO 8601) |
| `measurement_value` | REAL | NULL | Ölçüm değeri |
| `measurement_unit` | TEXT | NULL | `cm`, `kg`, `ml`… |
| `reminder_at` | TEXT | NULL | Hatırlatma zamanı |
| `reminder_done` | INTEGER | NOT NULL, default 0 | 0/1 |
| `extra_json` | TEXT | NULL | Gelecekteki türe özel alanlar |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |
| `deleted_at` | TEXT | NULL | Yumuşak silme |

Kayıt türleri: `note`, `photo`, `maintenance`, `acquisition`, `measurement`,
`health`, `event`, `document`, `reminder`.

İndeksler: `(asset_id, occurred_at DESC)`, `(reminder_at, reminder_done)`, `(deleted_at)`.

### 4.5. `media`

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `asset_id` | TEXT | NOT NULL, FK → `assets(id)` ON DELETE CASCADE | |
| `entry_id` | TEXT | NULL | Bağlı kayıt |
| `kind` | TEXT | NOT NULL, default `image` | `image`, `video`, `document` |
| `relative_path` | TEXT | NOT NULL, UNIQUE | `media/` göreli yol |
| `mime` | TEXT | NULL | |
| `bytes` | INTEGER | NOT NULL, default 0 | |
| `width` / `height` | INTEGER | NULL | |
| `created_at` | TEXT | NOT NULL | |
| `deleted_at` | TEXT | NULL | Yumuşak silme |

İndeksler: `(asset_id, created_at DESC)`, `(entry_id)`, `(deleted_at)`.

### 4.6. `export_jobs`

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `export_type` | TEXT | NOT NULL | `report`, `photos`, `backup` |
| `status` | TEXT | NOT NULL | Aşağıdaki durumlar |
| `started_at` | TEXT | NULL | |
| `completed_at` | TEXT | NULL | |
| `file_path` | TEXT | NULL | Üretilen dosyanın URI'si |
| `file_name` | TEXT | NULL | |
| `total_files` | INTEGER | NOT NULL, default 0 | |
| `processed_files` | INTEGER | NOT NULL, default 0 | |
| `total_bytes` | INTEGER | NOT NULL, default 0 | |
| `processed_bytes` | INTEGER | NOT NULL, default 0 | |
| `error_message` | TEXT | NULL | |
| `options_json` | TEXT | NULL | Rapor/fotoğraf seçenekleri |
| `created_at` | TEXT | NOT NULL | |

Durumlar: `PENDING`, `PREPARING`, `PROCESSING`, `READY`, `SHARED`, `FAILED`,
`CANCELLED`.

> `SHARED` yalnızca paylaşım ekranına teslimi gösterir. Hedef cihaza kayıt
> doğrulanamaz; arayüz bu nedenle "bilgisayara kaydedildi" demez.

### 4.7. `export_items`

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| `id` | TEXT | PK | UUID |
| `job_id` | TEXT | NOT NULL, FK → `export_jobs(id)` ON DELETE CASCADE | |
| `kind` | TEXT | NOT NULL | `file`, `photo`, `database`… |
| `source_path` | TEXT | NULL | |
| `target_path` | TEXT | NULL | Arşiv içi yol |
| `status` | TEXT | NOT NULL | |
| `error_message` | TEXT | NULL | |

İndeks: `(job_id)`.

### 4.8. `subscription_cache` (Aşama 3 için hazır)

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| `id` | INTEGER | PK, `CHECK (id = 1)` | Tek satır |
| `plan` | TEXT | NOT NULL, default `free` | `free`, `premium`, `premium_plus` |
| `status` | TEXT | NOT NULL, default `none` | `none`, `active`, `grace`, `expired`, `refunded` |
| `store` | TEXT | NULL | `google`, `apple` |
| `product_id` | TEXT | NULL | Mağaza ürün kimliği |
| `expires_at` | TEXT | NULL | |
| `verified_at` | TEXT | NULL | Son sunucu doğrulaması |
| `offline_grace_days` | INTEGER | NOT NULL, default 7 | Çevrimdışı tolerans |

Bu tablo **cihaza özgüdür** ve yedeğe/geri yüklemeye dahil edilmez.

### 4.9. Geri yüklemede birleştirilen tablolar

Sıra: `asset_types` → `assets` → `entries` → `media`.

| Tablo | Kural |
|---|---|
| `asset_types` | `slug` çakışırsa ad/üst/sıra güncellenir |
| `assets` | `id` (UUID) çakışırsa yalnızca daha yeni `updated_at` kazanır |
| `entries` | `id` çakışırsa yalnızca daha yeni `updated_at` kazanır |
| `media` | `INSERT OR IGNORE`; yerel silme işareti korunur |

`export_jobs`, `export_items`, `subscription_cache` ve `meta` geri yüklenmez;
bunlar cihaza özgüdür.

---

## 5. Aktarım merkezi

### 5.1. Aktarım türleri

| Tür | Çıktı | Biçim | Ücret | Aşama |
|---|---|---|---|---|
| Rapor | Varlık geçmişi, fotoğraf gelişimi, ölçüm, tüm varlıklar | PDF / CSV / XLSX | Ücretsiz | 1–2 ✅ |
| Fotoğraf arşivi | Orijinal fotoğraflar + metadata | ZIP | Ücretsiz | 2 ✅ |
| Tam yedek | Veritabanı + medya + metadata | `.izleer` (ZIP) | Ücretsiz | 2 ✅ |
| Geri yükleme | Başka cihazdan gelen arşiv | `.izleer` | Ücretsiz | 2 ✅ |

İlk sürümde teslim yöntemi **işletim sistemi paylaşım ekranıdır**. QR/Wi-Fi aktarımı
Aşama 5'tedir. Masaüstü uygulaması gerekmez.

### 5.2. Rapor türleri

| Tür | Kapsam | İçerik |
|---|---|---|
| Varlık geçmişi | Tek varlık | Kronolojik kayıtlar, notlar, ölçümler, fotoğraflar |
| Fotoğraf gelişimi | Tek varlık | Tarihli fotoğraf albümü |
| Ölçüm raporu | Seçili varlıklar | Ölçüm tablosu, birimler |
| Tüm varlıklar | Tümü veya seçim | Varlık özetleri + kayıtlar |

PDF'e en fazla **28 fotoğraf** (varlık başına 8, dosya başına 2,5 MB) eklenir.
Tam fotoğraf arşivi için "Fotoğrafları aktar" kullanılır. Rapor tamamen cihazda
üretilir; sunucuya veri gitmez.

### 5.3. Fotoğraf arşivi yapısı

```
izleer-fotograflar-20261127-1430.zip
├── Canlılar/
│   └── Delice-Zeytin/
│       ├── 2026-03-12_Ilk-Kayit/
│       │   └── foto_001.jpg
│       └── 2026-04-20_Budama/
│           └── foto_001.jpg
└── metadata/
    ├── kayitlar.csv
    └── export_info.json
```

Klasör kuralı: **varlık türü / varlık adı / tarih_kayıt başlığı**. Dosya adları
`foto_001.jpg` biçiminde sıralıdır; özgün bilgiler CSV'de korunur.

`metadata/kayitlar.csv` sütunları:

| Sütun | Açıklama |
|---|---|
| Arşiv yolu | ZIP içindeki göreli yol |
| Varlık | Varlık adı |
| Varlık türü | Tür adı |
| Kayıt | Bağlı kayıt başlığı |
| Kayıt türü | `maintenance`, `photo`… |
| Tarih | Kayıt tarihi |
| Kaynak yol | Cihazdaki özgün `media/` yolu |
| Boyut (bayt) | Dosya boyutu |
| Medya kimliği | UUID |
| Varlık kimliği | UUID |

Seçenekler: tüm fotoğraflar veya seçili varlıklar, tarih aralığı, metadata CSV.
Orijinal dosyalar **silinmez veya değiştirilmez**; yalnızca okunur.

### 5.4. İş durumu ve ilerleme

Her aktarım `export_jobs` satırı oluşturur. İlerleme `processed_files/total_files`
veya `processed_bytes/total_bytes` üzerinden yüzde olarak gösterilir. Uygulama
kapanırsa iş `PROCESSING` kalır; kullanıcı yeni iş başlatabilir. Otomatik kaldığı
yerden devam Aşama 5 kapsamındadır; mevcut sürüm güvenli yeniden başlatma sunar.

---

## 6. `.izleer` tam yedek formatı

### 6.1. Arşiv yapısı

```
izleer-yedek-20261127-1430.izleer   (ZIP)
├── manifest.json
├── database.sqlite
├── assets/
│   ├── varlik-slug/
│   │   └── 2026-04-20_Budama/
│   │       └── foto_001.jpg
│   └── ...
└── metadata/
    ├── kategoriler.json
    └── export_info.json
```

### 6.2. `manifest.json`

| Alan | Tip | Açıklama |
|---|---|---|
| `format` | string | `izleer-backup` |
| `formatVersion` | number | 1 |
| `archiveId` | string | UUID; yinelenen yüklemeyi ayırt eder |
| `appVersion` | string | Örn. `0.1.0` |
| `label` | string? | Kullanıcı etiketi |
| `createdAt` | string | ISO 8601 |
| `counts.assets` | number | |
| `counts.entries` | number | |
| `counts.media` | number | |
| `counts.types` | number | |
| `bytes.database` | number | |
| `bytes.media` | number | |
| `bytes.total` | number | |
| `files` | object | Arşiv yolu → `{ bytes, sha256 }` |
| `mediaRoot` | string | `assets` |
| `device.platform` | string | `android`, `ios`, `web` |
| `device.databaseSchema` | number | SQLite şema sürümü |

`metadata/kategoriler.json`: varlık türü ağacının taşınabilir kopyası.
`metadata/export_info.json`: arşiv kimliği, seçenekler ve insan okunur açıklama.

### 6.3. Tutarlı anlık görüntü

Yedek, SQLite dosyasını doğrudan kopyalamaz. `PRAGMA wal_checkpoint` sonrası
`serializeAsync()` ile **tutarlı bir anlık görüntü** alınır; yazma işlemleriyle
çakışma önlenir. Medya dosyaları STORE, JSON ve veritabanı DEFLATE ile sıkıştırılır.

### 6.4. Geri yükleme algoritması

1. Kullanıcı `.izleer` dosyasını seçer (`expo-document-picker`).
2. `manifest.json` okunur; format ve sürüm doğrulanır.
3. `database.sqlite` çıkarılır; SHA-256 manifest ile karşılaştırılır.
4. Geçici veritabanı `useNewConnection` ile açılır; tablo/şema kontrolü yapılır.
5. Manifestteki her `assets/…` dosyası için:
   - yol güvenliği (`..`, mutlak yol) kontrol edilir,
   - SHA-256 doğrulanır,
   - eksik dosya varsa geri yükleme **engellenir**.
6. Önizleme gösterilir: varlık/kayıt/medya sayıları, boyut, eksik dosyalar.
7. Kullanıcı onaylarsa **önce mevcut arşivin güvenlik yedeği** alınır.
8. Tek işlemde (`withTransactionAsync`):
   - kaynak veritabanı `ATTACH` edilir,
   - `asset_types`, `assets`, `entries`, `media` sırayla birleştirilir,
   - `PRAGMA foreign_key_check` çalıştırılır,
   - hata varsa tüm işlem geri alınır.
9. Medya dosyaları `media/` altına kopyalanır; var olan dosya atlanır.
10. `markRestoreCompleted(archiveId, archiveName)` ile meta kaydı yazılır.
11. Geçici dosyalar temizlenir.

### 6.5. Güvenlik kuralları

- Yedekleme **orijinal veriyi değiştirmez veya silmez**.
- Geri yükleme öncesi güvenlik yedeği zorunludur.
- Aynı arşiv iki kez yüklenirse UUID sayesinde **çift kayıt oluşmaz**.
- Bozuk/eksik arşiv geri yüklenmez.
- Yol geçişi (`../../`) ve mutlak yollar reddedilir.
- Ham ödeme bilgisi veya kredi kartı verisi hiçbir zaman saklanmaz.
- **Parola koruması bu sürümde yoktur.** JSZip şifreleme desteklemediği için
  arayüz bunu dürüstçe belirtir; AES parola koruması Aşama 5'tedir.

---

## 7. Abonelik modeli (Aşama 3)

### 7.1. Planlar

| Plan | Yıllık fiyat (örnek) | Temel özellikler |
|---|---|---|
| **Free** | $0 | Sınırsız yerel varlık/kayıt/fotoğraf, temel raporlar, fotoğraf arşivi, tam yedek, geri yükleme |
| **Premium** | $10 | Gelişmiş fotoğraf karşılaştırma, ölçüm/gelişim grafikleri, gelişmiş raporlar, gelişmiş arşiv özellikleri, reklamsız |
| **Premium Plus** | $20 | Premium + ileri analiz, çoklu cihaz/öncelikli özellikler (paket politikasına göre) |

Mağaza bölgesel fiyatlandırması geçerlidir. **Kendi verisini dışa aktarma ve
yedekleme her planda ücretsizdir.** Yerel depolama için "sınırsız" sözü verilmez;
cihaz kapasitesi doğal sınırdır ve uygulama kullanımı gösterir.

### 7.2. Yetki matrisi

| Yetenek | Free | Premium | Plus |
|---|---|---|---|
| Yerel varlık/kayıt/ölçüm/hatırlatma | ✅ | ✅ | ✅ |
| Fotoğraf ekleme ve görüntüleme | ✅ | ✅ | ✅ |
| PDF/CSV/XLSX temel rapor | ✅ | ✅ | ✅ |
| Fotoğraf ZIP arşivi | ✅ | ✅ | ✅ |
| Tam `.izleer` yedek + geri yükleme | ✅ | ✅ | ✅ |
| Gelişmiş fotoğraf karşılaştırma | — | ✅ | ✅ |
| Ölçüm/gelişim grafikleri | — | ✅ | ✅ |
| Gelişmiş rapor şablonları | — | ✅ | ✅ |
| Reklamsız kullanım | — | ✅ | ✅ |
| İleri analiz / çoklu cihaz | — | — | ✅ |

> Not: Bu sürümde reklam yoktur ve satın alma ekranı yoktur. Yukarıdaki tablo
> Aşama 3 için hedef politikadır.

### 7.3. Bulut tabloları (yeniden oluşturuldu)

Kullanıcı verisi buluta taşınmaz; yalnızca hesap ve satın alma doğrulaması tutulur.

**`billing_accounts`**

| Alan | Tip | Kısıt |
|---|---|---|
| `id` | UUID | PK |
| `email` | TEXT | UNIQUE |
| `auth_provider` | TEXT | `supabase`, `apple`, `google` |
| `created_at` | TIMESTAMPTZ | NOT NULL |

**`store_transactions`**

| Alan | Tip | Kısıt |
|---|---|---|
| `id` | UUID | PK |
| `account_id` | UUID | FK → `billing_accounts(id)` |
| `store` | TEXT | `google`, `apple` |
| `product_id` | TEXT | Mağaza ürün kimliği |
| `transaction_ref` | TEXT | UNIQUE; purchase token / originalTransactionId |
| `purchase_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | |
| `status` | TEXT | `pending`, `active`, `grace`, `expired`, `refunded`, `revoked` |
| `verification_result` | TEXT | Ham yanıtın özeti |
| `receipt_hash` | TEXT | Ham makbuzun SHA-256'sı |
| `last_checked_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**`subscription_entitlements`**

| Alan | Tip | Kısıt |
|---|---|---|
| `account_id` | UUID | PK, FK |
| `plan` | TEXT | `free`, `premium`, `premium_plus` |
| `status` | TEXT | `none`, `active`, `grace`, `expired`, `refunded` |
| `source_transaction_id` | UUID | FK |
| `expires_at` | TIMESTAMPTZ | |
| `verified_at` | TIMESTAMPTZ | |
| `offline_grace_days` | INTEGER | default 7 |
| `updated_at` | TIMESTAMPTZ | |

**`store_events`**

| Alan | Tip | Kısıt |
|---|---|---|
| `id` | UUID | PK |
| `store` | TEXT | |
| `event_type` | TEXT | |
| `transaction_ref` | TEXT | |
| `payload_hash` | TEXT | |
| `received_at` | TIMESTAMPTZ | |
| `processed_at` | TIMESTAMPTZ | |
| `result` | TEXT | |

Aynı mağaza işlemi birden fazla İzleer hesabına bağlanamaz; bu kontrol
`transaction_ref` benzersizliği ve hesap ilişkilendirmesiyle yapılır.

### 7.4. API uçları (Aşama 3)

Mevcut Fastify API'ye eklenecek modül. ASP.NET Core'a taşınmayacak.

| Yöntem | Yol | Görev |
|---|---|---|
| `POST` | `/v1/billing/google/verify` | Purchase token'ı Google Play Developer API ile doğrular |
| `POST` | `/v1/billing/apple/verify` | StoreKit imzalı işlemi doğrular |
| `GET` | `/v1/billing/status` | Hesabın güncel plan/yetki durumunu döner |
| `POST` | `/v1/billing/restore` | Mağaza satın alımlarını hesaba geri bağlar |
| `POST` | `/v1/webhooks/google` | Google gerçek zamanlı bildirimleri |
| `POST` | `/v1/webhooks/apple` | App Store Server Notifications V2 |
| `GET` | `/v1/billing/products` | Mağaza ürün kimlikleri ve fiyat meta verisi |

Örnek `POST /v1/billing/google/verify` gövdesi:

```json
{
  "accountId": "uuid",
  "productId": "izleer_premium_yearly",
  "purchaseToken": "…",
  "packageName": "app.izleer.mobile"
}
```

Yanıt:

```json
{
  "plan": "premium",
  "status": "active",
  "expiresAt": "2027-11-27T00:00:00Z",
  "verifiedAt": "2026-11-27T12:00:00Z",
  "offlineGraceDays": 7
}
```

### 7.5. Satın alma akışı

1. Kullanıcı Premium'a dokunur.
2. Google Play / App Store ödeme ekranı açılır.
3. Mağaza işlemi tamamlanır; uygulama **hemen Premium açmaz**.
4. Uygulama purchase token / imzalı işlemi API'ye gönderir.
5. API mağaza sunucusuyla doğrular; bekleyen ödeme yetki vermez.
6. API `subscription_entitlements` kaydını günceller.
7. Uygulama yanıtı `subscription_cache` tablosuna yazar.
8. Premium özellikleri açılır.

"Satın alımlarımı geri yükle" ve "Abonelik durumumu kontrol et" aynı uçları
kullanır. Kullanıcı hesabı cihaz kimliğine değil, İzleer hesabına bağlanır;
telefon değişikliği aboneliği kaybettirmez.

### 7.6. Çevrimdışı yetki politikası

- Daha önce doğrulanmış Premium, internet kesildi diye hemen kapanmaz.
- Önbellek `verified_at + offline_grace_days` (varsayılan 7 gün) içinde geçerlidir.
- Abonelik süresi dolmuşsa yetki kaldırılır.
- Uzun süre doğrulama alınamazsa kullanıcıya bağlantı uyarısı gösterilir.
- **Yerel veriler hiçbir zaman abonelik nedeniyle silinmez.** Temel görüntüleme
  ve dışa aktarma erişimi korunur.
- İade/iptal durumları durum tabanlı yönetilir; tek `isPremium` bayrağı kullanılmaz.

### 7.7. Durum geçişleri

```
none → pending → active → grace → expired
                  │        │
                  │        └── yenileme → active
                  ├── refunded
                  └── revoked
```

`pending` durumu Premium yetkisi vermez. `grace` döneminde mağaza politikasına
göre sınırlı erişim verilebilir; veri erişimi her durumda açıktır.

---

## 8. Fonksiyonel gereksinimler

Öncelikler: **P1** ilk sürüm, **P2** sonraki geliştirme, **P3** ileri aşama.
PDF'in gereksinim tablosu boş geldiği için bu tablo anlatıdan yeniden üretilmiştir.

| ID | Gereksinim | Öncelik | Durum |
|---|---|---|---|
| FR-01 | Varlık oluşturma, düzenleme, arşivleme, yumuşak silme | P1 | ✅ |
| FR-02 | 9 türde zaman çizelgesi kaydı | P1 | ✅ |
| FR-03 | Ölçüm değeri/birimi ve hatırlatma | P1 | ✅ |
| FR-04 | Galeri/kameradan fotoğraf; orijinali koruma | P1 | ✅ |
| FR-05 | SQLite şeması ve migration | P1 | ✅ |
| FR-06 | Cihazda PDF/CSV/XLSX rapor | P1 | ✅ |
| FR-07 | Klasörlü fotoğraf ZIP + metadata | P1 | ✅ |
| FR-08 | Tutarlı SQLite anlık görüntülü `.izleer` yedeği | P1 | ✅ |
| FR-09 | Doğrulamalı, birleştiren geri yükleme + ön yedek | P1 | ✅ |
| FR-10 | İlerleme göstergesi ve güvenli yeniden başlatma | P1 | ✅ |
| FR-11 | İşletim sistemi paylaşım ekranı | P1 | ✅ |
| FR-12 | SHA-256 bütünlük doğrulaması | P1 | ✅ |
| FR-13 | Dışa aktarma/yedeklemenin ücretsiz olması | P1 | ✅ |
| FR-14 | Depolama kullanımı ve önbellek temizliği | P1 | ✅ |
| FR-15 | Hesap oluşturma/giriş (Supabase Auth) | P2 | ⏳ |
| FR-16 | Google Play Billing + sunucu doğrulama | P2 | ⏳ |
| FR-17 | Apple StoreKit + sunucu doğrulama | P2 | ⏳ |
| FR-18 | Satın alımları geri yükleme | P2 | ⏳ |
| FR-19 | 7 günlük çevrimdışı yetki önbelleği | P2 | ⏳ |
| FR-20 | Premium özellik kapıları | P2 | ⏳ |
| FR-21 | Mağaza abonelik yönetimi bağlantısı | P2 | ⏳ |
| FR-22 | Web'de arşiv içe aktarma | P2 | ⏳ |
| FR-23 | Gelişmiş fotoğraf karşılaştırma | P2 | ⏳ |
| FR-24 | Gelişmiş rapor şablonları | P2 | ⏳ |
| FR-25 | QR/Wi-Fi ile yerel aktarım | P3 | ⏳ |
| FR-26 | AES parola korumalı yedek | P3 | ⏳ |
| FR-27 | Otomatik bulut yedekleme | P3 | ⏳ |
| FR-28 | İsteğe bağlı senkronizasyon / çoklu cihaz | P3 | ⏳ |
| FR-29 | EXIF koruma/temizleme seçeneği | P3 | ⏳ |
| FR-30 | Arka planda süren aktarım | P3 | ⏳ |

---

## 9. Güvenlik ve veri kaybı kuralları

| Risk | Kural / önlem |
|---|---|
| Yedek sırasında yazma çakışması | `serializeAsync()` tutarlı anlık görüntü |
| Geri yükleme veri kaybı | Önce otomatik güvenlik yedeği |
| Çift kayıt | UUID + `archiveId`; UPSERT/IGNORE |
| Bozuk arşiv | Manifest + SHA-256 + `foreign_key_check` |
| Yol geçişi | `isSafeArchivePath`; `..` ve mutlak yol reddi |
| Kaynak dosya kaybı | Aktarımda yalnızca okuma; silme yok |
| Geçici dosya sızıntısı | `izleer-work/` temizliği; ayarlardan elle temizleme |
| Yetkisiz Premium | Sunucu doğrulaması; istemci yanıtına güvenilmez |
| Aynı işlemin çoklu hesap | `transaction_ref` benzersizliği |
| Cihaz değişikliği | Abonelik İzleer hesabına bağlı; IMEI/donanım kimliği kullanılmaz |
| Abonelik bitişi | Veri silinmez; yalnızca Premium özellikler kısıtlanır |
| EXIF/GPS | İleride kullanıcı seçimi; şimdilik orijinal korunur |

---

## 10. Test senaryoları

### 10.1. Otomatik testler (Vitest)

`npm.cmd test` şu birimleri kapsar:

- `slug`: Türkçe karakter normalizasyonu, güvenli klasör adları, arşiv yolu kontrolü.
- `format`: tarih/saat, bayt, sayı ve hatırlatma etiketleri.
- `csv`: kaçış, ayırıcı, satır sonu.
- `xlsx`: geçerli OOXML, paylaşılan dize/numara hücreleri.
- `reporthtml`: HTML kaçışı, fotoğraf yerleşimi, rapor başlıkları.

### 10.2. Yedekleme ve aktarım (manuel)

1. 10 varlık, 100 kayıt ve 200 fotoğraf içeren arşiv oluştur.
2. Tam yedeği oluştur ve bilgisayara aktar.
3. Yeni bir telefona uygulamayı kur.
4. Yedeği geri yükle.
5. Varlık, kayıt, fotoğraf ve ölçüm sayılarını karşılaştır.
6. Fotoğrafların açıldığını ve doğru kayıtla eşleştiğini doğrula.
7. Büyük aktarım sırasında uygulamayı kapatıp yeniden aç.
8. Bozuk veya eksik arşivin geri yüklenmesini engellediğini doğrula.
9. Aynı arşivi ikinci kez yükle; çift kayıt oluşmadığını doğrula.
10. Geri yükleme öncesi güvenlik yedeğinin oluştuğunu doğrula.

### 10.3. Ödeme (Aşama 3, gerçek mağaza derlemesi)

1. Free kullanıcı Premium satın alır.
2. Ödeme beklemede kalır; Premium açılmaz.
3. Ödeme tamamlanır; Premium açılır.
4. Kullanıcı uygulamayı silip yeniden kurar.
5. Aynı mağaza hesabıyla satın alımı geri yükler.
6. Farklı telefona geçer; aynı İzleer hesabıyla erişir.
7. Abonelik iptal edilir, süre dolmamıştır; erişim sürer.
8. Abonelik süresi dolar; Premium kapanır, veriler kalır.
9. Ödeme iade edilir; yetki kaldırılır.
10. İnternet kesilir; yetki 7 günlük önbellekten okunur.

> Bu testler Expo Go'da yapılamaz. Google Play/App Store satın almayı destekleyen
> development build ve mağaza test hesapları gerekir.

### 10.4. Cihaz kontrol listesi

- [ ] Uçak modunda varlık/kayıt/fotoğraf/rapor çalışıyor.
- [ ] Uygulama yeniden başlatıldığında veriler kalıcı.
- [ ] Büyük fotoğraflarda bellek taşması yok.
- [ ] Paylaşım ekranı PDF, CSV, XLSX, ZIP ve `.izleer` için açılıyor.
- [ ] Android geri tuşu ve klavye davranışı doğru.
- [ ] Türkçe karakterli klasör/dosya adları bozulmuyor.
- [ ] Depolama göstergeleri ve önbellek temizliği çalışıyor.

---

## 11. Yol haritası

| Aşama | Kapsam | Durum |
|---|---|---|
| **1 — Yerel veri altyapısı** | SQLite, medya, migration, yerel rapor, veri erişimi | ✅ Tamam |
| **2 — Bilgisayara aktarım** | PDF/CSV/XLSX, fotoğraf ZIP, `.izleer`, geri yükleme, ilerleme, SHA-256 | ✅ Tamam |
| **3 — Ödeme ve yetkilendirme** | Google Play Billing, StoreKit, Fastify doğrulama, abonelik tabloları, geri yükleme | ⏳ Planlı |
| **4 — Web entegrasyonu** | Arşiv içe aktarma, web raporları, gelişmiş karşılaştırma | ⏳ Planlı |
| **5 — İleri özellikler** | QR/Wi-Fi, otomatik bulut yedeği, isteğe bağlı senkronizasyon, çoklu cihaz | ⏳ Planlı |

**İlk sürüm kapsamı (bu teslim):** Aşama 1 + 2. Ödeme altyapısı için yalnızca
`subscription_cache` tablosu ve arayüz bilgilendirmesi hazırdır; gerçek satın alma
yoktur.

---

## 12. Bilinen sınırlar

- **Parola korumalı yedek yok.** JSZip şifreleme sunmaz; sahte bir parola alanı
  gösterilmez. AES desteği Aşama 5'tedir.
- **QR/Wi-Fi aktarımı yok.** Yalnızca işletim sistemi paylaşım ekranı vardır.
- **Otomatik kaldığı yerden devam yok.** İş yeniden başlatılabilir; yarım dosya
  güvenli biçimde atılır.
- **IAP test edilemedi.** Mağaza kimlik bilgileri ve development build olmadan
  gerçek satın alma doğrulanamaz.
- **Rapordaki fotoğraf sayısı sınırlı.** PDF başına 28, varlık başına 8, dosya
  başına 2,5 MB. Tam arşiv için fotoğraf ZIP'i kullanılmalı.
- **Paylaşım durumu kesin değil.** `SHARED` hedefe kaydı kanıtlamaz.
- **Web/Android ürünleri ayrıdır.** Bu uygulama mevcut web ve Kotlin uygulamasının
  yerini almaz; veri modeli bilinçli olarak ayrı tutulur.
- **EXIF politikası yok.** Orijinal dosyalar korunur; GPS temizleme seçeneği
  ileridedir.

---

## 13. Çalıştırma ve doğrulama

```powershell
cd C:\hakan\yapay_zeka\varlik-hafizasi\mobile
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npx.cmd expo export --platform android
npm.cmd start          # Expo geliştirme sunucusu
```

Android cihaz/emülatör:

```powershell
npm.cmd run android
```

> `npm.ps1` bu ortamda engellidir; `npm.cmd` / `npx.cmd` kullanın.
> Gerçek mağaza satın alımı için `expo-dev-client` ile development build gerekir.

### Teslim doğrulaması

- [x] `tsc --noEmit` temiz.
- [x] Vitest birim testleri geçiyor.
- [x] Android için `expo export` paketi üretiliyor.
- [x] Eksik rota yok (`/settings`, `/transfer/jobs` dahil).
- [x] Yedek manifesti, SHA-256 ve geri yükleme birleştirme kuralları uygulanmış.
- [x] Dışa aktarma ve yedekleme ücretsiz; abonelik kapısı yok.

---

## 14. Sonraki adımlar

1. **Aşama 3:** Fastify'a billing modülü, Supabase Auth, mağaza ürünleri ve
   gerçek cihazda satın alma testleri.
2. **Aşama 4:** Web'de `.izleer` içe aktarma ve rapor görüntüleme.
3. **Aşama 5:** QR/Wi-Fi aktarımı, AES parola koruması, arka plan işleri,
   isteğe bağlı bulut yedekleme.
4. Kullanıcı geri bildirimiyle yeniden oluşturulan tabloları ve öncelikleri
   gözden geçir.
