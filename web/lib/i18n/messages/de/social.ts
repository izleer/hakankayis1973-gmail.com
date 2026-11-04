const social = {
  // Ayarlar: durum ve bildirim
  'Sosyal servis yüklenemedi': 'Der Social-Dienst konnte nicht geladen werden',
  'API şu anda yanıt vermiyor. Sayfayı yenileyerek tekrar deneyin.':
    'Die API antwortet gerade nicht. Lade die Seite neu und versuche es erneut.',
  'Bu sosyal bağlantı kaldırılsın mı?': 'Soll diese Verbindung entfernt werden?',
  'Bağlantı kaldırılamadı.': 'Die Verbindung konnte nicht entfernt werden.',
  '{count} sosyal hesap bağlandı. Artık varlık detayından paylaşabilirsin.': {
    one: '{count} Social-Konto verbunden. Du kannst jetzt direkt aus dem Objekt teilen.',
    other: '{count} Social-Konten verbunden. Du kannst jetzt direkt aus dem Objekt teilen.',
  },
  'Sosyal bağlantı tamamlanamadı.': 'Die Verbindung konnte nicht hergestellt werden.',
  Kapat: 'Schließen',

  // Bağlantı nedenleri
  'Meta uygulama bilgileri eksik. Aşağıdaki kurulum adımlarını tamamlayın.':
    'Meta-App-Zugangsdaten fehlen. Schließe die Einrichtungsschritte unten ab.',
  'Facebook izin isteği reddedildi. Bağlantı kurulmadı.':
    'Die Facebook-Berechtigungsanfrage wurde abgelehnt. Es wurde keine Verbindung hergestellt.',
  'Facebook Sayfası veya sayfaya bağlı Instagram Business hesabı bulunamadı.':
    'Keine Facebook-Seite oder kein damit verknüpftes Instagram-Business-Konto gefunden.',
  'Bağlantı isteği geçersiz. Lütfen yeniden deneyin.':
    'Die Verbindungsanfrage ist ungültig. Bitte versuche es erneut.',
  'Meta erişim jetonu alınamadı. Uygulama ayarlarını ve izinleri kontrol edin.':
    'Kein Meta-Zugriffstoken erhalten. Prüfe die App-Einstellungen und Berechtigungen.',
  'Meta sunucularına ulaşılamadı. İnternet bağlantınızı kontrol edin.':
    'Die Meta-Server waren nicht erreichbar. Prüfe deine Internetverbindung.',

  // Ayarlar: durum kartı
  'META ENTEGRASYONU': 'META-INTEGRATION',
  'Paylaşım altyapısı hazır': 'Teilen ist bereit',
  'Kurulum birkaç adım uzakta': 'Die Einrichtung ist nur ein paar Schritte entfernt',
  Yapılandırıldı: 'Eingerichtet',
  'Kurulum gerekli': 'Einrichtung nötig',
  'Gerçek Facebook ve Instagram paylaşımı için Meta uygulama bilgileri gerekiyor. Eksik değişkenler:':
    'Für echtes Teilen auf Facebook und Instagram werden Meta-App-Zugangsdaten benötigt. Fehlende Variablen:',
  'Meta uygulaması oluştur.': 'Erstelle eine Meta-App.',
  'Meta for Developers’ta yeni bir uygulama açıp Facebook Login ve Instagram Graph API ürünlerini ekle.':
    'Öffne in Meta for Developers eine neue App und füge die Produkte Facebook Login und Instagram Graph API hinzu.',
  'Dönüş adresini tanımla.': 'Lege die Rücksprungadresse fest.',
  'Facebook Login > Ayarlar bölümüne şu adresi ekle:':
    'Füge diese Adresse unter Facebook Login > Einstellungen hinzu:',
  'API ortamını doldur.': 'Fülle die API-Umgebung.',
  'dosyasına şu değerleri ekle:': 'Datei – füge folgende Werte ein:',
  've en az 16 karakterlik': 'sowie',
  '; API’yi yeniden başlat.':
    ', der mindestens 16 Zeichen lang sein muss; starte danach die API neu.',
  'Sayfa ve Instagram hesabını hazırla.': 'Bereite die Seite und das Instagram-Konto vor.',
  'Facebook Sayfanın olması, Instagram paylaşımı için de sayfaya bağlı bir Instagram Business hesabı gerekiyor.':
    'Du brauchst eine Facebook-Seite und für das Teilen auf Instagram ein damit verknüpftes Instagram-Business-Konto.',
  'Instagram medyasını yayınla.': 'Veröffentliche die Instagram-Medien.',
  'Yerel depolamada': 'Definiere im lokalen Speicher eine öffentliche HTTPS-Adresse mit',
  'ile herkese açık HTTPS adresi tanımla veya S3 depolamaya geç. Facebook paylaşımı bundan etkilenmez.':
    'oder wechsle zu S3-Speicher. Das Teilen auf Facebook ist davon nicht betroffen.',
  'Facebook Sayfanı bağlayarak başla. Sayfaya bağlı Instagram Business hesabı varsa otomatik olarak eklenir. Grafik API sürümü:':
    'Beginne mit dem Verbinden deiner Facebook-Seite. Ist ein Instagram-Business-Konto damit verknüpft, wird es automatisch hinzugefügt. Graph-API-Version:',
  'Instagram paylaşımı için medya adresi henüz herkese açık değil. Facebook gönderi, hikâye ve Reels paylaşımı kullanılabilir.':
    'Die Medienadresse ist noch nicht öffentlich, daher ist Teilen auf Instagram nicht möglich. Beiträge, Storys und Reels lassen sich weiterhin auf Facebook teilen.',
  'Facebook ile bağlan': 'Mit Facebook verbinden',
  'Gerekli izinler: sayfa listesi, sayfa içeriği yönetimi, Instagram içerik yayınlama.':
    'Benötigte Berechtigungen: Seitenliste, Verwaltung von Seiteninhalten, Veröffentlichung von Instagram-Inhalten.',

  // Bağlı hesaplar
  'BAĞLI HESAPLAR': 'VERBUNDENE KONTEN',
  '{count} bağlantı': { one: '{count} Verbindung', other: '{count} Verbindungen' },
  'Henüz bağlantı yok': 'Noch keine Verbindungen',
  'Facebook ile bağlan dediğinde izin verdiğin sayfalar ve varsa bağlı Instagram Business hesapları burada listelenir.':
    'Wenn du auf Mit Facebook verbinden tippst, erscheinen hier die freigegebenen Seiten und eventuell verknüpfte Instagram-Business-Konten.',
  'Facebook Sayfası': 'Facebook-Seite',
  'Instagram Business · {page} sayfasına bağlı': 'Instagram Business · verbunden mit {page}',
  '{date} tarihinde bağlandı': 'Verbunden am {date}',
  'Kaldırılıyor…': 'Wird entfernt…',
  Kaldır: 'Entfernen',

  // Paylaşım biçimleri
  'PAYLAŞIM BİÇİMLERİ': 'FORMATE ZUM TEILEN',
  'Hikâye paylaşımı': 'Story-Beitrag',
  'Facebook Sayfasında fotoğraf veya video gönderisi.':
    'Ein Foto- oder Videobeitrag auf deiner Facebook-Seite.',
  'Kapak fotoğrafı 24 saatlik hikâye olarak paylaşılır.':
    'Das Titelbild wird als 24-stündige Story geteilt.',
  'Varlığa bağlı videolar dikey Reels olarak yayınlanır.':
    'Mit dem Objekt verknüpfte Videos werden als vertikale Reels veröffentlicht.',

  // Paylaşım modalı
  'Bağlantılar yüklenemedi.': 'Verbindungen konnten nicht geladen werden.',
  'Paylaşım tamamlanamadı.': 'Der Beitrag konnte nicht geteilt werden.',
  'Sosyal medyada paylaş': 'In sozialen Netzwerken teilen',
  'SOSYAL PAYLAŞIM': 'SOZIALES TEILEN',
  'Sosyal hesaplar yükleniyor…': 'Social-Konten werden geladen…',
  'Hikâye 24 saat boyunca görünür kalacak.': 'Die Story bleibt 24 Stunden lang sichtbar.',
  'Paylaşımın hesabında yayında.': 'Dein Beitrag ist jetzt in deinem Konto online.',
  'Paylaşımı aç': 'Beitrag öffnen',
  'Meta bağlantısı henüz kurulmadı': 'Die Meta-Verbindung ist noch nicht eingerichtet',
  'Facebook ve Instagram paylaşımı için uygulama anahtarlarını ekleyip bir sayfa bağlaman gerekiyor.':
    'Um auf Facebook und Instagram zu teilen, hinterlege die App-Schlüssel und verbinde eine Seite.',
  'Kuruluma git': 'Zur Einrichtung',
  'Henüz bağlı hesap yok': 'Noch kein Konto verbunden',
  'Facebook Sayfanı ve varsa ona bağlı Instagram Business hesabını bağlayarak paylaşmaya başlayabilirsin.':
    'Verbinde deine Facebook-Seite — und falls vorhanden ihr Instagram-Business-Konto —, um mit dem Teilen zu beginnen.',
  'Hesap bağla': 'Konto verbinden',
  'Sosyal hesap': 'Social-Konto',
  '{page} sayfası': '{page}-Seite',
  'Paylaşım biçimi': 'Beitragsformat',
  'Kapak fotoğrafıyla hikâye': 'Story mit Titelbild',
  'Hikâye, varlığın kapak fotoğrafı kullanılarak paylaşılır.':
    'Die Story wird mit dem Titelbild des Objekts geteilt.',
  'Kapak yoksa en yeni görsel kullanılır.':
    'Gibt es kein Titelbild, wird das neueste Bild verwendet.',
  Video: 'Video',
  'Bu varlıkta Reels için video yok. Varlık detayından bir video ekleyebilirsin.':
    'Dieses Objekt hat kein Video für Reels. Du kannst auf der Objektseite eines hinzufügen.',
  'En yeni video': 'Neuestes Video',
  Görsel: 'Bild',
  Kapak: 'Titelbild',
  'Paylaşmak için varlığa bir görsel ekleyin.':
    'Füge dem Objekt ein Bild hinzu, um es zu teilen.',
  'Paylaşıma eşlik edecek not…': 'Eine Notiz zu deinem Beitrag…',
  'Instagram paylaşımı için medya adresinin herkese açık HTTPS olması gerekiyor. Ayarlar sayfasındaki kurulum adımlarına bak.':
    'Für das Teilen auf Instagram muss die Medienadresse öffentlich über HTTPS erreichbar sein. Sieh dir die Einrichtungsschritte auf der Einstellungsseite an.',
  'Instagram gönderileri fotoğraf olarak yayınlanır; videolar için Reels biçimini seç.':
    'Instagram-Beiträge werden als Fotos veröffentlicht; wähle für Videos das Reels-Format.',
  'Paylaşılıyor…': 'Wird geteilt…',
  'Gönderi olarak paylaş': 'Als Beitrag teilen',
  'Hikâye olarak paylaş': 'Als Story teilen',
  'Reels olarak paylaş': 'Als Reels teilen',
  '{provider} gönderi olarak paylaşıldı.': 'Auf {provider} als Beitrag geteilt.',
  '{provider} hikâye olarak paylaşıldı.': 'Auf {provider} als Story geteilt.',
  '{provider} Reels olarak paylaşıldı.': 'Auf {provider} als Reels geteilt.',
  '{provider} gönderi yayınlandı': '{provider}-Beitrag ist online',
  '{provider} hikâye yayınlandı': '{provider}-Story ist online',
  '{provider} Reels yayınlandı': '{provider}-Reels sind online',

  // Sayfa
  'Sosyal hesaplar': 'Social-Konten',
  'BAĞLANTILAR': 'VERBINDUNGEN',
  'Varlıklarını Facebook Sayfanda ve Instagram Business hesabında gönderi, hikâye veya Reels olarak paylaş. Varlık sahipliğin ve gizlilik ayarların değişmez; yalnızca seçtiğin anı dışarı taşırsın.':
    'Teile deine Objekte als Beitrag, Story oder Reels auf deiner Facebook-Seite und deinem Instagram-Business-Konto. Eigentum und Privatsphäre-Einstellungen bleiben unverändert; du trägst nur den Moment nach außen, den du wählst.',
} as const;

export default social;
