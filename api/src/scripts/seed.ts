import { closePool } from '../db.js';
import { runSeed } from './tasks.js';

try {
  await runSeed();
} catch (error) {
  console.error('Seed hatası:', error);
  process.exitCode = 1;
} finally {
  await closePool();
}
