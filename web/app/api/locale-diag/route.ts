import { readJson } from '@/lib/api';
import { isLocale } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await readJson<{ locale?: unknown }>(request);
  return Response.json({
    locale: body?.locale ?? null,
    valid: isLocale(body?.locale),
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'dev',
  });
}
