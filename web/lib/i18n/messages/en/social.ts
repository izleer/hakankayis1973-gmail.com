const social = {
  // Ayarlar: durum ve bildirim
  'Sosyal servis yüklenemedi': 'The social service could not be loaded',
  'API şu anda yanıt vermiyor. Sayfayı yenileyerek tekrar deneyin.':
    'The API is not responding right now. Refresh the page and try again.',
  'Bu sosyal bağlantı kaldırılsın mı?': 'Remove this social connection?',
  'Bağlantı kaldırılamadı.': 'The connection could not be removed.',
  '{count} sosyal hesap bağlandı. Artık varlık detayından paylaşabilirsin.': {
    one: '{count} social account connected. You can now share from the asset page.',
    other: '{count} social accounts connected. You can now share from the asset page.',
  },
  'Sosyal bağlantı tamamlanamadı.': 'The social connection could not be completed.',
  Kapat: 'Close',

  // Bağlantı nedenleri
  'Meta uygulama bilgileri eksik. Aşağıdaki kurulum adımlarını tamamlayın.':
    'Meta app credentials are missing. Complete the setup steps below.',
  'Facebook izin isteği reddedildi. Bağlantı kurulmadı.':
    'The Facebook permission request was declined. No connection was made.',
  'Facebook Sayfası veya sayfaya bağlı Instagram Business hesabı bulunamadı.':
    'No Facebook Page, or Instagram Business account linked to a Page, was found.',
  'Bağlantı isteği geçersiz. Lütfen yeniden deneyin.':
    'The connection request is invalid. Please try again.',
  'Meta erişim jetonu alınamadı. Uygulama ayarlarını ve izinleri kontrol edin.':
    'Could not obtain a Meta access token. Check the app settings and permissions.',
  'Meta sunucularına ulaşılamadı. İnternet bağlantınızı kontrol edin.':
    'Meta servers could not be reached. Check your internet connection.',

  // Ayarlar: durum kartı
  'META ENTEGRASYONU': 'META INTEGRATION',
  'Paylaşım altyapısı hazır': 'Sharing is ready',
  'Kurulum birkaç adım uzakta': 'Setup is a few steps away',
  Yapılandırıldı: 'Configured',
  'Kurulum gerekli': 'Setup required',
  'Gerçek Facebook ve Instagram paylaşımı için Meta uygulama bilgileri gerekiyor. Eksik değişkenler:':
    'Real Facebook and Instagram sharing requires Meta app credentials. Missing variables:',
  'Meta uygulaması oluştur.': 'Create a Meta app.',
  'Meta for Developers’ta yeni bir uygulama açıp Facebook Login ve Instagram Graph API ürünlerini ekle.':
    'Open a new app in Meta for Developers and add the Facebook Login and Instagram Graph API products.',
  'Dönüş adresini tanımla.': 'Set the redirect address.',
  'Facebook Login > Ayarlar bölümüne şu adresi ekle:':
    'Add this address under Facebook Login > Settings:',
  'API ortamını doldur.': 'Fill in the API environment.',
  'dosyasına şu değerleri ekle:': 'file — add the following values:',
  've en az 16 karakterlik': 'plus',
  '; API’yi yeniden başlat.':
    ', which must be at least 16 characters long; then restart the API.',
  'Sayfa ve Instagram hesabını hazırla.': 'Prepare the Page and Instagram account.',
  'Facebook Sayfanın olması, Instagram paylaşımı için de sayfaya bağlı bir Instagram Business hesabı gerekiyor.':
    'You need a Facebook Page, and for Instagram sharing, an Instagram Business account linked to that Page.',
  'Instagram medyasını yayınla.': 'Publish the Instagram media.',
  'Yerel depolamada': 'In local storage, define a public HTTPS address with',
  'ile herkese açık HTTPS adresi tanımla veya S3 depolamaya geç. Facebook paylaşımı bundan etkilenmez.':
    'or switch to S3 storage. Facebook sharing is unaffected.',
  'Facebook Sayfanı bağlayarak başla. Sayfaya bağlı Instagram Business hesabı varsa otomatik olarak eklenir. Grafik API sürümü:':
    'Start by connecting your Facebook Page. If it has a linked Instagram Business account, it is added automatically. Graph API version:',
  'Instagram paylaşımı için medya adresi henüz herkese açık değil. Facebook gönderi, hikâye ve Reels paylaşımı kullanılabilir.':
    'The media address is not public yet, so Instagram sharing is unavailable. Facebook post, story and Reels sharing still work.',
  'Facebook ile bağlan': 'Connect with Facebook',
  'Gerekli izinler: sayfa listesi, sayfa içeriği yönetimi, Instagram içerik yayınlama.':
    'Required permissions: page list, page content management, Instagram content publishing.',

  // Bağlı hesaplar
  'BAĞLI HESAPLAR': 'CONNECTED ACCOUNTS',
  '{count} bağlantı': { one: '{count} connection', other: '{count} connections' },
  'Henüz bağlantı yok': 'No connections yet',
  'Facebook ile bağlan dediğinde izin verdiğin sayfalar ve varsa bağlı Instagram Business hesapları burada listelenir.':
    'When you choose Connect with Facebook, the pages you allow and any linked Instagram Business accounts are listed here.',
  'Facebook Sayfası': 'Facebook Page',
  'Instagram Business · {page} sayfasına bağlı': 'Instagram Business · linked to {page}',
  '{date} tarihinde bağlandı': 'Connected on {date}',
  'Kaldırılıyor…': 'Removing…',
  Kaldır: 'Remove',

  // Paylaşım biçimleri
  'PAYLAŞIM BİÇİMLERİ': 'SHARE FORMATS',
  'Hikâye paylaşımı': 'Story share',
  'Facebook Sayfasında fotoğraf veya video gönderisi.':
    'A photo or video post on your Facebook Page.',
  'Kapak fotoğrafı 24 saatlik hikâye olarak paylaşılır.':
    'The cover photo is shared as a 24-hour story.',
  'Varlığa bağlı videolar dikey Reels olarak yayınlanır.':
    'Videos attached to the asset are published as vertical Reels.',

  // Paylaşım modalı
  'Bağlantılar yüklenemedi.': 'Connections could not be loaded.',
  'Paylaşım tamamlanamadı.': 'The share could not be completed.',
  'Sosyal medyada paylaş': 'Share on social media',
  'SOSYAL PAYLAŞIM': 'SOCIAL SHARING',
  'Sosyal hesaplar yükleniyor…': 'Loading social accounts…',
  'Hikâye 24 saat boyunca görünür kalacak.': 'The story will stay visible for 24 hours.',
  'Paylaşımın hesabında yayında.': 'Your post is live on your account.',
  'Paylaşımı aç': 'Open the post',
  'Meta bağlantısı henüz kurulmadı': 'The Meta connection is not set up yet',
  'Facebook ve Instagram paylaşımı için uygulama anahtarlarını ekleyip bir sayfa bağlaman gerekiyor.':
    'To share on Facebook and Instagram, add the app keys and connect a page.',
  'Kuruluma git': 'Go to setup',
  'Henüz bağlı hesap yok': 'No account connected yet',
  'Facebook Sayfanı ve varsa ona bağlı Instagram Business hesabını bağlayarak paylaşmaya başlayabilirsin.':
    'Connect your Facebook Page — and its Instagram Business account, if there is one — to start sharing.',
  'Hesap bağla': 'Connect account',
  'Sosyal hesap': 'Social account',
  '{page} sayfası': '{page} page',
  'Paylaşım biçimi': 'Share format',
  'Kapak fotoğrafıyla hikâye': 'Story with cover photo',
  'Hikâye, varlığın kapak fotoğrafı kullanılarak paylaşılır.':
    'The story is shared using the asset’s cover photo.',
  'Kapak yoksa en yeni görsel kullanılır.': 'If there is no cover, the newest image is used.',
  Video: 'Video',
  'Bu varlıkta Reels için video yok. Varlık detayından bir video ekleyebilirsin.':
    'This asset has no video for Reels. You can add one from the asset page.',
  'En yeni video': 'Newest video',
  Görsel: 'Image',
  Kapak: 'Cover',
  'Paylaşmak için varlığa bir görsel ekleyin.': 'Add an image to the asset to share it.',
  'Paylaşıma eşlik edecek not…': 'A note to go with your post…',
  'Instagram paylaşımı için medya adresinin herkese açık HTTPS olması gerekiyor. Ayarlar sayfasındaki kurulum adımlarına bak.':
    'Instagram sharing needs a publicly reachable HTTPS media address. See the setup steps on the settings page.',
  'Instagram gönderileri fotoğraf olarak yayınlanır; videolar için Reels biçimini seç.':
    'Instagram posts are published as photos; choose the Reels format for videos.',
  'Paylaşılıyor…': 'Sharing…',
  'Gönderi olarak paylaş': 'Share as post',
  'Hikâye olarak paylaş': 'Share as story',
  'Reels olarak paylaş': 'Share as Reels',
  '{provider} gönderi olarak paylaşıldı.': 'Shared on {provider} as a post.',
  '{provider} hikâye olarak paylaşıldı.': 'Shared on {provider} as a story.',
  '{provider} Reels olarak paylaşıldı.': 'Shared on {provider} as Reels.',
  '{provider} gönderi yayınlandı': '{provider} post is live',
  '{provider} hikâye yayınlandı': '{provider} story is live',
  '{provider} Reels yayınlandı': '{provider} Reels are live',

  // Sayfa
  'Sosyal hesaplar': 'Social accounts',
  'BAĞLANTILAR': 'CONNECTIONS',
  'Varlıklarını Facebook Sayfanda ve Instagram Business hesabında gönderi, hikâye veya Reels olarak paylaş. Varlık sahipliğin ve gizlilik ayarların değişmez; yalnızca seçtiğin anı dışarı taşırsın.':
    'Share your assets as posts, stories or Reels on your Facebook Page and Instagram Business account. Ownership and privacy settings stay as they are; you only carry the moment you choose out into the world.',
} as const;

export default social;
