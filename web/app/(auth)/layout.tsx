import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/api';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer) redirect('/');
  return <>{children}</>;
}
