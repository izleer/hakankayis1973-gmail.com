import * as Crypto from 'expo-crypto';

export function newId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    const rnd = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
    return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
