export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const text = await request.text();
    return Response.json({
      ok: true,
      length: text.length,
      text,
      commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'dev',
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'dev',
      },
      { status: 500 },
    );
  }
}
