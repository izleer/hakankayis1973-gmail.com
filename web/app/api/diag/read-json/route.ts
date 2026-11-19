import { readJsonDebug } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const clone = request.clone();
  const direct = await clone.text();
  const helper = await readJsonDebug(request);
  return Response.json({
    direct: { length: direct.length, text: direct },
    helper,
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'dev',
  });
}
