import { buildApp } from './app.js';
import { env } from './env.js';
import { closePool, databaseSsl, databaseTarget } from './db.js';
import { describeDatabaseTarget } from './lib/db-config.js';
import { processDueReminders } from './lib/reminders.js';

// Zamanı gelen hatırlatmalar için hafif bir aralık. Ücretsiz dağıtımda servis
// uykuya geçebildiği için istemciler /v1/reminders ve gelen kutusu isteklerinde
// aynı işleyişi tetikler.
const REMINDER_TICK_MS = 60_000;

const app = await buildApp();

let reminderTimer: ReturnType<typeof setInterval> | null = null;

async function runReminderTick(): Promise<void> {
  try {
    const count = await processDueReminders();
    if (count > 0) app.log.info(`${count} hatırlatma bildirime dönüştürüldü.`);
  } catch (error) {
    app.log.error({ err: error }, 'Hatırlatma işleyicisi başarısız oldu');
  }
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(`API http://localhost:${env.PORT} adresinde çalışıyor.`);
  app.log.info(
    `Veritabanı hedefi: ${describeDatabaseTarget(databaseTarget)} · SSL: ${databaseSsl ? 'açık' : 'kapalı'}`,
  );
  void runReminderTick();
  reminderTimer = setInterval(runReminderTick, REMINDER_TICK_MS);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} alındı, kapatılıyor.`);
    if (reminderTimer) clearInterval(reminderTimer);
    await app.close();
    await closePool();
    process.exit(0);
  });
}
