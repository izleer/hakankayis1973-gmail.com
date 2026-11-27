import * as Sharing from 'expo-sharing';
import { updateExportJob } from '../db/repo';
import type { ExportJob } from '../types';

function mimeFor(job: ExportJob): { mimeType: string; UTI: string } {
  if (job.exportType === 'report') {
    if (job.fileName?.endsWith('.csv')) {
      return { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' };
    }
    if (job.fileName?.endsWith('.xlsx')) {
      return {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      };
    }
    return { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' };
  }
  if (job.exportType === 'backup') {
    return { mimeType: 'application/zip', UTI: 'public.zip-archive' };
  }
  return { mimeType: 'application/zip', UTI: 'public.zip-archive' };
}

/**
 * Dosyayı işletim sisteminin paylaşım ekranına verir.
 * Başarı, hedef cihaza kaydedildiği anlamına gelmez; yalnızca paylaşım
 * ekranına teslim edildiğini gösterir.
 */
export async function shareJobFile(job: ExportJob): Promise<void> {
  if (!job.filePath) throw new Error('Paylaşılacak dosya bulunamadı.');
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Bu cihazda paylaşım ekranı kullanılamıyor. Dosya, uygulamanın dışa aktarım klasöründe duruyor.');
  }
  const { mimeType, UTI } = mimeFor(job);
  await Sharing.shareAsync(job.filePath, {
    mimeType,
    UTI,
    dialogTitle: 'izleer aktarımı',
  });
  await updateExportJob(job.id, { status: 'SHARED' });
}
