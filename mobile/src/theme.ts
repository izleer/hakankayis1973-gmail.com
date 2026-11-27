/**
 * izleer mobil tasarım dili.
 * Renkler mevcut web ürünüyle aynı aileden: krem zemin, koyu yeşil metin,
 * altın vurgu. Yeni bileşenler bu sabitleri kullanmalı.
 */
export const theme = {
  colors: {
    paper: '#FBF8F1',
    surface: '#FFFFFF',
    surfaceMuted: '#F4EFE4',
    ink: '#1D2822',
    inkSoft: '#4A564E',
    muted: '#6B776F',
    line: '#E1DACB',
    lineStrong: '#CDC4B1',
    gold: '#A9854F',
    goldSoft: '#F0E4CE',
    green: '#2C5844',
    greenSoft: '#E5EEE8',
    danger: '#A23B32',
    dangerSoft: '#F7E5E2',
    warning: '#8A6216',
    warningSoft: '#F7EED7',
    info: '#2B5470',
    infoSoft: '#E4EEF5',
    white: '#FFFFFF',
    overlay: 'rgba(20, 28, 23, 0.55)',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    pill: 999,
  },
  font: {
    serif: 'Georgia',
    body: undefined as string | undefined,
  },
  shadow: {
    card: {
      shadowColor: '#1D2822',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  },
} as const;

export const entryTypeMeta: Record<
  string,
  { label: string; short: string; tone: keyof typeof theme.colors }
> = {
  note: { label: 'Not', short: 'NT', tone: 'info' },
  photo: { label: 'Fotoğraf', short: 'FJ', tone: 'gold' },
  maintenance: { label: 'Bakım', short: 'BK', tone: 'green' },
  acquisition: { label: 'Edinme', short: 'ED', tone: 'gold' },
  measurement: { label: 'Ölçüm', short: 'OL', tone: 'info' },
  health: { label: 'Sağlık', short: 'SG', tone: 'danger' },
  event: { label: 'Dönüm noktası', short: 'DN', tone: 'warning' },
  document: { label: 'Belge', short: 'BL', tone: 'muted' },
  reminder: { label: 'Hatırlatma', short: 'HT', tone: 'warning' },
};

export const visibilityMeta: Record<
  string,
  { label: string; description: string }
> = {
  private: { label: 'Yalnızca ben', description: 'Bu cihazdaki arşivinde kalır.' },
  selected: { label: 'Seçili kişiler', description: 'Paylaşım özelliği sonraki sürümde.' },
  friends: { label: 'Arkadaşlar', description: 'Paylaşım özelliği sonraki sürümde.' },
  public: { label: 'Herkese açık', description: 'Paylaşım özelliği sonraki sürümde.' },
};

export const exportStatusMeta: Record<
  string,
  { label: string; tone: 'muted' | 'green' | 'gold' | 'danger' | 'info' | 'warning' }
> = {
  PENDING: { label: 'Sırada', tone: 'muted' },
  PREPARING: { label: 'Hazırlanıyor', tone: 'info' },
  PROCESSING: { label: 'İşleniyor', tone: 'info' },
  READY: { label: 'Hazır', tone: 'green' },
  SHARED: { label: 'Paylaşım ekranına verildi', tone: 'gold' },
  FAILED: { label: 'Başarısız', tone: 'danger' },
  CANCELLED: { label: 'İptal edildi', tone: 'muted' },
};

export const exportTypeMeta: Record<string, { label: string; hint: string }> = {
  report: { label: 'Rapor', hint: 'PDF, CSV veya Excel' },
  photos: { label: 'Fotoğraf arşivi', hint: 'Klasörlü ZIP' },
  backup: { label: 'Tam yedek', hint: '.izleer arşivi' },
};
