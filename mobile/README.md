# izleer mobil

Yerel öncelikli (local-first) İzleer mobil uygulaması. Varlıklar, zaman çizelgesi
kayıtları, ölçümler, hatırlatmalar ve fotoğraflar cihazdaki SQLite veritabanında
tutulur; internet olmadan çalışır.

Bu uygulama mevcut web ve Kotlin/Android ürünlerinden **ayrıdır**. Mobil ana
üründür ve kendi veri modelini kullanır.

## Durum

| Aşama | Kapsam | Durum |
|---|---|---|
| 1 | SQLite, medya, migration, yerel raporlar | ✅ |
| 2 | PDF/CSV/XLSX, fotoğraf ZIP, `.izleer` yedek, geri yükleme | ✅ |
| 3 | Google Play / App Store abonelik ve sunucu doğrulaması | ⏳ |
| 4 | Web arşiv içe aktarma ve raporları | ⏳ |
| 5 | QR/Wi-Fi, AES yedek, otomatik bulut | ⏳ |

Ayrıntılı şartname: [`../docs/MOBIL-LOCAL-FIRST.md`](../docs/MOBIL-LOCAL-FIRST.md).

## Gereksinimler

- Node.js 22+
- Android için JDK 17 ve Android SDK (veya Expo Go / emülatör)
- Windows'ta `npm.ps1` engelliyse `npm.cmd` / `npx.cmd` kullanın

## Kurulum

```powershell
cd C:\hakan\yapay_zeka\varlik-hafizasi\mobile
npm.cmd install
npm.cmd start
```

Android:

```powershell
npm.cmd run android
```

## Komutlar

| Komut | Görev |
|---|---|
| `npm.cmd start` | Expo geliştirme sunucusu |
| `npm.cmd run android` | Android cihaz/emülatörde aç |
| `npm.cmd run typecheck` | TypeScript denetimi (`tsc --noEmit`) |
| `npm.cmd test` | Vitest birim testleri |
| `npm.cmd run bundle:android` | `expo export --platform android` |

## Neler var?

- **Varlıklar:** 25 tür, arama, tür filtresi, aktif/arşiv, yumuşak silme.
- **Zaman çizelgesi:** not, fotoğraf, bakım, edinme, ölçüm, sağlık, olay, belge,
  hatırlatma.
- **Fotoğraflar:** galeri/kamera, kapak seçimi, orijinal dosya koruma.
- **Hatırlatmalar:** bekleyen/tamamlanan, ana ekranda yaklaşanlar.
- **Raporlar:** PDF, CSV, XLSX; tür, kapsam, tarih aralığı ve içerik seçimi.
- **Fotoğraf arşivi:** anlamlı klasör yapısı + `metadata/kayitlar.csv`.
- **Tam yedek:** tutarlı SQLite anlık görüntüsü, medya, manifest ve SHA-256.
- **Geri yükleme:** önizleme, bütünlük doğrulaması, UUID ile birleştirme,
  ön yedek.
- **Ayarlar:** plan bilgisi, depolama kullanımı, önbellek temizliği.

## Veri ve dosya düzeni

| Yol | İçerik |
|---|---|
| `izleer.db` | SQLite (WAL, foreign keys) |
| `media/` | Orijinal fotoğraflar |
| `exports/` | PDF, CSV, XLSX, ZIP, `.izleer` |
| `izleer-work/` | Geçici işler (önbellek) |

Yedek formatı ZIP tabanlıdır:

```
manifest.json
database.sqlite
assets/...
metadata/kategoriler.json
metadata/export_info.json
```

Geri yükleme yalnızca `asset_types`, `assets`, `entries`, `media` tablolarını
birleştirir. `export_jobs`, `export_items` ve `subscription_cache` cihaza özgüdür
ve geri yüklenmez.

## İzinler

- **Galeri:** varlık fotoğrafı seçmek için.
- **Kamera:** fotoğraf çekmek için.
- **Dosya seçici:** `.izleer` yedeği açmak için.

Uygulama bu sürümde ağ üzerinden veri göndermez; reklam veya analitik yoktur.

## Bilinen sınırlar

- Parola korumalı yedek yok (Aşama 5).
- QR/Wi-Fi aktarımı yok; paylaşım işletim sistemi ekranıyla yapılır.
- "Paylaşıldı" durumu hedefe kaydı kanıtlamaz.
- Mağaza satın alımı bu sürümde yok; Premium ekranı yalnızca bilgilendirir.
- PDF raporuna en fazla 28 fotoğraf eklenir.
- Gerçek cihaz/emülatör olmadan arayüz çalışma zamanı doğrulanamaz.

## Test

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd expo export --platform android
```

Manuel yedek/geri yükleme ve ödeme test listesi için
[`../docs/MOBIL-LOCAL-FIRST.md`](../docs/MOBIL-LOCAL-FIRST.md) §10'a bakın.
