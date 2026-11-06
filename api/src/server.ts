import { buildApp } from './app.js';
import { env } from './env.js';
import { closePool, databaseSsl, databaseTarget } from './db.js';
import { describeDatabaseTarget } from './lib/db-config.js';

const app = await buildApp();

try {
  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(`API http://localhost:${env.PORT} adresinde çalışıyor.`);
  app.log.info(
    `Veritabanı hedefi: ${describeDatabaseTarget(databaseTarget)} · SSL: ${databaseSsl ? 'açık' : 'kapalı'}`,
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} alındı, kapatılıyor.`);
    await app.close();
    await closePool();
    process.exit(0);
  });
}
