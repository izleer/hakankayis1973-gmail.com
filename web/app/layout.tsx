import type { Metadata, Viewport } from 'next';
import './globals.css';
import './groups.css';
import './social.css';
import './report.css';
import { I18nProvider } from '@/lib/i18n/client';
import { getLocale } from '@/lib/i18n/server';
import { localeTags } from '@/lib/i18n/config';
import { makeT } from '@/lib/i18n/translate';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = makeT(locale);

  return {
    title: {
      default: t('izleer — yaşayan ve dönüşen her şeyin izi'),
      template: '%s · izleer',
    },
    description: t(
      'Bonsai, evcil hayvan, sanat eseri, ev ya da bir çiçek… Sahip olduğunuz her şeyin bakımını, fotoğraflarını ve hikâyesini tek bir hafızada saklayın.',
    ),
    applicationName: 'izleer',
    authors: [{ name: 'izleer' }],
    openGraph: {
      title: 'izleer',
      description: t('Yaşayan ve dönüşen her şeyin izi.'),
      type: 'website',
      locale: localeTags[locale].replace('-', '_'),
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#1d2822',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={localeTags[locale]}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
