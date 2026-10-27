import { AppShell } from '@/components/AppShell';
import { requireViewer } from '@/lib/api';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireViewer();
  return <AppShell user={user}>{children}</AppShell>;
}
