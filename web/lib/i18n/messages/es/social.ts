const social = {
  // Ayarlar: durum ve bildirim
  'Sosyal servis yüklenemedi': 'El servicio de publicación no se pudo cargar',
  'API şu anda yanıt vermiyor. Sayfayı yenileyerek tekrar deneyin.':
    'La API no responde en este momento. Actualiza la página e inténtalo de nuevo.',
  'Bu sosyal bağlantı kaldırılsın mı?': '¿Eliminar esta conexión social?',
  'Bağlantı kaldırılamadı.': 'No se pudo eliminar la conexión.',
  '{count} sosyal hesap bağlandı. Artık varlık detayından paylaşabilirsin.': {
    one: '{count} cuenta social conectada. Ya puedes compartir desde la página del objeto.',
    other: '{count} cuentas sociales conectadas. Ya puedes compartir desde la página del objeto.',
  },
  'Sosyal bağlantı tamamlanamadı.': 'No se pudo completar la conexión social.',
  Kapat: 'Cerrar',

  // Bağlantı nedenleri
  'Meta uygulama bilgileri eksik. Aşağıdaki kurulum adımlarını tamamlayın.':
    'Faltan las credenciales de la aplicación de Meta. Completa los pasos de configuración de abajo.',
  'Facebook izin isteği reddedildi. Bağlantı kurulmadı.':
    'Se rechazó la solicitud de permiso de Facebook. No se estableció la conexión.',
  'Facebook Sayfası veya sayfaya bağlı Instagram Business hesabı bulunamadı.':
    'No se encontró ninguna Página de Facebook ni una cuenta de Instagram Business vinculada a ella.',
  'Bağlantı isteği geçersiz. Lütfen yeniden deneyin.':
    'La solicitud de conexión no es válida. Inténtalo de nuevo.',
  'Meta erişim jetonu alınamadı. Uygulama ayarlarını ve izinleri kontrol edin.':
    'No se pudo obtener el token de acceso de Meta. Revisa la configuración de la aplicación y los permisos.',
  'Meta sunucularına ulaşılamadı. İnternet bağlantınızı kontrol edin.':
    'No se pudo contactar con los servidores de Meta. Revisa tu conexión a internet.',

  // Ayarlar: durum kartı
  'META ENTEGRASYONU': 'INTEGRACIÓN CON META',
  'Paylaşım altyapısı hazır': 'Todo listo para compartir',
  'Kurulum birkaç adım uzakta': 'La configuración está a unos pocos pasos',
  Yapılandırıldı: 'Configurado',
  'Kurulum gerekli': 'Configuración necesaria',
  'Gerçek Facebook ve Instagram paylaşımı için Meta uygulama bilgileri gerekiyor. Eksik değişkenler:':
    'Para compartir de verdad en Facebook e Instagram hacen falta las credenciales de la aplicación de Meta. Variables que faltan:',
  'Meta uygulaması oluştur.': 'Crea una aplicación de Meta.',
  'Meta for Developers’ta yeni bir uygulama açıp Facebook Login ve Instagram Graph API ürünlerini ekle.':
    'Abre una nueva aplicación en Meta for Developers y añade los productos Facebook Login e Instagram Graph API.',
  'Dönüş adresini tanımla.': 'Define la dirección de retorno.',
  'Facebook Login > Ayarlar bölümüne şu adresi ekle:':
    'Añade esta dirección en Facebook Login > Configuración:',
  'API ortamını doldur.': 'Completa el entorno de la API.',
  'dosyasına şu değerleri ekle:': 'archivo: añade los siguientes valores:',
  've en az 16 karakterlik': 'y',
  '; API’yi yeniden başlat.':
    ', que debe tener al menos 16 caracteres; después, reinicia la API.',
  'Sayfa ve Instagram hesabını hazırla.': 'Prepara la Página y la cuenta de Instagram.',
  'Facebook Sayfanın olması, Instagram paylaşımı için de sayfaya bağlı bir Instagram Business hesabı gerekiyor.':
    'Necesitas una Página de Facebook y, para compartir en Instagram, una cuenta de Instagram Business vinculada a ella.',
  'Instagram medyasını yayınla.': 'Publica los medios de Instagram.',
  'Yerel depolamada': 'En el almacenamiento local, define una dirección HTTPS pública con',
  'ile herkese açık HTTPS adresi tanımla veya S3 depolamaya geç. Facebook paylaşımı bundan etkilenmez.':
    'o cambia al almacenamiento S3. Compartir en Facebook no se ve afectado.',
  'Facebook Sayfanı bağlayarak başla. Sayfaya bağlı Instagram Business hesabı varsa otomatik olarak eklenir. Grafik API sürümü:':
    'Empieza conectando tu Página de Facebook. Si tiene una cuenta de Instagram Business vinculada, se añade automáticamente. Versión de la API Graph:',
  'Instagram paylaşımı için medya adresi henüz herkese açık değil. Facebook gönderi, hikâye ve Reels paylaşımı kullanılabilir.':
    'La dirección de los medios aún no es pública, así que no se puede compartir en Instagram. Compartir publicaciones, historias y Reels en Facebook sigue disponible.',
  'Facebook ile bağlan': 'Conectar con Facebook',
  'Gerekli izinler: sayfa listesi, sayfa içeriği yönetimi, Instagram içerik yayınlama.':
    'Permisos necesarios: lista de Páginas, gestión del contenido de Páginas, publicación de contenido de Instagram.',

  // Bağlı hesaplar
  'BAĞLI HESAPLAR': 'CUENTAS CONECTADAS',
  '{count} bağlantı': { one: '{count} conexión', other: '{count} conexiones' },
  'Henüz bağlantı yok': 'Aún no hay conexiones',
  'Facebook ile bağlan dediğinde izin verdiğin sayfalar ve varsa bağlı Instagram Business hesapları burada listelenir.':
    'Cuando elijas Conectar con Facebook, aquí aparecerán las Páginas que autorices y las cuentas de Instagram Business vinculadas, si las hay.',
  'Facebook Sayfası': 'Página de Facebook',
  'Instagram Business · {page} sayfasına bağlı': 'Instagram Business · vinculada a {page}',
  '{date} tarihinde bağlandı': 'Conectada el {date}',
  'Kaldırılıyor…': 'Eliminando…',
  Kaldır: 'Eliminar',

  // Paylaşım biçimleri
  'PAYLAŞIM BİÇİMLERİ': 'FORMATOS DE PUBLICACIÓN',
  'Hikâye paylaşımı': 'Publicación de historia',
  'Facebook Sayfasında fotoğraf veya video gönderisi.':
    'Una publicación de foto o vídeo en tu Página de Facebook.',
  'Kapak fotoğrafı 24 saatlik hikâye olarak paylaşılır.':
    'La foto de portada se comparte como historia de 24 horas.',
  'Varlığa bağlı videolar dikey Reels olarak yayınlanır.':
    'Los vídeos vinculados al objeto se publican como Reels verticales.',

  // Paylaşım modalı
  'Bağlantılar yüklenemedi.': 'No se pudieron cargar las conexiones.',
  'Paylaşım tamamlanamadı.': 'No se pudo completar la publicación.',
  'Sosyal medyada paylaş': 'Compartir en redes sociales',
  'SOSYAL PAYLAŞIM': 'PUBLICACIÓN SOCIAL',
  'Sosyal hesaplar yükleniyor…': 'Cargando cuentas sociales…',
  'Hikâye 24 saat boyunca görünür kalacak.': 'La historia seguirá visible durante 24 horas.',
  'Paylaşımın hesabında yayında.': 'Tu publicación ya está en línea en tu cuenta.',
  'Paylaşımı aç': 'Abrir la publicación',
  'Meta bağlantısı henüz kurulmadı': 'La conexión con Meta aún no está configurada',
  'Facebook ve Instagram paylaşımı için uygulama anahtarlarını ekleyip bir sayfa bağlaman gerekiyor.':
    'Para compartir en Facebook e Instagram, añade las claves de la aplicación y conecta una página.',
  'Kuruluma git': 'Ir a la configuración',
  'Henüz bağlı hesap yok': 'Aún no hay ninguna cuenta conectada',
  'Facebook Sayfanı ve varsa ona bağlı Instagram Business hesabını bağlayarak paylaşmaya başlayabilirsin.':
    'Conecta tu Página de Facebook —y su cuenta de Instagram Business, si la tiene— para empezar a compartir.',
  'Hesap bağla': 'Conectar cuenta',
  'Sosyal hesap': 'Cuenta social',
  '{page} sayfası': 'Página {page}',
  'Paylaşım biçimi': 'Formato de publicación',
  'Kapak fotoğrafıyla hikâye': 'Historia con foto de portada',
  'Hikâye, varlığın kapak fotoğrafı kullanılarak paylaşılır.':
    'La historia se comparte usando la foto de portada del objeto.',
  'Kapak yoksa en yeni görsel kullanılır.': 'Si no hay portada, se usa la imagen más reciente.',
  Video: 'Vídeo',
  'Bu varlıkta Reels için video yok. Varlık detayından bir video ekleyebilirsin.':
    'Este objeto no tiene vídeo para Reels. Puedes añadir uno desde la página del objeto.',
  'En yeni video': 'Vídeo más reciente',
  Görsel: 'Imagen',
  Kapak: 'Portada',
  'Paylaşmak için varlığa bir görsel ekleyin.': 'Añade una imagen al objeto para poder compartirlo.',
  'Paylaşıma eşlik edecek not…': 'Una nota para acompañar la publicación…',
  'Instagram paylaşımı için medya adresinin herkese açık HTTPS olması gerekiyor. Ayarlar sayfasındaki kurulum adımlarına bak.':
    'Para compartir en Instagram, la dirección de los medios debe ser pública en HTTPS. Consulta los pasos de configuración en la página de ajustes.',
  'Instagram gönderileri fotoğraf olarak yayınlanır; videolar için Reels biçimini seç.':
    'Las publicaciones de Instagram se difunden como fotos; para vídeos, elige el formato Reels.',
  'Paylaşılıyor…': 'Compartiendo…',
  'Gönderi olarak paylaş': 'Compartir como publicación',
  'Hikâye olarak paylaş': 'Compartir como historia',
  'Reels olarak paylaş': 'Compartir como Reels',
  '{provider} gönderi olarak paylaşıldı.': 'Compartido en {provider} como publicación.',
  '{provider} hikâye olarak paylaşıldı.': 'Compartido en {provider} como historia.',
  '{provider} Reels olarak paylaşıldı.': 'Compartido en {provider} como Reels.',
  '{provider} gönderi yayınlandı': 'Publicación en línea en {provider}',
  '{provider} hikâye yayınlandı': 'Historia en línea en {provider}',
  '{provider} Reels yayınlandı': 'Reels en línea en {provider}',

  // Sayfa
  'Sosyal hesaplar': 'Cuentas sociales',
  'BAĞLANTILAR': 'CONEXIONES',
  'Varlıklarını Facebook Sayfanda ve Instagram Business hesabında gönderi, hikâye veya Reels olarak paylaş. Varlık sahipliğin ve gizlilik ayarların değişmez; yalnızca seçtiğin anı dışarı taşırsın.':
    'Comparte tus objetos como publicación, historia o Reels en tu Página de Facebook y tu cuenta de Instagram Business. La propiedad y la privacidad no cambian; solo llevas fuera el momento que elijas.',
} as const;

export default social;
