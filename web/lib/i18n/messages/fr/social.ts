const social = {
  // Ayarlar: durum ve bildirim
  'Sosyal servis yüklenemedi': 'Le service de partage n’a pas pu être chargé',
  'API şu anda yanıt vermiyor. Sayfayı yenileyerek tekrar deneyin.':
    'L’API ne répond pas pour le moment. Actualisez la page et réessayez.',
  'Bu sosyal bağlantı kaldırılsın mı?': 'Supprimer cette connexion sociale ?',
  'Bağlantı kaldırılamadı.': 'La connexion n’a pas pu être supprimée.',
  '{count} sosyal hesap bağlandı. Artık varlık detayından paylaşabilirsin.': {
    one: '{count} compte social connecté. Vous pouvez désormais partager depuis la page de l’objet.',
    other:
      '{count} comptes sociaux connectés. Vous pouvez désormais partager depuis la page de l’objet.',
  },
  'Sosyal bağlantı tamamlanamadı.': 'La connexion sociale n’a pas pu être établie.',
  Kapat: 'Fermer',

  // Bağlantı nedenleri
  'Meta uygulama bilgileri eksik. Aşağıdaki kurulum adımlarını tamamlayın.':
    'Les identifiants de l’application Meta sont manquants. Terminez les étapes de configuration ci-dessous.',
  'Facebook izin isteği reddedildi. Bağlantı kurulmadı.':
    'La demande d’autorisation Facebook a été refusée. Aucune connexion n’a été établie.',
  'Facebook Sayfası veya sayfaya bağlı Instagram Business hesabı bulunamadı.':
    'Aucune Page Facebook, ni compte Instagram Business qui y soit lié, n’a été trouvé.',
  'Bağlantı isteği geçersiz. Lütfen yeniden deneyin.':
    'La demande de connexion n’est pas valide. Veuillez réessayer.',
  'Meta erişim jetonu alınamadı. Uygulama ayarlarını ve izinleri kontrol edin.':
    'Impossible d’obtenir un jeton d’accès Meta. Vérifiez les réglages de l’application et les autorisations.',
  'Meta sunucularına ulaşılamadı. İnternet bağlantınızı kontrol edin.':
    'Les serveurs Meta sont injoignables. Vérifiez votre connexion Internet.',

  // Ayarlar: durum kartı
  'META ENTEGRASYONU': 'INTÉGRATION META',
  'Paylaşım altyapısı hazır': 'Le partage est prêt',
  'Kurulum birkaç adım uzakta': 'La configuration est à quelques étapes',
  Yapılandırıldı: 'Configuré',
  'Kurulum gerekli': 'Configuration requise',
  'Gerçek Facebook ve Instagram paylaşımı için Meta uygulama bilgileri gerekiyor. Eksik değişkenler:':
    'Le partage réel sur Facebook et Instagram nécessite les identifiants de l’application Meta. Variables manquantes :',
  'Meta uygulaması oluştur.': 'Créez une application Meta.',
  'Meta for Developers’ta yeni bir uygulama açıp Facebook Login ve Instagram Graph API ürünlerini ekle.':
    'Ouvrez une nouvelle application dans Meta for Developers et ajoutez les produits Facebook Login et Instagram Graph API.',
  'Dönüş adresini tanımla.': 'Définissez l’adresse de retour.',
  'Facebook Login > Ayarlar bölümüne şu adresi ekle:':
    'Ajoutez cette adresse dans Facebook Login > Paramètres :',
  'API ortamını doldur.': 'Remplissez l’environnement de l’API.',
  'dosyasına şu değerleri ekle:': 'fichier, ajoutez les valeurs suivantes :',
  've en az 16 karakterlik': 'ainsi que',
  '; API’yi yeniden başlat.':
    ', qui doit compter au moins 16 caractères ; redémarrez ensuite l’API.',
  'Sayfa ve Instagram hesabını hazırla.': 'Préparez la Page et le compte Instagram.',
  'Facebook Sayfanın olması, Instagram paylaşımı için de sayfaya bağlı bir Instagram Business hesabı gerekiyor.':
    'Il vous faut une Page Facebook et, pour le partage sur Instagram, un compte Instagram Business qui y soit lié.',
  'Instagram medyasını yayınla.': 'Publiez les médias Instagram.',
  'Yerel depolamada': 'Dans le stockage local, définissez une adresse HTTPS publique avec',
  'ile herkese açık HTTPS adresi tanımla veya S3 depolamaya geç. Facebook paylaşımı bundan etkilenmez.':
    'ou passez au stockage S3. Le partage sur Facebook n’en est pas affecté.',
  'Facebook Sayfanı bağlayarak başla. Sayfaya bağlı Instagram Business hesabı varsa otomatik olarak eklenir. Grafik API sürümü:':
    'Commencez par connecter votre Page Facebook. Si un compte Instagram Business y est lié, il est ajouté automatiquement. Version de l’API Graph :',
  'Instagram paylaşımı için medya adresi henüz herkese açık değil. Facebook gönderi, hikâye ve Reels paylaşımı kullanılabilir.':
    'L’adresse des médias n’est pas encore publique : le partage sur Instagram est indisponible. Le partage de publications, stories et Reels sur Facebook reste possible.',
  'Facebook ile bağlan': 'Se connecter avec Facebook',
  'Gerekli izinler: sayfa listesi, sayfa içeriği yönetimi, Instagram içerik yayınlama.':
    'Autorisations requises : liste des Pages, gestion du contenu des Pages, publication de contenu Instagram.',

  // Bağlı hesaplar
  'BAĞLI HESAPLAR': 'COMPTES CONNECTÉS',
  '{count} bağlantı': { one: '{count} connexion', other: '{count} connexions' },
  'Henüz bağlantı yok': 'Aucune connexion pour le moment',
  'Facebook ile bağlan dediğinde izin verdiğin sayfalar ve varsa bağlı Instagram Business hesapları burada listelenir.':
    'Lorsque vous choisissez Se connecter avec Facebook, les Pages que vous autorisez et les éventuels comptes Instagram Business liés apparaissent ici.',
  'Facebook Sayfası': 'Page Facebook',
  'Instagram Business · {page} sayfasına bağlı': 'Instagram Business · lié à {page}',
  '{date} tarihinde bağlandı': 'Connecté le {date}',
  'Kaldırılıyor…': 'Suppression…',
  Kaldır: 'Retirer',

  // Paylaşım biçimleri
  'PAYLAŞIM BİÇİMLERİ': 'FORMATS DE PARTAGE',
  'Hikâye paylaşımı': 'Partage de story',
  'Facebook Sayfasında fotoğraf veya video gönderisi.':
    'Une publication photo ou vidéo sur votre Page Facebook.',
  'Kapak fotoğrafı 24 saatlik hikâye olarak paylaşılır.':
    'La photo de couverture est partagée en story de 24 heures.',
  'Varlığa bağlı videolar dikey Reels olarak yayınlanır.':
    'Les vidéos liées à l’objet sont publiées en Reels verticaux.',

  // Paylaşım modalı
  'Bağlantılar yüklenemedi.': 'Les connexions n’ont pas pu être chargées.',
  'Paylaşım tamamlanamadı.': 'Le partage n’a pas pu être effectué.',
  'Sosyal medyada paylaş': 'Partager sur les réseaux sociaux',
  'SOSYAL PAYLAŞIM': 'PARTAGE SOCIAL',
  'Sosyal hesaplar yükleniyor…': 'Chargement des comptes sociaux…',
  'Hikâye 24 saat boyunca görünür kalacak.': 'La story restera visible pendant 24 heures.',
  'Paylaşımın hesabında yayında.': 'Votre publication est en ligne sur votre compte.',
  'Paylaşımı aç': 'Ouvrir la publication',
  'Meta bağlantısı henüz kurulmadı': 'La connexion Meta n’est pas encore configurée',
  'Facebook ve Instagram paylaşımı için uygulama anahtarlarını ekleyip bir sayfa bağlaman gerekiyor.':
    'Pour partager sur Facebook et Instagram, ajoutez les clés de l’application et connectez une Page.',
  'Kuruluma git': 'Aller à la configuration',
  'Henüz bağlı hesap yok': 'Aucun compte connecté pour le moment',
  'Facebook Sayfanı ve varsa ona bağlı Instagram Business hesabını bağlayarak paylaşmaya başlayabilirsin.':
    'Connectez votre Page Facebook — et son compte Instagram Business s’il existe — pour commencer à partager.',
  'Hesap bağla': 'Connecter un compte',
  'Sosyal hesap': 'Compte social',
  '{page} sayfası': 'Page {page}',
  'Paylaşım biçimi': 'Format de partage',
  'Kapak fotoğrafıyla hikâye': 'Story avec photo de couverture',
  'Hikâye, varlığın kapak fotoğrafı kullanılarak paylaşılır.':
    'La story est partagée à partir de la photo de couverture de l’objet.',
  'Kapak yoksa en yeni görsel kullanılır.':
    'S’il n’y a pas de couverture, l’image la plus récente est utilisée.',
  Video: 'Vidéo',
  'Bu varlıkta Reels için video yok. Varlık detayından bir video ekleyebilirsin.':
    'Cet objet n’a pas de vidéo pour les Reels. Vous pouvez en ajouter une depuis la page de l’objet.',
  'En yeni video': 'Vidéo la plus récente',
  Görsel: 'Image',
  Kapak: 'Couverture',
  'Paylaşmak için varlığa bir görsel ekleyin.':
    'Ajoutez une image à l’objet pour pouvoir le partager.',
  'Paylaşıma eşlik edecek not…': 'Une note pour accompagner la publication…',
  'Instagram paylaşımı için medya adresinin herkese açık HTTPS olması gerekiyor. Ayarlar sayfasındaki kurulum adımlarına bak.':
    'Le partage sur Instagram nécessite une adresse de médias publique en HTTPS. Consultez les étapes de configuration sur la page des réglages.',
  'Instagram gönderileri fotoğraf olarak yayınlanır; videolar için Reels biçimini seç.':
    'Les publications Instagram sont diffusées sous forme de photos ; pour les vidéos, choisissez le format Reels.',
  'Paylaşılıyor…': 'Partage en cours…',
  'Gönderi olarak paylaş': 'Partager en publication',
  'Hikâye olarak paylaş': 'Partager en story',
  'Reels olarak paylaş': 'Partager en Reels',
  '{provider} gönderi olarak paylaşıldı.': 'Partagé sur {provider} en tant que publication.',
  '{provider} hikâye olarak paylaşıldı.': 'Partagé sur {provider} en tant que story.',
  '{provider} Reels olarak paylaşıldı.': 'Partagé sur {provider} en Reels.',
  '{provider} gönderi yayınlandı': 'Publication en ligne sur {provider}',
  '{provider} hikâye yayınlandı': 'Story en ligne sur {provider}',
  '{provider} Reels yayınlandı': 'Reels en ligne sur {provider}',

  // Sayfa
  'Sosyal hesaplar': 'Comptes sociaux',
  'BAĞLANTILAR': 'CONNEXIONS',
  'Varlıklarını Facebook Sayfanda ve Instagram Business hesabında gönderi, hikâye veya Reels olarak paylaş. Varlık sahipliğin ve gizlilik ayarların değişmez; yalnızca seçtiğin anı dışarı taşırsın.':
    'Partagez vos objets en publication, story ou Reels sur votre Page Facebook et votre compte Instagram Business. La propriété et vos réglages de confidentialité ne changent pas ; vous ne faites sortir que le moment que vous choisissez.',
} as const;

export default social;
