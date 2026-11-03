import type { Metadata, Viewport } from 'next';
import './globals.css';
import './groups.css';
import './social.css';

export const metadata: Metadata = {
  title: {
    default: 'izleer — yaşayan ve dönüşen her şeyin izi',
    template: '%s · izleer',
  },
  description:
    'Bonsai, evcil hayvan, sanat eseri, ev ya da bir çiçek… Sahip olduğunuz her şeyin bakımını, fotoğraflarını ve hikâyesini tek bir hafızada saklayın.',
  applicationName: 'izleer',
  authors: [{ name: 'izleer' }],
  openGraph: {
    title: 'izleer',
    description: 'Yaşayan ve dönüşen her şeyin izi.',
    type: 'website',
    locale: 'tr_TR',
  },
};

export const viewport: Viewport = {
  themeColor: '#1d2822',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
