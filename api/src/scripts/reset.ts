import { closePool } from '../db.js';
import { resetDatabase } from './tasks.js';

try {
  await resetDatabase();
  console.log('Veritabanı sıfırlandı.');
} catch (error) {
  console.error('Sıfırlama hatası:', error);
  process.exitCode = 1;
} finally {
  await closePool();
}
