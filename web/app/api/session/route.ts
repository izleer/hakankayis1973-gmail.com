import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/api';

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: { message: 'Oturum bulunamadı.' } }, { status: 401 });
  }
  return NextResponse.json({ data: { user: viewer } });
}
