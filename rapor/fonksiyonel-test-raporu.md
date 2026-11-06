# izleer — Fonksiyonel Test Raporu

**Tarih:** 4 Kasım 2026
**Kapsam:** API ana akışları, web duman testleri, Android duman testleri
**Sonuç:** API 81/81, web 14/14, Android 6/6 — **toplam 101 kontrolün tamamı beklendiği gibi sonuçlandı.** Bir ürün davranışı gözlemi (F-01) ayrıca raporlanmıştır.

---

## 1. Yaklaşım ve ortam

Mevcut demo verisine dokunmamak için testler izole bir ortamda çalıştırıldı:

| Bileşen | Değer |
|---|---|
| Test veritabanı | `varlik_hafizasi_test` (ayrı veritabanı, migration 001–005 + seed) |
| Test API | `http://127.0.0.1:4100` (`DATABASE_URL` test DB'sine, `STORAGE_DIR=./storage-test`) |
| Demo API | `http://127.0.0.1:4000` — web ve Android testlerinde kullanıldı, verisi değiştirilmedi |
| Web | `http://127.0.0.1:3000` (production build) |
| Android | `vh_test` AVD, `app.varlikhafizasi.debug`, `10.0.2.2:4000` |
| PostgreSQL | Kalıcı yerel küme `%USERPROFILE%\.izleer-pg`, 127.0.0.1:5432 |

API test seti 81 numaralı senaryodan oluşur; her senaryo gerçek HTTP isteğiyle çalışır, durum kodu ve yanıt gövdesi doğrulanır. Set tekrar çalıştırılabilir: her koşuda benzersiz kullanıcı/topluluk adları üretir. Toplam API koşu süresi ~2,5 saniyedir.

Test veritabanı ve `storage-test` klasörü inceleme için bırakılmıştır; demo veritabanı ve `storage` klasörü değiştirilmemiştir.

---

## 2. API fonksiyonel test sonuçları

| ID | Test senaryosu | Beklenen | Doğrulanan | Sonuç |
|---|---|---|---|---|
| FT-01 | Sağlık ucu veritabanıyla birlikte OK döner | 200 {status:ok, db:ok} | ok/ok | ✅ |
| FT-02 | Yeni kullanıcı kaydı token ve kullanıcı döner | 201 + token | 201, kullanıcı oluşturuldu | ✅ |
| FT-03 | İkinci kullanıcı kaydı başarılı | 201 | 201 | ✅ |
| FT-04 | Üçüncü kullanıcı kaydı başarılı | 201 | 201 | ✅ |
| FT-05 | Aynı e-posta ile kayıt 409 döner | 409 CONFLICT | CONFLICT | ✅ |
| FT-06 | Zayıf şifre 422 ile reddedilir | 422 VALIDATION_ERROR | VALIDATION_ERROR | ✅ |
| FT-07 | E-posta ile giriş başarılı | 200 + token | 200 | ✅ |
| FT-08 | Kullanıcı adı ile giriş başarılı | 200 | 200 | ✅ |
| FT-09 | Hatalı şifre 401 döner | 401 UNAUTHORIZED | UNAUTHORIZED | ✅ |
| FT-10 | Oturum ucu token ile 200, tokensiz 401 döner | 200 / 401 | 200 / 401 | ✅ |
| FT-11 | Çıkış sonrası eski token geçersizleşir | 200 sonra 401 | çıkış 200, eski token 401 | ✅ |
| FT-12 | Tür ağacı kök ve alt kategorilerle döner | 200 + ağaç | 5 kök, yaprak=`canli-bitki` | ✅ |
| FT-13 | Kök türle varlık oluşturma 422 INVALID_TYPE döner | 422 INVALID_TYPE | 422 INVALID_TYPE | ✅ |
| FT-14 | Özel varlık ilk kaydıyla oluşturulur | 201 | 201 | ✅ |
| FT-15 | Herkese açık varlık ve kayıt oluşturulur | 201 | 201 | ✅ |
| FT-16 | Seçili erişimli varlık oluşturulur | 201 | 201 | ✅ |
| FT-17 | Kendi varlık listesi oluşturulanları içerir | 200 + varlıklar | 3 varlık | ✅ |
| FT-18 | Sahip özel varlığı görüntüler | 200 | 200 | ✅ |
| FT-19 | Anonim kullanıcı özel varlığa erişemez | 403 FORBIDDEN | 403 | ✅ |
| FT-20 | Keşfet yalnızca kamu varlığını gösterir | kamu var, özel yok | 1 sonuç | ✅ |
| FT-21 | Varlık başlığı ve açıklaması güncellenir | 200 + yeni başlık | 200 | ✅ |
| FT-22 | Erişim verilen kullanıcı varlığı görür | 201 + 200 | erişim verildi ve görüntülendi | ✅ |
| FT-23 | Kendine erişim verme 409 döner | 409 | 409 | ✅ |
| FT-24 | Varlıktan geniş görünürlüklü kayıt 422 döner | 422 VISIBILITY_TOO_BROAD | 422 | ✅ |
| FT-25 | Boş başlıklı varlık 422 döner | 422 | 422 | ✅ |
| FT-26 | Silinen varlık sonrası görüntüleme 404 döner | 204 sonra 404 | 204 → 404 | ✅ |
| FT-27 | Varlık arşivlenir ve arşiv filtresinde listelenir | 200 + listede | arşivlendi | ✅ |
| FT-28 | Varlığa günlük kaydı eklenir | 201 | 201 | ✅ |
| FT-29 | Sahip olmayan kullanıcı kayıt ekleyemez | 403 | 403 | ✅ |
| FT-30 | Başlıksız ve metinsiz kayıt 422 döner | 422 | 422 | ✅ |
| FT-31 | Kayıt başlığı güncellenir | 200 | 200 | ✅ |
| FT-32 | Ölçümlü kayıt ölçüm listesine yansır | 201 + ölçüm | 32,5 psi listelendi | ✅ |
| FT-33 | Kayda medya bağlanır ve medya ucu listeler | 201 + bağlama + listeleme | medya bağlandı | ✅ |
| FT-34 | Kayıt silinince görüntüleme 404 döner | 204 → 404 | 204 → 404 | ✅ |
| FT-35 | PNG yüklemesi 201 ve ready durumu döner | 201 ready/image | 201 ready/image | ✅ |
| FT-36 | Desteklenmeyen dosya türü 422 döner | 422 UNSUPPORTED_MEDIA | 422 | ✅ |
| FT-37 | Yerel depolamada presign 409 döner | 409 DIRECT_UPLOAD_REQUIRED | 409 | ✅ |
| FT-38 | Medya ucu sahibine 200, anonime 401 döner | 200 / 401 | 200 / 401 | ✅ |
| FT-39 | Kullanıcı profili 200 döner | 200 | 200, @mert | ✅ |
| FT-40 | Profil bilgileri güncellenir | 200 | 200 | ✅ |
| FT-41 | Onboarding tercihleri kaydedilir | 200 + 2 ilgi alanı | 200 | ✅ |
| FT-42 | Takip başlar ve takipçi listesinde görünür | 201 + listede | takip edildi | ✅ |
| FT-43 | Kendini takip etme 409 döner | 409 | 409 | ✅ |
| FT-44 | Takibi bırakma 200 ve following=false döner | 200 following:false | 200 | ✅ |
| FT-45 | Özet ucu istatistik ve okunmamış sayısı döner | 200 + stats | assets=3 | ✅ |
| FT-46 | Veri dışa aktarımı profil ve koleksiyonları içerir | 200 + export | 4 varlık | ✅ |
| FT-47 | Kullanıcı önerileri listelenir | 200 + items | 8 öneri | ✅ |
| FT-48 | Metin gönderisi oluşturulur | 201 | 201 | ✅ |
| FT-49 | Boş gönderi 422 döner | 422 | 422 | ✅ |
| FT-50 | Gönderi kimliğiyle okunur | 200 | 200 | ✅ |
| FT-51 | Beğeni eklenir, tekrarı sayıyı artırmaz, geri alınır | tek beğeni | likeCount=1, geri alındı | ✅ |
| FT-52 | Yorum eklenir, listelenir ve yanıtlanır | 201 + 2 yorum + 204 | yorum ve yanıt oluştu | ✅ |
| FT-53 | Gönderi gövdesi güncellenir | 200 | 200 | ✅ |
| FT-54 | Keşfet akışı kamu gönderisini içerir | 200 + gönderi | 8 öğe | ✅ |
| FT-55 | Özel varlık gönderiye eklenemez | 422 ASSET_NOT_SHARED | 422 | ✅ |
| FT-56 | Açık topluluk oluşturulur, sahibi üye olur | 201 üye=1 | oluşturuldu | ✅ |
| FT-57 | Topluluk detayı sahip bilgisiyle döner | 200 isOwner | 200 | ✅ |
| FT-58 | Başka kullanıcı açık topluluğa katılır | 201 + aktif üyelik | katıldı | ✅ |
| FT-59 | Varlık topluluğa paylaşılır ve üye listesinde görünür | 201 + listede | paylaşıldı | ✅ |
| FT-60 | Üye topluluk gönderisi oluşturur, grup akışında görünür | 201 + akışta | paylaşıldı | ✅ |
| FT-61 | Üye olmayan grup akışını görmez | 200 boş liste | boş | ✅ |
| FT-62 | Onaylı katılım isteği sahibi tarafından onaylanır | pending → onay → üye | onaylandı | ✅ |
| FT-63 | Davet gönderilir ve davetli kabul eder | 201 → kabul → üye | kabul edildi | ✅ |
| FT-64 | Özel topluluğa üye olmayan erişemez | 200 / 403 | 200 / 403 | ✅ |
| FT-65 | Üye olmayan varlık paylaşamaz | 403 | 403 | ✅ |
| FT-66 | Arama kullanıcı, varlık ve gönderi bölümleri döner | 200 + varlık sonucu | 1 varlık | ✅ |
| FT-67 | Kısa arama terimi 422 döner | 422 | 422 | ✅ |
| FT-68 | Anonim arama 401 döner | 401 | 401 | ✅ |
| FT-69 | Bildirimler listelenir ve tümü okundu işaretlenir | okundu → unreadCount 0 | 0 | ✅ |
| FT-70 | Kişisel istatistik ucu sayıları döner | 200 + sayaçlar | assets=3 | ✅ |
| FT-71 | Kullanıcı engellenir ve engel listesinde görünür | 201 + listede + 204 | engellendi ve kaldırıldı | ✅ |
| FT-72 | Gönderi şikâyeti oluşturulur, tekrarı 409 döner | 201 → 409 | şikâyet açıldı | ✅ |
| FT-73 | Kendi hesabını şikâyet etme 403 döner | 403 | 403 | ✅ |
| FT-74 | Moderatör yönetim istatistiklerini görür, normal kullanıcı göremez | 200 / 403 | 200 / 403 | ✅ |
| FT-75 | Moderatör şikâyeti çözer ve hedef gönderiyi gizler | resolved + akışta yok | çözüldü, gizlendi | ✅ |
| FT-76 | Gönderi silinir ve akıştan düşer | 204 + akışta yok | 204 | ✅ |
| FT-77 | Sosyal yapılandırma ucu eksik anahtarları bildirir | 200 configured:false | 3 eksik anahtar | ✅ |
| FT-78 | Sosyal bağlantı listesi boş döner | 200 items:[] | boş | ✅ |
| FT-79 | Yapılandırılmamışken paylaşım 503 döner | 503 SOCIAL_NOT_CONFIGURED | 503 | ✅ |
| FT-80 | Yapılandırılmamışken OAuth başlatma 503 döner | 503 | 503 | ✅ |
| FT-81 | Gizlenen gönderi sahibinin erişimine kapalı (gözlem) | Gözlem kaydı | sahip ne görebiliyor ne silebiliyor | ✅ |

### Kapsanan alanlar

Kimlik ve oturum, varlık türleri, varlık CRUD ve görünürlük/erişim, günlük kayıtları ve ölçümler, medya yükleme ve yetki, profil/takip/onboarding/veri dışa aktarımı, gönderi-beğeni-yorum, akış, topluluk oluşturma/katılım/onay/davet/varlık paylaşımı, arama, bildirimler, kişisel istatistik, engelleme, şikâyet ve moderasyon, sosyal paylaşım yapılandırması.

---

## 3. Web duman testleri

| ID | Test | Beklenen | Sonuç |
|---|---|---|---|
| FW-01 | Anonim kullanıcı `/giris` sayfasına yönlendirilir | 307 → `/giris` | ✅ |
| FW-02 | Giriş sayfası Türkçe metin içerir | "Giriş yap" | ✅ |
| FW-03 | Demo hesapla web oturumu açılır | `vh_token` çerezi | ✅ |
| FW-04 | Oturumlu ana sayfa kişisel başlık döner | "bir hafızası var", "Hafıza defteri" | ✅ |
| FW-05 | `/varliklar` açılır | 200 + "Varlıklar" | ✅ |
| FW-06 | `/kesfet` açılır | 200 + "Keşfet" | ✅ |
| FW-07 | `/gruplar` açılır | 200 + "Gruplar" | ✅ |
| FW-08 | `/profil` açılır | 200 + "Profil" | ✅ |
| FW-09 | `/bildirimler` açılır | 200 + "Bildirimler" | ✅ |
| FW-10 | `/arsiv` açılır | 200 + "Arşiv" | ✅ |
| FW-11 | `/ayarlar/sosyal` açılır | 200 + "Sosyal hesaplar" | ✅ |
| FW-12 | İngilizceye geçiş giriş sayfasına yansır | "Sign in" | ✅ |
| FW-13 | Türkçeye dönüş giriş sayfasına yansır | "Giriş yap" | ✅ |
| FW-14 | Çıkış sonrası ana sayfa girişe yönlendirir | 307 → `/giris` | ✅ |

Not: `/ayarlar` kökü 404 döner; ayarlar ekranı `/ayarlar/sosyal` yolundadır. Bu bir hata değildir, test beklentisi buna göre düzeltilmiştir.

---

## 4. Android duman testleri

Emülatör: `vh_test` (API 35, 1080×2400). Uygulama demo API'sine (`10.0.2.2:4000`) bağlıdır ve demo hesabıyla oturum açıkmış durumdadır.

| ID | Test | Beklenen | Sonuç |
|---|---|---|---|
| FA-01 | Uygulama paketi kurulu ve `MainActivity` başlıyor | `app.varlikhafizasi.debug` açılır | ✅ |
| FA-02 | Oturum korunuyor, ana ekran yükleniyor | "Merhaba, Ada." + 5 varlık / 9 kayıt / 3 medya | ✅ |
| FA-03 | Alt gezinme çubuğu görünür | Panel, Varlıklar, Keşfet, Profil | ✅ |
| FA-04 | Varlıklar sekmesi listeyi gösterir | "5 varlık hafızanda", varlık kartları | ✅ |
| FA-05 | Keşfet sekmesi ilham akışını gösterir | "Başkalarının süreçlerinden ilham al" | ✅ |
| FA-06 | Profil sekmesi kullanıcı bilgisini gösterir | Ada Yıldız, @ada, 5/9/3/3/2 sayaçları | ✅ |

Ekran görüntüleri: [ana ekran](rapor/ekler/android-smoke-home.png), [varlıklar](rapor/ekler/android-smoke-varliklar.png), [profil](rapor/ekler/android-smoke-profil.png).

---

## 5. Bulgular ve gözlemler

### F-01 — Moderasyonla gizlenen gönderi, sahibine de kapalı (düşük–orta)

Bir gönderi moderatör tarafından `hidden` durumuna alındığında, gönderinin **sahibi** de `GET /v1/posts/:id` ve `DELETE /v1/posts/:id` uçlarında **403** alıyor (FT-81). Yani kullanıcı, moderasyon kararı sonrası kendi içeriğini ne görebiliyor ne silebiliyor. Gizleme kararı kamuya kapalı olmalı; ancak sahibinin içeriği görmesi ve silmesi beklenir. Öneri: `getAccessiblePost` içinde yazara gizli gönderi için okuma/silme izni verilmesi veya silme ucunun görünürlük kapısından bağımsız sahiplik kontrolü yapması. Güvenlik açığı değildir; ürün davranışı boşluğudur.

### F-02 — Meta entegrasyonu yapılandırılmamış (bilgi)

Test ortamında `META_APP_ID`, `META_APP_SECRET`, `SOCIAL_TOKEN_KEY` yok; `GET /v1/social/config` `configured:false` ve eksik anahtar listesini döndürüyor, paylaşım/OAuth uçları tasarım gereği **503 SOCIAL_NOT_CONFIGURED** veriyor. Canlı Meta akışı bu koşuda kapsam dışıdır.

### F-03 — Emülatör soğuk açılışta ağ kapalıydı (ortam)

Soğuk açılışta `wlan0` arayüzü düşük durumdaydı; uygulama "Sunucuya ulaşılamadı" uyarısı gösterdi. `adb shell svc wifi enable` sonrası ağ geldi ve uygulama sorunsuz yüklendi. Uygulama hatası değildir; Android otomasyonunda açılış sonrası ağ kontrolü yapılmalıdır.

### Gözlem — Ayarlar yolu

Web'de ayarlar ekranı `/ayarlar` değil `/ayarlar/sosyal` altındadır; menü de bu yolu kullanır. Test beklentisi buna göre güncellendi.

---

## 6. Kapsam dışı ve sınırlamalar

- Web testleri HTTP/SSR seviyesindedir; bu koşuda tarayıcıda tıklama/JS etkileşimi otomasyonu yapılmadı. Giriş formu, önceki oturumda tarayıcıda elle doğrulanmıştı.
- Android yalnızca duman seviyesindedir: açılış, oturum, sekmeler ve liste render'ı. Form gönderimi, fotoğraf yükleme ve derin bağlantılar kapsam dışı.
- S3 depolama sürücüsü, canlı Meta OAuth/paylaşımı ve Supabase hedefi test edilmedi (yerel `local` sürücü ve yapılandırılmamış Meta ile çalışıldı).
- Yük/performans, güvenlik taraması, e-posta bildirimi ve erişilebilirlik denetimi bu raporun kapsamında değildir.
- API seti sıralı ve durum bağımlıdır; bazı senaryolar önceki adımların ürettiği kimlikleri kullanır. Tek başına senaryo çalıştırma desteklenmez.

---

## 7. Yeniden üretme

```bash
# 1) Yerel PostgreSQL (gerekirse)
powershell -ExecutionPolicy Bypass -File infra/scripts/local-pg.ps1 -Action start

# 2) İzole test veritabanı (bir kez)
#    Herhangi bir PG istemcisiyle: CREATE DATABASE varlik_hafizasi_test OWNER vh_app;

# 3) Migration + seed (test DB)
cd api
export DATABASE_URL='postgresql://vh_app:<yerel-parola>@127.0.0.1:5432/varlik_hafizasi_test'
export DATABASE_SSL=false
npm run db:migrate && npm run db:seed

# 4) Test API örneği (:4100)
PORT=4100 PUBLIC_API_URL='http://127.0.0.1:4100' STORAGE_DIR='./storage-test' npx tsx src/server.ts

# 5) API test seti
cd ..
node infra/scripts/functional-api-test.mjs
# → rapor/functional-test-results.json

# 6) Web duman testleri (web :3000 ve demo API :4000 çalışırken)
bash infra/scripts/functional-web-smoke.sh
```

## 8. Ekler

- [API test betiği](infra/scripts/functional-api-test.mjs)
- [Web duman testi betiği](infra/scripts/functional-web-smoke.sh)
- [Ham API sonuçları (JSON)](rapor/functional-test-results.json)
- [Android ana ekran](rapor/ekler/android-smoke-home.png) · [Varlıklar](rapor/ekler/android-smoke-varliklar.png) · [Profil](rapor/ekler/android-smoke-profil.png)
