import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AssetReport } from '@/components/AssetReport';
import { PremiumGate } from '@/components/PremiumGate';
import { api, requireViewer } from '@/lib/api';
import { getT } from '@/lib/i18n/server';
import { isPlus } from '@/lib/plan';
import { loadAssetReport } from '@/lib/report-data';
import type { AssetDetailData } from '@/lib/types';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getT();
  const { id } = await params;
  try {
    const data = await api<AssetDetailData>(`/v1/assets/${id}`);
    return {
      title: t('{title} raporu', { title: data.asset.title }),
      description: t('{type} hafızasından yazdırılabilir varlık raporu.', {
        type: data.asset.type.label,
      }),
    };
  } catch {
    return { title: t('Varlık raporu') };
  }
}

export default async function AssetReportPage({ params }: { params: Params }) {
  const viewer = await requireViewer();
  if (!isPlus(viewer)) {
    const t = await getT();
    return (
      <PremiumGate
        title={t('Varlık raporu Plus’ta açılır')}
        body={t(
          'Bu varlığın künyesi, ölçümleri ve tüm hikâyesi yazdırılabilir raporda. Raporlar Plus planda kullanılabilir.',
        )}
      />
    );
  }
  const { id } = await params;
  const report = await loadAssetReport(id);
  if (!report) notFound();

  return (
    <AssetReport
      asset={report.data.asset}
      access={report.data.access}
      entries={report.items}
      entriesTruncated={report.truncated}
      measurements={report.measurements}
      attributeLabels={report.attributeLabels}
    />
  );
}
