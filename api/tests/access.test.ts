import { describe, expect, it } from 'vitest';
import { stricterVisibility, visibilityRank } from '../src/lib/access.js';
import { hashPassword, passwordIssues, verifyPassword } from '../src/lib/password.js';

describe('görünürlük kuralları', () => {
  it('özel < seçili < arkadaşlar < herkese açık sırasını korur', () => {
    expect(visibilityRank('private')).toBeLessThan(visibilityRank('selected'));
    expect(visibilityRank('selected')).toBeLessThan(visibilityRank('friends'));
    expect(visibilityRank('friends')).toBeLessThan(visibilityRank('public'));
    expect(stricterVisibility('public', 'selected')).toBe('selected');
    expect(stricterVisibility('private', 'public')).toBe('private');
    expect(stricterVisibility('friends', 'selected')).toBe('selected');
    expect(stricterVisibility('public', 'friends')).toBe('friends');
  });
});

describe('şifreler', () => {
  it('scrypt hash doğrulanır ve yanlış şifre reddedilir', async () => {
    const hash = await hashPassword('GucluSifre123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('GucluSifre123', hash)).toBe(true);
    expect(await verifyPassword('YanlisSifre123', hash)).toBe(false);
  });

  it('zayıf şifreleri reddeder', () => {
    expect(passwordIssues('abc')).not.toHaveLength(0);
    expect(passwordIssues('GucluSifre123')).toHaveLength(0);
  });
});
