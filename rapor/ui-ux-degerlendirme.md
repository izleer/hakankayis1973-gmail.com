# izleer — UI/UX Değerlendirmesi

**Kaynak:** `rapor/izleer-durum-analizi.pdf` (3 Kasım 2026, 21 sayfa), web/Android kaynak kodu ve stil dosyaları  
**Kapsam:** 12 web ekranı, 10 Android ekranı, giriş, sosyal kurulum ve paylaşım modalı  
**Yöntem:** Ekran görüntüsü incelemesi + bileşen/CSS kontrolü + WCAG kontrast hesapları. Bu bir kullanıcı testi değildir; bulgular uzman değerlendirmesidir.

---

## 1. Yönetici özeti

izleer, demo ölçeğinde **görsel kimliği ve editoryal dili en güçlü** ürünlerden biri. Sıcak kâğıt zemini, orman yeşili, kil tonları ve serif başlıklar; “hafıza defteri” fikrini gerçekten hissettiriyor. Varlık → kayıt → zaman çizelgesi modeli anlaşılır; Keşfet akışının her gönderiyi bir varlığa geri bağlaması ürünün en özgün fikri.

Buna karşılık ürün, canlıya çıkmadan önce **güven, görev tamamlama ve erişilebilirlik** tarafında ciddi eşiklerle karşı karşıya:

- **Gizlilik vaadi ile kod aynı yerde değil.** Arayüz “Yalnızca ben”, “Seçili kişiler” diyor; raporun R2 bulgusu bu kuralların API’de uygulanmadığını söylüyor. Bu, salt bir hata değil; ürünün temel vaadini kıran bir güven sorunu.
- **Android’de kayıt ekleme tarihi yok.** Ekran “tarihiyle birlikte kalsın” diyor ama tarih/saat alanı sunmuyor. Bir hafıza ürünü için geçmişe kayıt girmek temel ihtiyaç.
- **Varlık detayında veri hatası var:** “TÜR” alanında “delice zeytin” görünüyor; “YAŞ 30” ise birimsiz.
- **Metinlerin önemli bölümü 9–11 px ve düşük kontrastlı.** Ölçülen değerler WCAG AA’nın altında; özellikle tarih, görünürlük, sayaç ve eylem etiketleri etkileniyor.
- **Sosyal kurulum ekranı son kullanıcıya açık.** Ortam değişkenleri, callback URL’si ve “Kurulum gerekli” durumu ürünün ana gezinmesinde; paylaşım modalı ise çıkmaz sokağa dönüşüyor.

**Kısa değerlendirme:** Görsel olarak 4,5/5; bilgi hiyerarşisi 3,5/5; tutarlılık 3/5; görev akışları 3/5; erişilebilirlik 2/5; güven algısı 2/5.  
*Not: Puanlar beş üzerinden uzman izlenimidir; ölçülebilir kullanıcı testi verisi değildir.*

---

## 2. Güçlü yönler

- **Kendine ait bir marka dili var.** “Yaşayan ve dönüşen her şeyin izi”, “Hatırlamak, yeniden bakmaktır” gibi cümleler ürünün tonunu net kuruyor; jenerik bir sosyal ağ hissi vermiyor.
- **Varlık ve hafıza modeli doğru kurulmuş.** Kapak, künye, zaman çizelgesi, arşiv, ölçüm ve paylaşım aynı sayfada; kullanıcı “neyi, ne zaman, neden” sakladığını görebiliyor.
- **Keşfet, ürünün en iyi fikri.** Her gönderinin altında “Dönüm noktası · İlk büyük yaprak → Bitkiler” gibi bir kaynak şeridi var. Bu, keşfeti sıradan bir akıştan “başkalarının hafızasında gezinme”ye çeviriyor.
- **Kart ızgarası ve kapak kullanımı tutarlı.** Varlıklar, profil ve ana sayfa aynı kart dilini kullanıyor; öğrenme maliyeti düşük.
- **Mobilde görünürlük etiketleri açık.** Android’de “Özel / Seçili kişiler / Herkese açık” metin olarak görünüyor; web kartlarındaki göz ikonundan daha anlaşılır.
- **Teknik şeffaflık iyi.** Sosyal kurulum ekranı eksik değişkenleri ve beş adımı açıkça gösteriyor; doğru hedef kitle için (yönetici/geliştirici) faydalı.
- **Temel erişilebilirlik alışkanlıkları var.** `lang="tr"`, `focus-visible`, form etiketleri, `alt` metinleri ve `prefers-reduced-motion` desteği mevcut. Bu, sıfırdan kurulacak bir erişilebilirlik çalışmasına göre avantaj.

---

## 3. Ekran bazında değerlendirme

### 3.1 Hafıza (web ana sayfa)

**İyi:** Hero, ürünün manifestosunu ve son varlığı tek bakışta veriyor. “Son iz” kartı, hafıza fikrini somutlaştırıyor. Alt kısımdaki dört sayaç ve varlık ızgarası taranabilir.

**Sorunlar:**
- Hero yaklaşık 560 px yüksekliğinde; 1440×900 bir ekranda ilk görünümün neredeyse tamamını kaplıyor. Geri dönen kullanıcı için “bugün ne var?” bilgisi aşağıda kalıyor.
- Hero’daki 6 varlık / 12 kayıt / 6 fotoğraf sayıları, hemen altındaki dört sayaç kartında neredeyse aynen tekrarlanıyor. Bilgi tekrarı, hiyerarşiyi zayıflatıyor.
- “Yeni varlık” eylemi aynı ekranda üç yerde: sol menü, hero ve sayfa başlığı. Hangisinin birincil olduğu belirsizleşiyor.
- Tarih, sayaç etiketleri ve “Son iz” alt metni 10–11 px ve düşük kontrastlı.
- Varlık kartlarında görünürlük yalnızca bir göz ikonuyla veya ikonun **yokluğuyla** anlatılıyor. “Özel” ile “Seçili kişiler” arasındaki fark karttan okunamıyor.

**Öneri:** Hero’yu ilk ziyarette tam, sonraki ziyaretlerde daha kompakt göster; sayaç tekrarını kaldır veya hero’yu “son hareket” odaklı küçült. Kartlarda göz ikonunun yanına kısa metin ekle (“Herkese açık”, “Seçili”, “Özel”) ve bunu erişilebilir bir etiketle destekle.

### 3.2 Varlıklar

**İyi:** Arama, durum ve kategori filtreleri tek araç çubuğunda; üç sütunlu ızgara 6–20 varlıkta rahat taranıyor. Kartların kapak + tür + konum + kayıt sayısı + son güncelleme kurgusu doğru.

**Sorunlar:**
- “Tümü / Takipte / Arşivde” filtresindeki **“Takipte”** bir varlık listesinde anlamsız. Varlık mı takip ediliyor, yoksa “takip ettiğim kişilerin varlıkları” mı? Etiketin karşılığı net değil.
- “Arşivde” hem bir durum hem de ayrı bir “Arşiv” sayfası; aynı kelime iki farklı şeyi anlatıyor.
- Arama kutusunda temizleme (×), sonuç sayısı ve sıralama yok. 6 varlıkta sorun değil; 60’ta ciddi sorun.
- Kart meta metinleri 10 px ve `ink-faint` (3,4–3,6:1). Konum ve kayıt sayısı okunmuyor.
- Görünürlük göstergesi yalnızca “public” için var; özel/seçili varlıklar hiçbir işaret taşımıyor.

**Öneri:** Filtre taksonomisini “Tümü / Herkese açık / Özel / Arşivlenen” olarak yeniden kur; “Arşiv” sayfasını “Medya” veya “Dosyalar” olarak yeniden adlandır. Arama alanına temizleme ve “6 sonuç” bilgisi ekle. Kart meta’sını 12 px’e ve `ink-soft` kontrastına çıkar.

### 3.3 Varlık detayı

**İyi:** Sayfanın omurgası çok sağlam: kapak, künye, sekmeler, “Bugün ne oldu?” oluşturucusu ve yıl bazlı zaman çizelgesi. Kayıt türü ve görünürlük rozetleri, düzenleme eylemi ve fotoğraf önizlemesi aynı yerde. Bu ekran ürünün en olgun yüzeyi.

**Sorunlar:**
- **Veri hatası:** “TÜR” alanında “delice zeytin” yazıyor; tür adı yerine varlık adı basılmış görünüyor.
- “YAŞ 30” birimsiz; 30 yıl mı, 30 gün mü? “2025 Şubat ayı yamadorisi” ile birlikte okununca belirsiz.
- Zaman çizelgesindeki tarih balonları “2 / KAS” şeklinde iki parçalı; aynı gün iki kayıt olduğunda tekrar ediyor. “2 Kas” veya “2 Kasım 2026 · 16:29” gibi tek bir okunabilir etiket daha iyi.
- 20 kayıt sınırı arayüzde hiç görünmüyor; “daha fazla” yok. Uzun geçmişte kullanıcı verinin bittiğini sanabilir.
- “Paylaşım” sekmesi (erişim listesi) ile “Sosyal paylaş” düğmesi aynı sayfada; ikisi de “paylaşım” diyor ama farklı işler yapıyor.
- Düzenleme kalemi 12 px ve düşük kontrastlı; dokunma hedefi küçük.

**Öneri:** Tür alanını düzelt; yaş için birim göster; zaman çizelgesine tarih atlama ve “daha fazla yükle” ekle. “Kişilerle paylaş” (erişim) ile “Sosyal medyada paylaş” (Meta) dilini ayır. Kayıt düzenleme eylemini satır sonundaki belirgin bir menüye taşı.

### 3.4 Gruplar

**İyi:** Arama + kategori filtreleri ve “üyesi olduğun / yeni topluluklar” ayrımı anlaşılır. Grup kartında üye, gönderi ve varlık sayıları var.

**Sorunlar:**
- **Aynı grup iki listede de görünüyor:** “Bitki Günlüğü” hem “Üyesi olduğun gruplar”da hem “Yeni topluluklar”da. Üye olunan grupların önerilerden çıkarılması gerekir.
- Tek sonuç kaldığında sayfanın sağında çok büyük boşluk kalıyor; “1 topluluk · 3 üyelik” bilgisi ve bölüm sayacı “1” sağ kenara savruluyor.
- “Kurucu” rozeti kapak fotoğrafının üzerinde; rol bilgisi içerikle yarışıyor.
- Kart meta’sı 11 px ve soluk; üye/gönderi/varlık sayıları zor okunuyor.
- “Yeni topluluklar” adı “yeni kurulmuş” gibi anlaşılıyor; oysa kastedilen “keşfedilecek topluluklar”.

**Öneri:** Öneri listesinden üye olunan grupları çıkar; boş durumda tek kartı ortala veya yanına “keşfet” önerileri koy. Rol rozetini meta satırına taşı. Bölüm adını “Keşfedilecek topluluklar” yap.

### 3.5 Grup detayı

**İyi:** Kapak + künye + sekmeler + akış + sağ ray kurgusu, topluluk ürünü için doğru. “Gruba bir iz bırak” oluşturucusu metin, fotoğraf ve varlık kaydı kabul ediyor; görünürlük notu var.

**Sorunlar:**
- Kapak 560 px, sağdaki bilgi paneli yaklaşık 300 px; sağ kolonun yarısı boş kalıyor. Görsel denge bozuk.
- “Herkese açık” rozeti kapakta, “Serbest katılım” rozeti bilgi panelinde; aynı karar seti iki yere bölünmüş.
- Aynı işi yapan üç giriş var: “Varlık ekle”, “Varlık paylaş” ve “Gruba bir iz bırak”. Kullanıcı hangisinin ne yaptığını ayırt edemiyor.
- Sağ raydaki “Görünürlük” açıklaması italik serif ve 12 px; düşük kontrastlı. Ürünün en kritik vaadi, en zor okunan metin olmuş.
- “Beğen / Yorum / Grup akışı / Sil” 11 px ve aynı görsel ağırlıkta; “Sil” yıkıcı olduğu halde diğerleriyle aynı.
- “Topluluk” başlığı üyeler için kullanılmış; sekme ise “Üyeler”. Aynı kavram iki adla anılıyor.

**Öneri:** Kapak yüksekliğini içerikle hizala veya sağ panele üyeler/etkinlik ekle. Üç ekleme yolunu “Gönderi paylaş”, “Varlık bağla”, “Kişi davet et” olarak ayır. “Sil”i taşma menüsüne al ve kırmızı ayır. Görünürlük metnini sans-serif, 13–14 px ve yüksek kontrasta çek.

### 3.6 Keşfet

**İyi:** Ürünün en güçlü ekranı. Gönderi → kayıt türü → varlık bağlantısı zinciri net. Sağ raydaki “Hafıza önerileri” ve “Tanış” kartları keşfeti sosyalleştiriyor. “Kendi arşivin” çıkışı iyi düşünülmüş.

**Sorunlar:**
- “Hafıza önerileri **10**” deniyor ama yalnızca 5 öğe listeleniyor; “Tümünü gör” yok. Sayaç ile liste çelişiyor.
- “Tanış” kartında **test kullanıcıları** var (`khkhkhhj`, `hkhkhhjj`), 0 takipçi. Demo verisi canlı ekran görüntüsüne sızmış; güveni düşürüyor.
- Sağ alttaki koyu yeşil not, sabit bir yardım metni olduğu halde “toast/uyarı” gibi duruyor; kapatılamıyor ve akışı bölüyor.
- Feed eylemleri 11 px ve `ink-faint`; “Beğen / Yorum / Herkese açık” metinleri okunmuyor, dokunma hedefleri küçük.
- Akışta tür/kişi/tarih filtresi yok; hafıza tarayıcısı için “sadece dönüm noktaları”, “sadece bakım” gibi filtreler beklenir.
- Gönderi kartları çok uzun; ilk ekranda 2–3 kart görünüyor, hızlı tarama zor.

**Öneri:** Öneri sayacını gerçek listeyle eşle veya “Tümü (10)” bağlantısı ekle. Test verilerini temizle. Sabit notu ilk kullanımda görünen, kapatılabilir bir ipucuna çevir. Akışa tür ve kişi filtresi, kartlara “özet + devamını oku” koy.

### 3.7 Profil

**İyi:** Kimlik bloğu güçlü; avatar, isim, bio ve ilgi etiketleri bir “kişisel hafıza” hissi veriyor. Beş sayaç tek bakışta özet sunuyor. Varlık ızgarası ana sayfayla tutarlı.

**Sorunlar:**
- “5 Paylaşım” sayacı gönderi sayısını gösteriyor; “sosyal paylaşım” ile karışıyor. “Gönderi” daha net olur.
- Takipçi/takip edilen sayaçları tıklanabilir görünmüyor; kullanıcı listeye gitmeyi bekliyor.
- Profilde gönderiler bölümü ilk ekranın altında kalıyor; “varlıklar” tek başına kişinin hafızasını temsil etmiyor. Sekmeler (Varlıklar / İzler / Gruplar) daha taranabilir olur.
- “Hafıza kaydı” ile “Paylaşım” terimleri farklı ekranlarda farklı anlamlarda kullanılıyor.

**Öneri:** Profili sekmeli yapıya çevir; sayaçları tıklanabilir hale getir; “Paylaşım”ı “Gönderi” olarak yeniden adlandır. Bio’nun altına “ilk varlık / son iz” gibi kısa bir zaman bilgisi ekle.

### 3.8 Giriş

**İyi:** Masaüstünde split-screen, mobilde tek sütun; marka manifestosu ile form dengeli. Demo hesap kutusu, yerel geliştirmede tek tıkla oturum açmayı kolaylaştırıyor. Hata mesajı `role="alert"` ile duyuruluyor.

**Sorunlar:**
- “Şifremi unuttum” ve “şifreyi göster” yok; 30 günlük oturum vaadiyle “beni hatırla” beklentisi de belirsiz.
- Demo hesap kutusu üretimde de görünürse güvenlik ve marka açısından risk; ortam değişkeniyle gizlenmeli.
- Form alanları dikeyde çok dar; hata durumunda alan bazlı geri bildirim yok, yalnızca genel hata var.
- Mobil giriş ekranında klavye açıldığında demo kutusu/form dengesi bozulabilir; `100vh` yerine `dvh` ve güvenli alan testi gerekir.

**Öneri:** Şifre görünürlüğü, “beni hatırla” ve parola sıfırlama akışı ekle; demo kutusunu `NODE_ENV=development` ile sınırla. Alan bazlı doğrulama ve odak yönetimi ekle.

### 3.9 Sosyal hesaplar

**İyi:** Teknik olarak eksiksiz bir kurulum rehberi: eksik değişkenler, callback adresi, beş adım ve format açıklamaları net. “Kurulum gerekli” durumu dürüstçe gösteriliyor.

**Sorunlar:**
- Bu ekran bir **yönetici/geliştirici** ekranı; ürünün ana gezinmesinde “Sosyal” olarak duruyor. Normal kullanıcı `META_APP_SECRET`, `SOCIAL_TOKEN_KEY` gibi değişkenlerle karşılaşıyor.
- “Sosyal hesaplar” başlığı 1440 px’te iki satıra kırılıyor; başlık kolonu çok dar, “BAĞLANTILAR” etiketi alta düşüyor.
- “Facebook ile bağlan” devre dışı ama yanında “neden?” bağlantısı yok; açıklama 10–11 px.
- “Henüz bağlantı yok” boş durumu yalnızca italik bir cümle; bir sonraki adım düğmesi yok.
- Adım metinleri ve env değişkenleri 9–10 px; 200% zoom’da okunabilirlik test edilmeli.

**Öneri:** Sosyal kurulumu “Ayarlar → Entegrasyonlar (yönetici)” altına taşı; normal kullanıcıya yalnızca “Hesap bağla” ve durum bilgisini göster. Başlık kolonunu genişlet veya başlığı tek satıra indir. Boş duruma “Facebook hesabını bağla” CTA’sı ekle.

### 3.10 Paylaşım modalı

**İyi:** Sade, odaklı ve markaya uygun. “Meta bağlantısı henüz kurulmadı” durumu açık; “Vazgeç / Kuruluma git” ikilisi doğru.

**Sorunlar:**
- Modal, kullanıcıyı çıkmaz sokağa sokuyor: paylaşım yapılamıyor, tek çıkış “Kuruluma git”. Kullanıcı yönetici değilse bu bağlantı da işe yaramaz.
- Modalda neyin paylaşılacağına dair bir önizleme yok; yalnızca kilit ikonu ve metin var. Formatlar (Gönderi/Hikâye/Reels) ve kapak önizlemesi görünmüyor.
- `SocialShareModal` içinde Escape ve odak tuzağı yok; diğer modallerde Escape var. Odak modala taşınmıyor, kapanınca geri dönmüyor.
- Kilit ikonu sola yaslı, metin ortada; kompozisyon dengesiz. Modalın üst yarısı boş.

**Öneri:** Yapılandırma yoksa “Sosyal paylaş” düğmesini gizle veya “Yakında” durumuna al; modalı yalnızca yapılandırılmış hesaplarda aç. Modalda kapak + platform + format önizlemesi göster. Tüm modallere ortak `Dialog` bileşeni (focus trap, Escape, ilk odak, geri dönüş) ekle.

### 3.11 Android — Panel

**İyi:** “Merhaba, Ada.” + hafıza özeti kartı sıcak ve kişisel. Varlık listesi kapak + tür + kayıt + görünürlük etiketiyle hızlı taranıyor. Alt navigasyonun aktif durumu net.

**Sorunlar:**
- Ana CTA **kil (clay)**, “Yeni varlık” formundaki ana CTA **orman yeşili**. Aynı ürün içinde iki farklı birincil renk var.
- Hafıza kartının sağ üstündeki ve feed kartlarının sağ altındaki **altın nokta** tamamen dekoratif; bildirim/çevrimiçi/görünürlük göstergesi sanılıyor. Yanlış affordance.
- Bildirim zilinde okunmamış sayısı yok.
- Varlık satırlarında sağa ok/chevron yok; satırın tıklanabilir olduğu yalnızca kart görünümünden seziliyor.
- “2 kayıt” ve görünürlük etiketi 10–12 sp; `Muted` rengi açık zeminde 4,1:1.

**Öneri:** Birincil rengi tekilleştir (orman yeşili = ana eylem; kil = vurgu/ikincil). Altın noktaları kaldır veya anlamlı bir duruma bağla (ör. “yeni kayıt var”). Zile okunmamış rozeti ekle. Satırlara chevron ve daha güçlü dokunma durumu ekle.

### 3.12 Android — Varlıklar ve varlık detayı

**İyi:** Liste, arama ve görünürlük etiketleriyle web’den daha okunur. Detayda kapak, künye, “Kayıt ekle” ve zaman çizelgesi aynı sayfada. Kayıt silme için onay dialogu var.

**Sorunlar:**
- “Varlıklar” ekranındaki bölüm etiketi **“ARŞİVİNDEKİ VARLIKLAR”**; ekranın adı “Varlıklar”, ayrıca “Arşiv” diye bir sekme var. Aynı kelime üç anlamda kullanılıyor.
- Kapak üzerindeki başlık ve “Seçili kişiler” metni, açık/busy fotoğraf üzerinde düşük kontrastlı; scrim yetersiz.
- Sekme adı **“Zaman”**, web’de **“Hikâye”**. Aynı içerik, farklı ad.
- Üst barda `+` ve `paylaş` ikonları, altında “Kayıt ekle” ve “Paylaşım” düğmeleri, ayrıca “Paylaşım” sekmesi var; aynı iş için üç giriş.
- Kayıt düzenleme yok; web’de var. Silme ikonu her kaydın sağ üstünde, tarihle aynı hizada; yanlışlıkla dokunmaya açık.
- “Özel” etiketi 12 sp ve soluk; gizlilik bilgisi geri planda.

**Öneri:** Bölüm etiketini “Varlıkların” yap; “Arşiv”i yalnızca medya sayfası için kullan. Kapak metnine güçlü bir gradyan/scrim ekle. Sekme adlarını web ile eşitle (“Hikâye”). Paylaşım girişlerini tek bir yere indir. Kayıt düzenlemeyi ekle; silmeyi taşma menüsüne al.

### 3.13 Android — Yeni varlık / kayıt ekle

**İyi:** Editoryal başlık ve sıcak form dili markayı taşıyor. Görünürlük seçeneklerinin altında “Yalnızca sen görürsün” gibi açıklamalar var. Kapak önizlemesi ve dosya kaldırma desteği mevcut.

**Sorunlar:**
- **Kaydet düğmesi ilk ekranda görünmüyor.** Form `verticalScroll` içinde; “Hafızaya ekle” 190 dp’lik kapak seçicisinin altında kalıyor. Kullanıcı formu doldurup kaydetmeyi bulamıyor.
- Başlık + açıklama + görünürlük + kapak derken form çok uzun; üstteki 300 px’lik editoryal başlık görevi geciktiriyor.
- “Varlık türü” seçimi bir dropdown; ilk kullanımda hangi türün seçileceği belirsiz. Şablonlar (Bitki, Evcil hayvan, Eşya, Mekân) hızlı başlangıç sağlayabilir.
- **Kayıt ekle ekranında tarih/saat alanı yok.** Metin “tarihiyle birlikte kalsın” diyor; ürünün vaadi ile form çelişiyor.
- Kayıt türü çipleri (Not, Fotoğraf, Bakım, Sağlık, Dönüm) dar ekranda sıkışıyor; seçili durum dışında hepsi aynı görsel ağırlıkta.
- Yükleme ilerlemesi/iptal yok (rapordaki M5 bulgusu); büyük dosyada belirsiz bekleme.

**Öneri:** Formun altına **sabit (sticky) kaydet çubuğu** ekle; kaydet her zaman görünür olsun. Kayıt ekle’ye tarih/saat seçici (varsayılan “şimdi”) ve “geçmişe kayıt” kısayolu ekle. Tür seçimini görsel kartlarla ve “en sık kullanılanlar”la kolaylaştır. Yükleme ilerlemesi, iptal ve taslak kaydı ekle.

### 3.14 Android — Arşiv / Keşfet / Profil

**Arşiv:** Görsel ızgarası hoş; arama ve tür filtreleri var. Ancak görsel adları fotoğrafın üzerine beyaz ve scrim’siz basılıyor; açık gökyüzü fotoğrafında okunmuyor. Tarih grubu, dosya türü ikonu ve toplu seçim yok. “6 görsel · 0 belge” özeti “Video” filtresini saymıyor. Fotoğrafa dokununca cihaz görüntüleyicisi açılıyor; uygulama içi büyütme/kaydırma yok. **Öneri:** Alt gradyan ekle; tarih/asset grubu, tür ikonu ve uygulama içi görüntüleyici ekle.

**Keşfet:** Feed temiz; gönderi → varlık bağlantısı korunmuş. Ancak **yorum ikonu tıklanabilir değil** (yalnızca beğeni tıklanabiliyor), altın nokta yine dekoratif, filtre/öneri yok ve “Varlık” etiketi her kartta tekrar ediyor. **Öneri:** Yorumu tıklanabilir yap veya kaldır; altın noktayı kaldır; tür filtresi ve “önerilen kişiler” ekle.

**Profil:** Sayaçlar ve varlık ızgarası iyi. “Arşivini dışa aktar / hesabını sil” için “web sürümünden yapılır” deniyor; mobilde çıkmaz sokak. **Öneri:** Web’e yönlendiren net bir bağlantı/QR ver veya mobilde de temel dışa aktarma sağla. “Paylaşım” yerine “Gönderi” kullan.

---

## 4. Yatay bulgular

### 4.1 Erişilebilirlik ve okunabilirlik (en yaygın sorun)

Ölçülen kontrastlar (yaklaşık; zeminlerde gradyan olduğu için küçük sapmalar olabilir):

| Kullanım | Renk / zemin | Kontrast | Durum |
|---|---|---:|---|
| Web meta metni | `#7C857A` / `#F5F0E6` | **3,37:1** | AA altı |
| Web kart meta | `#7C857A` / `#FBF8F1` | **3,60:1** | AA altı |
| Android ikincil metin | `#6E776F` / `#F6F1E6` | **4,11:1** | AA altı |
| Android ikincil metin (kart) | `#6E776F` / `#FFFCF5` | 4,52:1 | sınırda |
| Android tür etiketi | `#B56242` / `#F6F1E6` | **3,89:1** | AA altı |
| Android ana CTA | beyaz / `#B56242` | **4,38:1** | sınırda/AA altı |
| Android ikon/ikincil | `#8FA08A` / `#F6F1E6` | **2,46:1** | UI bileşeni için bile düşük |
| Sidebar mottosu | %40 beyaz / `#1B2E24` | **3,13:1** | dekoratif ama okunmuyor |
| Web başlık/ana metin | `#F8F3E8` / `#1B2E24` | 12,97:1 | iyi |
| Web `ink-soft` | `#4F5B51` / `#F5F0E6` | 6,27:1 | iyi |

**Boyut sorunu:** Web’de `.detail-meta dt` 0.62 rem (≈9,6 px), `.eyebrow` 0.70 rem (≈10,9 px), `.asset-card-kicker` 0.68 rem (≈10,5 px), `.feed-action` 0.74 rem (≈11,5 px). Android’de `labelSmall` 10 sp + 1 sp harf aralığı, `bodySmall` 12 sp. Bu ölçüler, özellikle Türkçe karakterlerde ve uppercase + geniş harf aralığında okunabilirliği düşürüyor.

**Dokunma hedefleri:** Web filtre çipleri ~29 px, feed eylemleri ~24–30 px, ikon düğmeleri 36 px; Android’de bazı ikon düğmeleri 32 dp. Web’de 44 px, Android’de 48 dp hedeflenmeli.

**Odak ve klavye:** Global `:focus-visible` iyi. Ancak web modallarında ortak odak tuzağı yok; `SocialShareModal` Escape’i dinlemiyor. Skip-link yok. Göz ikonu yalnızca `title` ile anlatılıyor; klavye/screen reader için görünür metin veya `aria-label` gerekli.

**Renk tek başına anlam taşıyor:** Web’de “herkese açık” = göz ikonu, diğerleri = ikon yok. Android’de altın nokta = belirsiz. Renk/ikon tek başına durum anlatmamalı; metin + ikon birlikte kullanılmalı.

**Öneri:** `ink-faint` token’ını koyulaştır (en az 4,5:1), meta boyutunu 12 px/12 sp’nin altına indirme, gövde metnini 14–15 px’te tut, input’ları 16 px yap (iOS zoom’u için). Çip ve eylemlerin dokunma alanını büyüt. Tüm modallere ortak `Dialog` bileşeni ekle. Renk körlüğü ve 200% zoom ile test et.

### 4.2 Tutarlılık ve tasarım sistemi

- **Birincil eylem rengi:** Web’de orman yeşili; Android Panel ve Kayıt ekle’de kil; Yeni varlık’ta orman yeşili. Tek bir kural belirlenmeli.
- **Tipografi:** Web’de Iowan/Palatino serif; Android’de `FontFamily.Serif` (cihaza göre Noto Serif). Marka serif’i Android’e paketlenmezse harf şekilleri ve ritim değişir.
- **Görünürlük göstergesi:** Web kartlarında göz ikonu / boşluk; Android’de metin etiketi; detayda kapak üstünde metin. Üç farklı dil.
- **Sekme/eylem adları:** “Hikâye” vs “Zaman”; “Paylaşım” (gönderi sayısı), “Paylaşım” (erişim sekmesi), “Sosyal paylaş” (Meta); “Topluluk” vs “Üyeler”; “Arşiv” (medya) vs “Arşivde” (durum).
- **Tarih/konum biçimi:** “izmir” ile “İZMİR” aynı üründe; “31 Mart 2026’den beri” ve “2 Kasım 2026” karışık. Tek bir `Intl`/locale kuralı kullanılmalı.
- **Yıkıcı eylemler:** Web’de `window.confirm` (marka dışı, erişilebilirlik açısından zayıf), Android’de AlertDialog. Ortak, stilli onay + geri alma (undo) gerekli.

### 4.3 Bilgi mimarisi ve adlandırma

- **Mobil web navigasyonu eksik:** Alt menüde Hafıza, Varlık, Ekle, Gruplar, Keşfet var; **Arşiv, Bildirimler ve Profil** yok. Profil yalnızca sağ üstteki avatardan; Arşiv yalnızca ana sayfa/profil üzerinden; Bildirimler hiçbir yerden erişilemiyor.
- **“Sosyal” ana navigasyonda:** Bir ayar/entegrasyon sayfası, ürünün ana gezinmesinde “Sosyal” adıyla duruyor. “Ayarlar” veya “Entegrasyonlar” altına alınmalı.
- **Aynı kavram, farklı kelimeler:** “Hafıza kaydı”, “kayıt”, “iz”, “gönderi”; “varlık” ve “parça”; “topluluk” ve “grup”. Bir sözlük (glossary) oluşturulmalı: kullanıcıya görünen terimler tek, teknik terimler ayrı.
- **Filtre taksonomisi:** “Takipte” ve “Arşivde” anlamsal olarak karışık. Varlık için “Herkese açık / Özel / Arşivlenen”; medya için “Görsel / Belge / Video” ayrımı netleştirilmeli.
- **Çıkmaz sokaklar:** Sosyal paylaşım modalı, Android’de web-only dışa aktarma, Keşfet’te 10 öneri sayacına karşı 5 öğe, gruplarda tekrar eden kayıt. Her çıkmazın bir “sonraki adım” bağlantısı olmalı.

### 4.4 Formlar ve durumlar

- **Kaydetme:** Android Yeni varlık’ta kaydet düğmesi ekranın altında; sticky CTA yok. Kayıt ekle’de de benzer şekilde uzun form sonunda düğme var.
- **Tarih:** Kayıt ekle’de tarih/saat yok; hafıza ürünü için kritik.
- **Taslak/otomatik kayıt:** Yok. Uzun formda geri tuşu veya kesinti veri kaybettirir.
- **Yükleme:** Android’de Base64 + sıkıştırma yok (M5); ilerleme/iptal yok. Web’de de büyük dosya için ilerleme deneyimi doğrulanmalı.
- **Doğrulama:** Alan bazlı hata ve odaklanma yok; genel hata kutusu var. Zorunlu alanlar işaretli değil.
- **Boş/hata/yükleme durumları:** Rapor yalnızca birkaç boş durum gösteriyor; skeleton, hata, çevrimdışı ve “sonuç yok” ekranları tasarım denetiminden geçmemiş. Bunlar canlıda en çok görülen ekranlar.
- **Silme:** Onay var; geri alma yok. “Sil” görsel olarak diğer eylemlerden ayrışmıyor.

### 4.5 Güven ve gizlilik algısı

Bu başlık, saf UI sorunlarının önünde:

- Arayüz “Yalnızca ben” / “Seçili kişiler” diyor; R2’ye göre API bu kuralı uygulamıyor. Kullanıcı için bu, **ürünün yalan söylemesi** demek. Ya kural zorunlu kılınmalı ya da bu görünürlük seçenekleri “yakında” olarak işaretlenip kaldırılmalı.
- R1 (`/files/*` yetkisiz erişim) aynı vaadi deliyor; imzalı URL / oturum kontrollü sunum gerekli.
- Görünürlük bilgisi kalıcı, okunur ve bağlamsal olmalı: her varlık/kayıt kartında “Kimler görebilir?” metni; değişiklikte onay; “seçili kişiler” listesini yönetme; denetim izi.
- Silme ve dışa aktarma bir “veri sahipliği” vaadi; Android’de web’e yönlendirmek yerine en azından açıklayıcı bir yol haritası gösterilmeli.
- Demo hesap bilgileri üretimde görünmemeli; test kullanıcıları (`khkhkhhj`) ve demo verileri canlı ekranlardan temizlenmeli.

### 4.6 İçerik ve veri kalitesi

- “TÜR: delice zeytin” — tür alanına varlık adı basılmış.
- “YAŞ 30” — birim yok.
- “izmir” — küçük harf; “İZMİR” ile tutarsız.
- “Bitki Günlüğü” hem üye olunan hem “yeni” grupta.
- Keşfet’te `khkhkhhj` / `hkhkhhjj` gibi test kullanıcıları.
- “2 kayıt” / “12 hafıza kaydı” / “6 iz” / “1 gönderi” — aynı metrik farklı kelimelerle.
- “Hafıza önerileri 10” ama 5 öğe.

Bunlar tek tek küçük görünüyor; birlikte “demo” hissini güçlendiriyor ve ürünün özen algısını düşürüyor. Canlıya çıkmadan önce seed verisi gerçekçi, tutarlı ve **tam** olmalı.

### 4.7 Web–Android parite

| Yetenek | Web | Android | UX etkisi |
|---|---|---|---|
| Gruplar | ✓ | — | Mobil kullanıcı topluluk akışına erişemiyor; bildirim/deep link varsa çıkmaz. |
| Meta paylaşımı | ✓ | — | Mobilde “paylaş” beklentisi karşılanmıyor. |
| Kayıt düzenleme | ✓ | — | Mobilde hata düzeltmek için yeniden kayıt gerekir. |
| Kayıt sayfalama | ✓ (kısmi) | — | Uzun geçmiş mobilde görünmüyor. |
| Çevrimdışı | — | — | Her ekran ağa bağlı; taslak yok. |
| Dışa aktarma/silme | ✓ | yönlendirme | Mobilde “web’e git” çıkmazı. |
| Bildirimler | ✓ | ✓ | Deneyim ve rozet dili farklı. |

**Öneri:** Mobilde olmayan her özellik için ya “web’de yapılır” bağlantısı + açıklama göster ya da özelliği mobilde gizle. Sessizce yok saymak, kullanıcıyı kaybettiriyor.

### 4.8 Raporun kendi kapsamı (kısa not)

Rapor görsel olarak güçlü ve karar verici için iyi düzenlenmiş. Ancak:
- 1440 px ekran görüntüleri sayfada küçültülmüş; 9–10 px metinler baskıda/PDF’de okunmuyor.
- Yalnızca **bir mobil web** ekranı (giriş) var; mobil web paneli, boş durumlar, hata/loading, bildirimler ve ayarlar yok.
- Tablolar 8–9 pt; önemli bulgular için callout/zoom kropler daha etkili olur.
- Erişilebilirlik, klavye, 200% zoom ve ekran okuyucu testleri rapor kapsamında değil.

Sonraki sürüm için öneri: her ekran için “mutlu yol + boş + hata + loading” dörtlüsü, numaralı annotation’lar ve bileşen bazlı 2× kropler.

---

## 5. Önceliklendirilmiş aksiyon planı

### P0 — Yayın öncesi (bu hafta)

1. **Görünürlük/gizlilik vaadini kodla eşleştir.** R2’yi uygula; uygulanana kadar “Seçili kişiler” ve “Yalnızca ben” seçeneklerini “yakında” olarak işaretle veya kaldır. R1 için `/files` yetkisini zorunlu kıl.
2. **Android kayıt ekle’ye tarih/saat alanı ekle.** Varsayılan “şimdi”; geçmişe kayıt ve saat dilimi desteği. Metin ile form çelişkisini gider.
3. **Varlık türü binding hatasını düzelt.** “TÜR” alanı gerçek türü göstersin; “YAŞ” birimli olsun; konum formatı düzeltilsin.
4. **Sosyal paylaşımı yapılandırılana kadar gizle/disable et.** Kurulum ekranını yönetici alanına taşı; normal kullanıcıya çıkmaz modal gösterme.
5. **Okunabilirlik tokenlarını düzelt.** `ink-faint` en az 4,5:1; meta 12 px/12 sp; Android `Muted` ve `Clay` koyulaştır; 10 px uppercase etiketleri azalt.
6. **Yeni varlık formuna sticky kaydet çubuğu ekle.** Kaydet her zaman görünür; doğrulama alan bazlı; taslak koruması.

### P1 — Bu sprint

- Görünürlük göstergesini tekilleştir: web kartlarında metin + ikon, `aria-label`, “Özel / Seçili / Herkese açık”.
- Terim sözlüğü ve navigasyon: “Hikâye/Zaman”, “Arşiv/Medya”, “Kayıt/İz”, “Paylaşım/Gönderi”, “Topluluk/Üyeler”.
- Mobil web alt menüsüne Arşiv, Bildirimler ve Profil erişimi ekle (5. sekme veya “Daha fazla” sayfası).
- Gruplarda üye olunanları önerilerden çıkar; Keşfet’te “Tümünü gör (10)” ekle; test verilerini temizle.
- Silme akışını ortak, stilli onay + undo ile değiştir; “Sil”i tehlike rengiyle ayır.
- Modallere ortak focus trap, Escape, ilk odak ve geri dönüş ekle.
- Android’de yorum eylemini tıklanabilir yap; dekoratif altın noktaları kaldır; birincil rengi tekilleştir; kayıt düzenlemeyi ekle.
- Profil sayaçlarını tıklanabilir yap; “Paylaşım”ı “Gönderi” yap; bildirim ziline okunmamış rozeti ekle.
- Web/Android tarih, konum ve sayı biçimlerini tek locale kuralına bağla.

### P2 — Sonraki sürüm

- Hero’yu kişiselleştir/küçült; tekrar eden sayaçları kaldır; “son hareket” ve “bugün” önceliği.
- Global arama: varlık + kayıt + kişi + grup; son aramalar ve filtreler. Hafıza ürünü için en değerli özelliklerden biri.
- Zaman çizelgesinde yıl/ay atlama, “bu gün” hatırlatmaları, tür filtresi, sonsuz/keyset pagination.
- Şablonlu onboarding (bitki, evcil hayvan, eşya, mekân) ve örnek ilk kayıt.
- Hızlı yakalama: fotoğraftan varlık/kayıt, paylaşım sheet’i, çevrimdışı taslak, yükleme ilerlemesi/iptali.
- Boş, hata, loading, çevrimdışı ve “sonuç yok” durumları için tasarım sistemi.
- Karanlık tema, i18n, ekran okuyucu ve 200% zoom denetimi; axe/Lighthouse CI.
- Ürün analitiği: oluşturma hunisi, ilk kayıt süresi, varlık başına kayıt, paylaşım oranı, 7. gün tutundurma.
- Tasarım sistemi dokümantasyonu: renk/tipografi tokenları, bileşen durumları, erişilebilirlik kuralları, içerik sözlüğü.

---

## 6. Hızlı kazanımlar (1–2 gün)

1. `ink-faint` metinleri `ink-soft`a çek; meta boyutunu 12 px’e çıkar.
2. Web varlık kartlarına “Herkese açık / Seçili / Özel” metni ekle; göz ikonunu `aria-label` ile destekle.
3. Android’deki dekoratif altın noktaları kaldır.
4. “Topluluk” → “Üyeler (3)”; “Paylaşım” (profil) → “Gönderi”.
5. Keşfet’te “Hafıza önerileri 10” yanına “Tümünü gör” ekle; 5 öğe gösteriyorsan sayacı 5 yap.
6. Gruplarda üye olunanları “Yeni topluluklar”dan çıkar.
7. Yeni varlık formuna sticky “Hafızaya ekle” çubuğu ekle.
8. Kayıt ekle’ye “Tarih” alanı ekle (varsayılan bugün).
9. Demo hesap kutusunu ortam değişkeniyle gizle.
10. “TÜR” ve “YAŞ” alanlarını düzelt; “izmir”i “İzmir” yap.
11. Bildirim ziline okunmamış rozeti ekle.
12. `window.confirm` yerine tasarım sistemine uygun onay modalı kullan.

---

## 7. Başarı ölçütleri

**Kullanılabilirlik**
- Kullanıcı 5 dakikada ilk varlığını oluşturabiliyor ve ilk kaydını ekleyebiliyor.
- Geçmiş tarihli kayıt ekleme görevi hatasız tamamlanıyor.
- “Seçili kişilerle paylaş” senaryosu uçtan uca çalışıyor; paylaşılan kişi görüyor, diğerleri görmüyor.
- Keşfet’te bir gönderiden varlığa geçiş ve geri dönüş kaybolmadan yapılabiliyor.
- SOS/SEQ: en az 4/5 memnuniyet; görev tamamlama > %85.

**Erişilebilirlik**
- axe/Lighthouse’ta kritik ihlal 0; tüm metinler AA (4,5:1), büyük metinler 3:1.
- Klavye ile tüm akışlar tamamlanabiliyor; odak görünür ve modal tuzağı doğru.
- 200% zoom ve 320 px genişlikte yatay kaydırma yok.
- Ekran okuyucu ile görünürlük, sayaç ve eylemler doğru okunuyor.

**Güven**
- Yetkisiz `/files` isteği 403.
- Özel varlık, sahibi dışında hiçbir uçtan dönmüyor.
- Kullanıcı “kimler görebilir?” sorusunun yanıtını her ekranda görebiliyor.
- Silme sonrası artık veri kalmıyor; kullanıcıya geri alma veya net onay sunuluyor.

**Ürün**
- Varlık başına kayıt sayısı ve 7. gün tutundurma.
- İlk oturumda oluşturulan varlık oranı.
- Paylaşım (erişim ve Meta) dönüşümü.
- Boş durumdan ilk kayda geçiş süresi.

---

## 8. Ek: Teknik referanslar

- Web renk/tipografi: `web/app/globals.css` (`--ink-faint`, `.eyebrow`, `.asset-card-kicker`, `.detail-meta dt`, `.feed-action`, `.chip`, `.icon-btn`).
- Web varlık kartı ve görünürlük: `web/components/AssetCard.tsx`.
- Web modal: `web/components/SocialShareModal.tsx` (Escape/focus trap yok); `web/components/AssetDetail.tsx` (Escape var).
- Web mobil navigasyon: `web/components/SideNav.tsx` + `AppShell.tsx`.
- Android renk/tipografi: `android/app/src/main/java/app/varlikhafizasi/ui/theme/Theme.kt`.
- Android formlar: `NewAssetScreen.kt` (kaydet düğmesi kapak altında), `AddEntryScreen.kt` (tarih alanı yok).
- Android feed: `ExploreScreen.kt` (dekoratif altın nokta, tıklanamayan yorum).
- Android profil: `ProfileScreen.kt` (dışa aktarma/silme için web’e yönlendirme).

---

*Bu değerlendirme, mevcut ekran görüntüleri ve kod üzerinden yapılmıştır; gerçek kullanıcı davranışı, dönüşüm veya memnuniyet verisi içermez. Bir sonraki adım olarak 5–8 kişilik moderasyonlu kullanılabilirlik testi ve erişilebilirlik denetimi önerilir.*
