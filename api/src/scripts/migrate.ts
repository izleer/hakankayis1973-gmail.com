import { closePool } from '../db.js';
import { runMigrations } from './tasks.js';

try {
  await runMigrations();
  console.log('Migration tamamlandı.');
} catch (error) {
  console.error('Migration hatası:', error);
  process.exitCode = 1;
} finally {
  await closePool();
}
