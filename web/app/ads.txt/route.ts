import { adsensePublisherId } from '@/lib/ads';

export const dynamic = 'force-dynamic';

/**
 * AdSense doğrulaması için yayıncı satırını sunar. Yayıncı kimliği tanımlı
 * değilse 404 döner; böylece sahte bir ads.txt yayınlanmaz.
 */
export function GET() {
  const publisher = adsensePublisherId();
  if (!publisher) {
    return new Response('ads.txt is not configured\n', { status: 404 });
  }
  return new Response(`google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
