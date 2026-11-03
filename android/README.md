# izleer — Android (Jetpack Compose)

izleer'ın Android istemcisi. Web uygulamasıyla aynı REST API'yi kullanır; sahip olunan varlıkları, zaman çizelgesini, fotoğraf/belge arşivini ve keşfet akışını mobilde sunar.

## Gereksinimler

- JDK 17 (Android Studio Ladybug veya üzeri ya da Temurin 17)
- Android SDK 35 (compileSdk/targetSdk 35, minSdk 26) ve build-tools 35.0.0
- Gradle 8.9 (Android Studio'daki sarmalayıcı ya da bağımsız kurulum)
- Çalışan API: `http://localhost:4000` (emülatörden `http://10.0.2.2:4000`)

## Hızlı başlangıç

1. Depo kökünde API ve veritabanını ayağa kaldırın:

   ```bash
   cd api
   cp .env.example .env        # ilk seferde
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev                 # http://localhost:4000
   ```

2. Android Studio'da `android/` klasörünü açın. Gradle sync tamamlanınca `app` yapılandırmasını bir emülatörde çalıştırın.

3. Demo hesapla giriş yapın:

   | Alan | Değer |
   | --- | --- |
   | E-posta | `ada@demo.local` |
   | Şifre | `Demo1234!` |

   Diğer demo hesaplar: `mert@demo.local`, `selin@demo.local`, `deniz@demo.local` (aynı şifre).

> Depoda `gradle-wrapper.jar` ve `gradlew` betikleri yoktur (ikili dosyalar bilinçli olarak eklenmedi). Android Studio ilk açılışta Gradle'ı kendi indirir; gerekirse terminalde `gradle wrapper --gradle-version 8.9` çalıştırıp sarmalayıcıyı üretebilirsiniz. Sürümler: Gradle 8.9, AGP 8.7.3, Kotlin 2.0.21.

### Komut satırından derleme

`JAVA_HOME` JDK 17'yi, `ANDROID_HOME` SDK 35'i göstermeli; `android/local.properties` içinde `sdk.dir` tanımlı olmalıdır:

```properties
sdk.dir=C:/Users/<kullanıcı>/Android/Sdk
```

```bash
cd android
gradle assembleDebug
```

APK çıktısı: `app/build/outputs/apk/debug/app-debug.apk`. Cihaza kurmak için `adb install -r app/build/outputs/apk/debug/app-debug.apk`. Bu proje Temurin JDK 17.0.20.1, Android SDK 35 (build-tools 35.0.0, platform-tools 37.0.1) ve Gradle 8.9 ile uyarısız derlendi.

## API adresi

Adres `app/build.gradle.kts` içindeki `API_BASE_URL` alanından gelir:

```kotlin
buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:4000/\"")
```

- **Emülatör:** `http://10.0.2.2:4000/` (host makinenin localhost'u)
- **Fiziksel cihaz:** Bilgisayarın yerel IP'si, örn. `http://192.168.1.20:4000/`. Telefon ve bilgisayar aynı ağda olmalı; API'yi `HOST=0.0.0.0` ile başlatın.
- **Üretim:** HTTPS adresi kullanın. `network_security_config.xml` yalnızca `10.0.2.2`, `localhost` ve `127.0.0.1` için şifresiz HTTP'ye izin verir; diğer adreslerde HTTP engellidir.

Fiziksel cihazda HTTP kullanacaksanız cihaz IP'sini `network_security_config.xml` içine eklemeniz gerekir (tercihen geliştirme dışında HTTPS kullanın).

## Ekranlar

| Ekran | İşlev |
| --- | --- |
| Giriş / Kayıt | E-posta veya kullanıcı adıyla oturum; yeni hesap |
| Panel | Özet istatistikler, son varlıklar, son kayıtlar, hızlı eylemler |
| Varlıklar | Sunucu tarafı arama, varlık listesi, yeni varlık |
| Varlık detayı | Kapak, meta, sekmeler: Zaman / Arşiv / Ölçümler / Paylaşım; kayıt silme; medya lightbox; erişim ver/kaldır |
| Yeni varlık | Tür seçimi, ad/açıklama, görünürlük, kapak fotoğrafı |
| Kayıt ekle | Not/fotoğraf/bakım/ölçüm türleri, çoklu medya (≤6), ölçüm alanları |
| Arşiv | Tür filtreleri, arama, 3 sütunlu medya ızgarası, belge/video açma |
| Keşfet | Herkese açık varlıklar, önerilen kişiler, gönderi akışı ve beğeni |
| Bildirimler | Okunmamış vurgusu, tek tek / tümünü okundu işaretleme |
| Profil | İstatistikler, varlıklar, gönderiler, gizlilik notu, çıkış |

## Mimari

```
app/src/main/java/app/varlikhafizasi/
├── MainActivity.kt          # Compose giriş noktası, ViewModel fabrikası
├── VhApplication.kt         # AppGraph: tek repository örneği
├── data/
│   ├── Models.kt            # @Serializable API modelleri
│   ├── VhApi.kt             # Retrofit arayüzü
│   ├── VhRepository.kt      # İstekler, hata çevirisi, medya yükleme, URL çözümleme
│   └── SessionStore.kt      # DataStore + bellek içi token (interceptor için)
├── ui/
│   ├── VhViewModel.kt       # StateFlow tabanlı ekran durumları
│   ├── navigation/VhApp.kt  # NavHost, alt menü, oturum yönlendirmesi
│   ├── theme/Theme.kt       # Renkler, tipografi, şekiller
│   ├── components/Common.kt # Ortak bileşenler ve biçimlendiriciler
│   └── screens/             # 10 ekran
└── res/                     # Tema, ikon, güvenlik ve yedekleme kuralları
```

- **Oturum:** API opak bearer token döner; token DataStore'da saklanır, `TokenHolder` üzerinden OkHttp interceptor'ına verilir. 401 alındığında oturum kapatılır.
- **Medya:** Seçilen içerik `content://` URI'sinden okunur, 10 MB sınırıyla Base64'e çevrilip `/v1/media/upload`'a gönderilir; dönen medya kimlikleri kayda bağlanır.
- **Görsel URL'leri:** API göreli `/files/...` yolları döndürür; `MediaUrl.resolve` bunları `API_BASE_URL` ile mutlak adrese çevirir.
- **Durum yönetimi:** Her ekran `Loadable<T>` (yükleniyor / veri / hata) kullanır; yazma işlemleri `formBusy`/`formError`, sonuçlar snackbar ile bildirilir.

## Tasarım

Web ile ortak “kâğıt ve orman” dili: krem `#F6F1E6` zemin, koyu yeşil `#1C2B24`, adaçayı ve kil vurgular, serif başlıklar. Material 3 bileşenleri özelleştirilmiş renk şemasıyla kullanılır; açık tema sabittir.

## Bilinen sınırlar

- **Derleme doğrulandı, çalıştırma doğrulanmadı:** `assembleDebug` JDK 17, SDK 35 ve Gradle 8.9 ile başarılı; APK imzası ve manifest bilgileri `apksigner`/`aapt` ile kontrol edildi. Emülatör veya fiziksel cihazda kurulum/UI testi bu ortamda yapılmadı.
- MVP kapsamı gereği çevrimdışı önbellek, push bildirim, arka plan yükleme ve derin bağlantı yoktur.
- Yalnızca görsel yükleme akışı istemcide hazırlanmıştır; belge/video yükleme web üzerinden yapılır.
- Keşfet akışı yorum yazmayı içermez (web'de vardır); beğeni desteklenir.
- Üretim imzalama, Play Store yapılandırması ve R8 küçültme bu MVP'de ayarlanmamıştır (`isMinifyEnabled = false`).

## Sorun giderme

| Belirti | Olası neden / çözüm |
| --- | --- |
| “Sunucuya ulaşılamadı” | API kapalı, adres yanlış veya emülatörde `10.0.2.2` kullanılmıyor |
| Fiziksel cihazda bağlantı yok | Aynı ağda değilsiniz, API yalnızca localhost'a bağlı ya da HTTP adresi güvenlik yapılandırmasında yok |
| Görseller açılmıyor | `API_BASE_URL` sonunda `/` olmalı ve API `/files` sunuyor olmalı |
| 401 sonrası giriş ekranı | Normal davranış: token süresi dolmuş veya sunucuda oturum iptal edilmiş |
| Gradle sync başarısız | JDK 17 seçin, SDK 35'i yükleyin, `local.properties` içindeki `sdk.dir` yolunu kontrol edin; sarmalayıcı yoksa Android Studio'nun Gradle'ını veya kurulu Gradle 8.9'u kullanın |
